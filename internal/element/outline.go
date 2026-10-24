package element

import (
	"fmt"
	"strings"

	"ghosthand/internal/model"
)

// Cây giao diện rút gọn của mọi app (bước 43 A2) – cùng ý với web.PageOutline nhưng đọc từ cây AX / UIA: bỏ khối
// trang trí, gộp chữ nằm trong nút đã có tên, đánh số (mark) để AI nói “click #12” (A1) và sinh selector bền (A4).

// Item – một dòng của cây rút gọn. Mark đánh từ 1 theo thứ tự đọc; Index = vị trí trong danh sách nút gốc.
type Item struct {
	Mark        int        `json:"mark"`
	Index       int        `json:"-"`
	Role        string     `json:"role"`
	Name        string     `json:"name,omitempty"`
	Value       string     `json:"value,omitempty"`
	Box         model.Rect `json:"box"`
	Interactive bool       `json:"interactive,omitempty"` // bấm / gõ được (A1 chỉ vẽ số lên các phần tử này)
}

// OutlineOpts – giới hạn cây trả về (cây app lớn có hàng nghìn nút).
type OutlineOpts struct {
	Max             int  // số dòng tối đa; ≤ 0 = 120
	InteractiveOnly bool // chỉ phần tử bấm / gõ được
}

const defaultOutlineMax = 120

var interactiveRoles = map[string]bool{
	"button": true, "link": true, "textbox": true, "searchbox": true, "combobox": true, "checkbox": true, "radio": true,
	"switch": true, "slider": true, "spinbutton": true, "tab": true, "menuitem": true, "treeitem": true, "listitem": true,
}

// Interactive – vai trò bấm / gõ được.
func (n Node) Interactive() bool { return interactiveRoles[n.Role] }

// Outline rút gọn nodes: bỏ phần tử chưa hiện / không tên không giá trị (nhóm, khung bố cục…), bỏ khối chữ trùng tên
// với nút chứa nó, cắt dài quá 80 ký tự. Phần tử cùng vai trò + khung (cha và con trỏ cùng chỗ) chỉ giữ một.
func Outline(nodes []Node, o OutlineOpts) (items []Item, omitted int) {
	limit := o.Max
	if limit <= 0 {
		limit = defaultOutlineMax
	}
	var last *Item
	for i, n := range nodes {
		if !n.Shown() || skipNode(nodes, i) {
			continue
		}
		it := Item{Index: i, Role: n.Role, Name: clip(n.Name()), Box: n.Box, Interactive: n.Interactive()}
		if v := clip(n.Value); v != it.Name && (editable(n.Role) || n.Role == "checkbox" || n.Role == "switch" || n.Role == "slider") {
			it.Value = v
		}
		if it.Name == "" && it.Value == "" && !it.Interactive {
			continue
		}
		if o.InteractiveOnly && !it.Interactive {
			continue
		}
		if last != nil && last.Role == it.Role && last.Name == it.Name && last.Box == it.Box {
			continue
		}
		if len(items) >= limit {
			omitted++
			continue
		}
		it.Mark = len(items) + 1
		items = append(items, it)
		last = &items[len(items)-1]
	}
	return items, omitted
}

// skipNode – khối chữ nằm trong nút bấm được có cùng chữ (nhãn của nút) → đã gộp vào nút.
func skipNode(nodes []Node, i int) bool {
	n := nodes[i]
	if n.Role != RoleText || strings.TrimSpace(n.Value) == "" {
		return false
	}
	for j := i - 1; j >= 0; j-- {
		if nodes[j].Depth >= n.Depth {
			continue
		}
		if nodes[j].Interactive() && strings.TrimSpace(nodes[j].Name()) == strings.TrimSpace(n.Value) {
			return true
		}
		if nodes[j].Depth == 0 {
			break
		}
	}
	return false
}

func clip(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > 80 {
		return string(r[:80]) + "…"
	}
	return s
}

// Line – dòng chữ của một item: `#12 button "Lưu" {x,y,w,h}`.
func (it Item) Line() string {
	s := fmt.Sprintf("#%d %s", it.Mark, it.Role)
	if it.Name != "" {
		s += fmt.Sprintf(" %q", it.Name)
	}
	if it.Value != "" {
		s += fmt.Sprintf(" = %q", it.Value)
	}
	return s + fmt.Sprintf(" {%d,%d,%d,%d}", it.Box.X, it.Box.Y, it.Box.W, it.Box.H)
}
