package script

import (
	"encoding/json"
	"fmt"
	"slices"

	"ghosthand/internal/model"
)

// Patch – sửa một phần kịch bản (AI qua MCP update_script, bước 31): không gửi lại cả file. Node / cạnh trỏ theo id
// hoặc ref (n2). Trường nil / rỗng = giữ nguyên.
type Patch struct {
	Name        *string             `json:"name,omitempty"`
	Loops       *int                `json:"loops,omitempty"`
	Human       *string             `json:"human,omitempty"`
	Start       string              `json:"start,omitempty"`
	Inputs      []model.ScriptInput `json:"inputs,omitempty"`      // thay cả danh sách input
	Steps       []json.RawMessage   `json:"steps,omitempty"`       // node có id / ref đã có → đè các trường gửi lên; chưa có → thêm (mặc định theo loại)
	RemoveSteps []string            `json:"removeSteps,omitempty"` // xoá node + mọi cạnh nối vào / ra
	Edges       []model.Edge        `json:"edges,omitempty"`       // thêm cạnh; cổng from + port đã có cạnh thì thay
	RemoveEdges []string            `json:"removeEdges,omitempty"` // id cạnh
}

// ApplyPatch trả bản sao kịch bản đã sửa (chưa kiểm tra – gọi Checked sau) và các cạnh bị bỏ vì node đổi loại không còn
// cổng đó (patchtype.go).
func ApplyPatch(sc model.Script, p Patch) (model.Script, []model.Edge, error) {
	sc.Steps = slices.Clone(sc.Steps)
	sc.Edges = slices.Clone(sc.Edges)
	if p.Name != nil {
		sc.Name = *p.Name
	}
	if p.Loops != nil {
		sc.Loops = *p.Loops
	}
	if p.Human != nil {
		sc.Human = *p.Human
	}
	if p.Inputs != nil {
		sc.Inputs = p.Inputs
	}
	var dropped []model.Edge
	for i, raw := range p.Steps {
		d, err := upsertStep(&sc, raw)
		dropped = append(dropped, d...)
		if err != nil {
			return model.Script{}, nil, &model.ScriptError{Field: "steps", Msg: fmt.Sprintf("steps[%d]: %v", i, err)}
		}
	}
	for _, ref := range p.RemoveSteps {
		if err := removeStep(&sc, ref); err != nil {
			return model.Script{}, nil, err
		}
	}
	for _, id := range p.RemoveEdges {
		n := len(sc.Edges)
		sc.Edges = slices.DeleteFunc(sc.Edges, func(e model.Edge) bool { return e.ID == id })
		if len(sc.Edges) == n {
			return model.Script{}, nil, &model.ScriptError{Field: "edges", Edge: id, Msg: fmt.Sprintf("không có cạnh %q", id)}
		}
	}
	for _, e := range p.Edges {
		e.From, e.To = NodeID(sc.Steps, e.From), NodeID(sc.Steps, e.To)
		sc.Edges = slices.DeleteFunc(sc.Edges, func(o model.Edge) bool { return o.From == e.From && o.Port == e.Port })
		if e.ID == "" || slices.ContainsFunc(sc.Edges, func(o model.Edge) bool { return o.ID == e.ID }) {
			e.ID = freeID(len(sc.Edges)+1, "e", func(id string) bool {
				return slices.ContainsFunc(sc.Edges, func(o model.Edge) bool { return o.ID == id })
			})
		}
		sc.Edges = append(sc.Edges, e)
	}
	if p.Start != "" {
		sc.Start = p.Start
	}
	RefsToIDs(&sc)
	return sc, dropped, nil
}

// upsertStep: id / ref trùng node đã có → đè từng trường có trong raw (trường gửi lên thay cả giá trị, kể cả mảng /
// object lồng); không có → node mới. Gửi type khác loại cũ → dựng lại node theo loại mới (retypeStep), trả cạnh bị bỏ.
func upsertStep(sc *model.Script, raw json.RawMessage) ([]model.Edge, error) {
	var key struct{ ID, Ref, Type string }
	if err := json.Unmarshal(raw, &key); err != nil {
		return nil, err
	}
	at := -1
	if key.ID != "" || key.Ref != "" {
		at = slices.IndexFunc(sc.Steps, func(s model.Step) bool {
			return key.ID != "" && s.ID == key.ID || key.ID == "" && s.Ref == key.Ref
		})
	}
	if at < 0 {
		id := key.ID
		if id == "" {
			id = freeID(len(sc.Steps)+1, "s", func(id string) bool { return stepIndex(sc.Steps, id) >= 0 })
		}
		st, err := ExpandStep(raw, id, "") // ref trống → Checked đặt số nhỏ nhất chưa dùng
		if err != nil {
			return nil, err
		}
		sc.Steps = append(sc.Steps, st)
		return nil, nil
	}
	if key.Type != "" && key.Type != sc.Steps[at].Type {
		st, err := retypeStep(sc.Steps[at], raw, key.Type)
		if err != nil {
			return nil, err
		}
		sc.Steps[at] = st
		return dropBadPorts(sc, st), nil
	}
	merged, err := mergeJSON(sc.Steps[at], raw)
	if err != nil {
		return nil, err
	}
	var st model.Step
	if err := json.Unmarshal(merged, &st); err != nil {
		return nil, err
	}
	st.ID = sc.Steps[at].ID // id ổn định – cạnh trỏ theo id
	sc.Steps[at] = st
	return nil, nil
}

func mergeJSON(base any, raw json.RawMessage) ([]byte, error) {
	b, err := json.Marshal(base)
	if err != nil {
		return nil, err
	}
	var m, patch map[string]json.RawMessage
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &patch); err != nil {
		return nil, err
	}
	for k, v := range patch {
		m[k] = v
	}
	return json.Marshal(m)
}

func removeStep(sc *model.Script, idOrRef string) error {
	id := NodeID(sc.Steps, idOrRef)
	at := stepIndex(sc.Steps, id)
	if at < 0 {
		return &model.ScriptError{Field: "removeSteps", Msg: fmt.Sprintf("không có node %q", idOrRef)}
	}
	sc.Steps = slices.Delete(sc.Steps, at, at+1)
	sc.Edges = slices.DeleteFunc(sc.Edges, func(e model.Edge) bool { return e.From == id || e.To == id })
	sc.Groups = DropMember(sc.Groups, id)
	if sc.Start == id {
		sc.Start = ""
	}
	return nil
}

func stepIndex(steps []model.Step, id string) int {
	return slices.IndexFunc(steps, func(s model.Step) bool { return s.ID == id })
}

// freeID – prefix + số, bắt đầu từ n, chưa dùng.
func freeID(n int, prefix string, used func(string) bool) string {
	for ; ; n++ {
		if id := fmt.Sprintf("%s%d", prefix, n); !used(id) {
			return id
		}
	}
}
