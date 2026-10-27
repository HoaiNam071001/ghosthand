package script

import (
	"bytes"
	"encoding/json"
	"slices"

	"ghosthand/internal/model"
)

// Shrunk – kịch bản đủ trường thu về dạng gọn cho AI đọc (MCP read_script): node chỉ còn trường khác mặc định của
// loại, cạnh thành dòng flow, bỏ vị trí thẻ. Expand(Shrunk) dựng lại đúng kịch bản (trừ pos, id cạnh) – test
// shrink_test.go chạy trên mọi Mẫu thử.
type Shrunk struct {
	Name       string              `json:"name"`
	Loops      *int                `json:"loops,omitempty"` // nil = 1 như kịch bản mới
	MaxMinutes int                 `json:"maxMinutes,omitempty"`
	Region     *model.Rect         `json:"region,omitempty"`
	AnchorMode string              `json:"anchorMode,omitempty"`
	Human      *string             `json:"human,omitempty"` // nil = như kịch bản mới
	KeepAwake  bool                `json:"keepAwake,omitempty"`
	Inputs     []model.ScriptInput `json:"inputs,omitempty"`
	Start      string              `json:"start,omitempty"` // trống = node đầu của steps
	Steps      []json.RawMessage   `json:"steps"`
	Flow       []string            `json:"flow,omitempty"`
	Groups     []model.Group       `json:"groups,omitempty"`
}

// Shrink – sc phải đã qua Checked (id / ref hợp lệ). Node xếp theo FlowOrder để đọc từ trên xuống như chạy.
func Shrink(sc model.Script) (Shrunk, error) {
	def := model.NewScript()
	out := Shrunk{Name: sc.Name, MaxMinutes: sc.MaxMinutes, Region: sc.Region, AnchorMode: sc.AnchorMode,
		KeepAwake: sc.KeepAwake, Inputs: sc.Inputs, Groups: sc.Groups, Flow: FlowText(sc), Steps: []json.RawMessage{}}
	if sc.Loops != def.Loops {
		out.Loops = &sc.Loops
	}
	if sc.Human != def.Human {
		out.Human = &sc.Human
	}
	byID := make(map[string]model.Step, len(sc.Steps))
	for _, s := range sc.Steps {
		byID[s.ID] = s
	}
	order := model.FlowOrder(sc)
	for _, id := range order {
		raw, err := shrinkStep(byID[id])
		if err != nil {
			return Shrunk{}, err
		}
		out.Steps = append(out.Steps, raw)
	}
	if sc.Start != "" && (len(order) == 0 || order[0] != sc.Start) {
		out.Start = byID[sc.Start].Ref
	}
	return out, nil
}

// shrinkStep – {id, ref, type, …trường khác mặc định NewStep theo khoá}. Trường omitempty mà mặc định khác 0 (vd
// enabled: false) thì ghi giá trị 0 tường minh để Expand không lấy lại mặc định.
func shrinkStep(s model.Step) (json.RawMessage, error) {
	d, err := model.NewStep(s.Type)
	if err != nil {
		return nil, err
	}
	have, err := jsonFields(s)
	if err != nil {
		return nil, err
	}
	base, err := jsonFields(d)
	if err != nil {
		return nil, err
	}
	keep := map[string]json.RawMessage{}
	for k, v := range have {
		if !bytes.Equal(v, base[k]) {
			keep[k] = v
		}
	}
	for k, v := range base {
		if _, ok := have[k]; !ok {
			keep[k] = zeroJSON(v)
		}
	}
	for _, k := range []string{"id", "ref", "type", "pos"} {
		delete(keep, k)
	}
	var b bytes.Buffer
	head, _ := MarshalRaw(map[string]string{"id": s.ID, "ref": s.Ref, "type": s.Type})
	b.Write(head[:len(head)-1]) // giữ id, ref, type đầu dòng cho dễ đọc
	keys := make([]string, 0, len(keep))
	for k := range keep {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	for _, k := range keys {
		kb, _ := json.Marshal(k)
		b.WriteByte(',')
		b.Write(kb)
		b.WriteByte(':')
		b.Write(keep[k])
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

func jsonFields(v any) (map[string]json.RawMessage, error) {
	b, err := MarshalRaw(v)
	if err != nil {
		return nil, err
	}
	var m map[string]json.RawMessage
	return m, json.Unmarshal(b, &m)
}

// MarshalRaw – json.Marshal không đổi < > & thành \u003c… (selector "a > b", flow "n1>n2" – AI đọc, tốn token).
func MarshalRaw(v any) ([]byte, error) {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(b.Bytes(), []byte("\n")), nil
}

// zeroJSON – giá trị 0 cùng kiểu với v (mảng / object / con trỏ → null).
func zeroJSON(v json.RawMessage) json.RawMessage {
	switch {
	case len(v) == 0:
		return json.RawMessage("null")
	case v[0] == '"':
		return json.RawMessage(`""`)
	case v[0] == 't' || v[0] == 'f':
		return json.RawMessage("false")
	case v[0] == '-' || v[0] >= '0' && v[0] <= '9':
		return json.RawMessage("0")
	}
	return json.RawMessage("null")
}
