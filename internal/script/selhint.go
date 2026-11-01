package script

import (
	"fmt"

	"ghosthand/internal/model"
)

// SelectorHint – cảnh báo không chặn: selector có giá trị hay đổi ("Messenger, 1 unread") sẽ gãy khi số đổi.
// Fix = dạng chứa phần cố định (model.StableSelector) – AI / người dùng thay vào là xong.
type SelectorHint struct {
	StepID   string `json:"stepId"`
	Ref      string `json:"ref,omitempty"`
	Field    string `json:"field"` // selectors[1], cond.selectors[0], cases[2].cond.conds[0].selectors[0]
	Selector string `json:"selector"`
	Fix      string `json:"fix"`
}

// SelectorHints – mọi selector có phần hay đổi trong kịch bản (node, điều kiện Nếu, case Switch theo màn hình).
func SelectorHints(sc model.Script) []SelectorHint {
	var out []SelectorHint
	for _, s := range sc.Steps {
		add := func(field string, lines []string) {
			for j, line := range lines {
				if fix, ok := model.StableSelector(line); ok {
					out = append(out, SelectorHint{s.ID, s.Ref, fmt.Sprintf("%s[%d]", field, j), line, fix})
				}
			}
		}
		add("selectors", s.Selectors)
		if s.Cond != nil {
			condHints("cond", *s.Cond, add)
		}
		for k, c := range s.Cases {
			if c.Cond != nil {
				condHints(fmt.Sprintf("cases[%d].cond", k), *c.Cond, add)
			}
		}
	}
	return out
}

func condHints(field string, c model.Cond, add func(string, []string)) {
	add(field+".selectors", c.Selectors)
	for k, sub := range c.Conds {
		condHints(fmt.Sprintf("%s.conds[%d]", field, k), sub, add)
	}
}
