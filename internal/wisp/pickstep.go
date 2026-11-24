package wisp

import (
	"strings"

	"ghosthand/internal/model"
)

// PickStep đổi sự kiện chọn thành node web (mặc định như model.NewStep). warn = selector chưa chắc chắn
// (không khớp đúng 1 phần tử) – vẫn thêm, UI báo để người dùng kiểm. ok = false: action lạ hoặc không có selector.
func PickStep(ev PickEvent) (st model.Step, warn bool, ok bool) {
	var typ string
	switch ev.Action {
	case "click":
		typ = model.StepWebClick
	case "type":
		typ = model.StepWebType
	case "waitFor":
		typ = model.StepWebWait
	case "read":
		typ = model.StepWebRead
	default:
		return st, false, false
	}
	sels := pickSelectors(ev)
	if len(sels) == 0 {
		return st, false, false
	}
	st, err := model.NewStep(typ)
	if err != nil {
		return st, false, false
	}
	st.Selectors = sels
	if typ == model.StepWebType {
		st.Text = ev.Input // có {{ thì giữ nguyên – là biến
	}
	return st, ev.Count != 1, true
}

// pickSelectors – selector người dùng chọn đứng đầu, rồi các ứng viên bền (bỏ trùng / rỗng).
func pickSelectors(ev PickEvent) []string {
	var out []string
	seen := map[string]bool{}
	for _, s := range append([]string{ev.Selector}, ev.Selectors...) {
		s = strings.TrimSpace(s)
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}
