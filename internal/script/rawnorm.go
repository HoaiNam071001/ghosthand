package script

import (
	"encoding/json"
	"slices"
	"strings"

	"ghosthand/internal/model"
)

// Cách viết AI hay dùng ở dạng gọn (57 A2 / A3) – chuẩn hoá trên JSON thô trước khi đọc vào model.Step, nên file lưu
// vẫn một cách viết: winOp "focus" = trống; keys là chuỗi "cmd+shift+t" → modifiers + keys.

var keyMods = []string{"cmd", "ctrl", "alt", "shift"}

const winOpFocusAlias = "focus"

// normalizeRaw trả raw đã chuẩn hoá; không phải object / không có gì cần đổi thì trả nguyên.
func normalizeRaw(raw json.RawMessage) (json.RawMessage, error) {
	var m map[string]json.RawMessage
	if json.Unmarshal(raw, &m) != nil {
		return raw, nil
	}
	changed := false
	var op string
	if json.Unmarshal(m["winOp"], &op) == nil && op == winOpFocusAlias {
		m["winOp"], changed = json.RawMessage(`"`+model.WinFocus+`"`), true
	}
	var combo string
	if json.Unmarshal(m["keys"], &combo) == nil {
		var mods []string
		if v, ok := m["modifiers"]; ok {
			if err := json.Unmarshal(v, &mods); err != nil {
				return nil, err
			}
		}
		keys, more := splitCombo(combo)
		for _, k := range more {
			if !slices.Contains(mods, k) {
				mods = append(mods, k)
			}
		}
		if err := setRaw(m, "keys", keys); err != nil {
			return nil, err
		}
		if err := setRaw(m, "modifiers", mods); err != nil {
			return nil, err
		}
		changed = true
	}
	if !changed {
		return raw, nil
	}
	return json.Marshal(m)
}

// splitCombo tách "cmd+shift+t" / "enter" thành phím chính + phím kèm (cmd | ctrl | alt | shift; "command" / "control"
// / "option" cũng nhận). Phím "+" viết là "plus" như tên robotgo.
func splitCombo(combo string) (keys, mods []string) {
	keys, mods = []string{}, []string{}
	for _, p := range strings.Split(combo, "+") {
		p = strings.ToLower(strings.TrimSpace(p))
		switch p {
		case "":
			continue
		case "command", "meta":
			p = "cmd"
		case "control":
			p = "ctrl"
		case "option":
			p = "alt"
		}
		if slices.Contains(keyMods, p) {
			mods = append(mods, p)
		} else {
			keys = append(keys, p)
		}
	}
	return keys, mods
}

func setRaw(m map[string]json.RawMessage, k string, v any) error {
	b, err := json.Marshal(v)
	m[k] = b
	return err
}
