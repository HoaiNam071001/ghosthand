package script

import (
	"encoding/json"
	"fmt"
	"slices"

	"ghosthand/internal/model"
)

// Compact – kịch bản dạng gọn (Mẫu thử – bước 33, AI qua MCP – 31): node chỉ ghi trường cần, còn lại lấy mặc định của
// model.NewStep; không có edges thì nối các node theo thứ tự bằng cổng success; cạnh / start trỏ id hoặc ref (n2).
type Compact struct {
	Name       string              `json:"name"`
	Loops      int                 `json:"loops"`
	MaxMinutes int                 `json:"maxMinutes"`
	Region     *model.Rect         `json:"region"`
	Start      string              `json:"start"`
	Steps      []json.RawMessage   `json:"steps"`
	Edges      []model.Edge        `json:"edges"`
	Inputs     []model.ScriptInput `json:"inputs"`
	AnchorMode string              `json:"anchorMode"`
	Human      *string             `json:"human"`  // nil = mặc định của kịch bản mới
	Groups     []model.Group       `json:"groups"` // khung nhóm node; members ghi id hoặc ref
}

// Expand dựng kịch bản đủ trường từ dạng gọn (chưa qua DecodeScript – gọi Checked để kiểm tra như lúc mở file).
func Expand(c Compact) (model.Script, error) {
	sc := model.NewScript()
	if c.Name != "" {
		sc.Name = c.Name
	}
	if c.Loops > 0 {
		sc.Loops = c.Loops
	}
	if c.Human != nil {
		sc.Human = *c.Human
	}
	sc.MaxMinutes, sc.Region, sc.Inputs, sc.AnchorMode, sc.Groups = c.MaxMinutes, c.Region, c.Inputs, c.AnchorMode, c.Groups
	for i, raw := range c.Steps {
		st, err := ExpandStep(raw, fmt.Sprintf("s%d", i+1), fmt.Sprintf("n%d", i+1))
		if err != nil {
			return model.Script{}, &model.ScriptError{Step: i + 1, Field: "steps", Msg: err.Error()}
		}
		sc.Steps = append(sc.Steps, st)
	}
	sc.Edges = append([]model.Edge{}, c.Edges...)
	if len(sc.Edges) == 0 {
		for i := 1; i < len(sc.Steps); i++ {
			sc.Edges = append(sc.Edges, model.Edge{From: sc.Steps[i-1].ID, Port: model.PortSuccess, To: sc.Steps[i].ID})
		}
	}
	used := map[string]bool{}
	for _, e := range sc.Edges {
		used[e.ID] = true
	}
	for i := range sc.Edges {
		if sc.Edges[i].ID == "" { // không trùng id cạnh khác đã ghi sẵn
			sc.Edges[i].ID = freeID(i+1, "e", func(id string) bool { return used[id] })
			used[sc.Edges[i].ID] = true
		}
	}
	sc.Start = c.Start
	if sc.Start == "" && len(sc.Steps) > 0 {
		sc.Start = sc.Steps[0].ID
	}
	RefsToIDs(&sc)
	return sc, nil
}

// RefsToIDs – chỗ trỏ tới node (cạnh, start, imageFrom, đích của input) ghi bằng ref (n2) → id.
func RefsToIDs(sc *model.Script) {
	for i := range sc.Edges {
		e := &sc.Edges[i]
		e.From, e.To = NodeID(sc.Steps, e.From), NodeID(sc.Steps, e.To)
	}
	sc.Start = NodeID(sc.Steps, sc.Start)
	for i := range sc.Groups {
		g := &sc.Groups[i]
		g.Members = slices.Clone(g.Members)
		for j, m := range g.Members {
			g.Members[j] = NodeID(sc.Steps, m)
		}
	}
	for i := range sc.Steps {
		if s := &sc.Steps[i]; s.ImageFrom != "" {
			s.ImageFrom = NodeID(sc.Steps, s.ImageFrom)
		}
	}
	for i := range sc.Inputs {
		for j := range sc.Inputs[i].Targets {
			t := &sc.Inputs[i].Targets[j]
			t.StepID = NodeID(sc.Steps, t.StepID)
		}
	}
}

// ExpandStep: mặc định theo loại (NewStep) rồi đè trường có trong raw; thiếu id / ref thì dùng id / ref truyền vào.
func ExpandStep(raw json.RawMessage, id, ref string) (model.Step, error) {
	var head struct{ Type string }
	if err := json.Unmarshal(raw, &head); err != nil {
		return model.Step{}, err
	}
	st, err := model.NewStep(head.Type)
	if err != nil {
		return model.Step{}, err
	}
	st.ID, st.Ref = "", ""
	if err := json.Unmarshal(raw, &st); err != nil {
		return model.Step{}, err
	}
	if st.ID == "" {
		st.ID = id
	}
	if st.Ref == "" {
		st.Ref = ref
	}
	return st, nil
}

// NodeID – id của node theo id hoặc ref (n2); không có node nào khớp thì trả nguyên (lỗi báo ở bước kiểm tra cạnh).
func NodeID(steps []model.Step, idOrRef string) string {
	for _, s := range steps {
		if s.ID == idOrRef {
			return s.ID
		}
	}
	for _, s := range steps {
		if s.Ref != "" && s.Ref == idOrRef {
			return s.ID
		}
	}
	return idOrRef
}

// Checked cho kịch bản qua đúng đường mở file (EncodeScript → DecodeScript): cùng kiểm tra cấu trúc, sửa ref / id cạnh.
func Checked(sc model.Script) (model.Script, error) {
	b, err := EncodeScript(sc)
	if err != nil {
		return model.Script{}, err
	}
	return DecodeScript(b)
}
