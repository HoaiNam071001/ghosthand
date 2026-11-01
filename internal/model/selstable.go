package model

import (
	"fmt"
	"slices"
	"strings"
	"unicode"
)

// Nhãn hay đổi theo trạng thái: "Messenger" ↔ "Messenger, 1 unread", "Hộp thư (3)", "Huy Hoàng · 5 phút". Selector
// ghi nguyên nhãn lúc chọn sẽ gãy khi số đổi → tìm theo phần cố định (dạng chứa). Frontend có bản sao (flow/web.ts),
// dữ liệu test chung testdata/stable-labels.json.

// stableSeps – chỗ cắt: phần sau dấu này có số thì là phần hay đổi.
var stableSeps = []string{",", "(", "·", "•", "|", ":", " - ", " – "}

// StableLabel – phần cố định của nhãn (trước dấu tách đầu tiên mà phía sau có số); "" = nhãn không có phần hay đổi,
// hoặc phần còn lại có số / không có chữ.
func StableLabel(s string) string {
	s = strings.TrimSpace(s)
	cut := -1
	for _, sep := range stableSeps {
		if i := strings.Index(s, sep); i > 0 && hasDigit(s[i:]) && (cut < 0 || i < cut) {
			cut = i
		}
	}
	if cut < 0 {
		return ""
	}
	core := strings.TrimSpace(s[:cut])
	if hasDigit(core) || !strings.ContainsFunc(core, unicode.IsLetter) {
		return ""
	}
	return core
}

// StableSelector – selector tìm theo phần cố định của giá trị (text / aria / label: dạng chứa; role: tên chứa).
// false = selector không có phần hay đổi, có {{biến}}, sai dạng hoặc css / xpath.
func StableSelector(line string) (string, bool) {
	if strings.Contains(line, "{{") {
		return "", false
	}
	sel, err := ParseSelector(line)
	if err != nil {
		return "", false
	}
	switch sel.By {
	case SelText, SelAria, SelLabel:
		if core := StableLabel(sel.Value); core != "" {
			return sel.By + "=" + core, true
		}
	case SelRole:
		if core := StableLabel(sel.Name); core != "" && !strings.Contains(core, `"`) {
			return fmt.Sprintf(`role=%s[name="%s"]`, sel.Value, core), true
		}
	}
	return "", false
}

// StableFirst – dòng nào có giá trị hay đổi thì chèn dạng chứa phần cố định ngay trước nó (bỏ trùng); "Chọn trên màn" /
// "Chọn phần tử" vẫn kiểm từng dòng tìm lại đúng phần tử đã chọn.
func StableFirst(lines []string) []string {
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		if fix, ok := StableSelector(line); ok && !slices.Contains(out, fix) {
			out = append(out, fix)
		}
		out = append(out, line)
	}
	return out
}

func hasDigit(s string) bool { return strings.ContainsFunc(s, unicode.IsDigit) }

// SelectorFix – cách sửa khi không tìm thấy: selector có phần hay đổi → dạng chứa phần cố định; selector đúng cả chuỗi
// (aria="Messenger") mà có phần tử gần giống tên "Messenger, 1 unread" → bỏ nháy kép (aria=Messenger). "" = không đoán được.
func SelectorFix(lines, nearNames []string) string {
	for _, line := range lines {
		if fix, ok := StableSelector(line); ok {
			return fix
		}
	}
	for _, line := range lines {
		sel, err := ParseSelector(line)
		if err != nil || !sel.Exact || strings.Contains(line, "{{") {
			continue
		}
		for _, name := range nearNames {
			if strings.EqualFold(StableLabel(name), sel.Value) {
				return sel.By + "=" + sel.Value
			}
		}
	}
	return ""
}
