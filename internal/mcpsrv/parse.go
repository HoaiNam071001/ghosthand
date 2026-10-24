package mcpsrv

import (
	"encoding/json"
	"fmt"
	"slices"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

// parseScript – kịch bản AI gửi (object, hoặc chuỗi JSON với client chỉ gửi được chuỗi) → kịch bản đủ trường, đã kiểm
// tra cấu trúc như lúc mở file.
func (s *Server) parseScript(v any) (model.Script, error) {
	raw, err := jsonRaw(v)
	if err != nil {
		return model.Script{}, err
	}
	var c script.Compact
	if err := json.Unmarshal(raw, &c); err != nil {
		return model.Script{}, fmt.Errorf("script không đúng dạng: %w", err)
	}
	if len(c.Steps) == 0 {
		return model.Script{}, &model.ScriptError{Field: "steps", Msg: "kịch bản chưa có node nào"}
	}
	if c.Name == "" {
		c.Name = "Kịch bản AI"
	}
	sc, err := script.Expand(c)
	if err == nil {
		err = s.resolveTemplates(&sc)
	}
	if err != nil {
		return model.Script{}, err
	}
	return checked(sc)
}

func jsonRaw(v any) (json.RawMessage, error) {
	if s, ok := v.(string); ok {
		if !json.Valid([]byte(s)) {
			return nil, fmt.Errorf("chuỗi không phải JSON")
		}
		return json.RawMessage(s), nil
	}
	return json.Marshal(v)
}

// checked – script.Checked nhưng cạnh hỏng là lỗi (lúc mở file thì lặng lẽ bỏ, AI phải biết để sửa).
func checked(sc model.Script) (model.Script, error) {
	out, err := script.Checked(sc)
	if err != nil {
		return out, err
	}
	for _, e := range sc.Edges {
		if !slices.Contains(out.Edges, e) {
			return out, &model.ScriptError{Field: "edges", Edge: e.ID,
				Msg: fmt.Sprintf("cạnh %s → %s (cổng %q) không hợp lệ: node không có, trùng cổng hoặc nối vào chính nó", e.From, e.To, e.Port)}
		}
	}
	if sc.Start != "" && out.Start == "" {
		return out, &model.ScriptError{Field: "start", Msg: fmt.Sprintf("start trỏ node không có %q", sc.Start)}
	}
	return out, nil
}

// runnable – kịch bản chạy được chưa (như lúc bấm Chạy): input bắt buộc chưa có mặc định coi như đã nhập.
func (s *Server) runnable(sc model.Script) error {
	values := map[string]any{}
	for _, in := range sc.Inputs {
		if in.Required && script.IsEmptyValue(in.Default) {
			values[in.Key] = sampleValue(in)
		}
	}
	resolved, err := script.ResolveInputs(sc, values)
	if err != nil {
		return err
	}
	var screen model.Rect
	for _, d := range s.back.Displays() {
		if d.Main {
			screen = d.Rect
		}
	}
	return script.ValidateScript(resolved, screen)
}

// sampleValue – giá trị hợp lệ bất kỳ của input (chỉ để kiểm tra).
func sampleValue(in model.ScriptInput) any {
	switch in.Type {
	case model.InputNumber, model.InputMs:
		if in.Min != nil {
			return *in.Min
		}
		return 1
	case model.InputBool:
		return true
	case model.InputSelect:
		if len(in.Options) > 0 {
			return in.Options[0]
		}
	}
	return "x"
}
