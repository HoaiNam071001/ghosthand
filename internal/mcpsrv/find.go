package mcpsrv

import (
	"strconv"
	"strings"

	"ghosthand/internal/element"
	"ghosthand/internal/textop"
	"ghosthand/internal/web"
)

// Tham số find của read_web_outline / describe_screen elements (bước 56 B3): đọc cả cây rồi chỉ gửi dòng khớp (theo tên /
// giá trị) kèm vùng bao ngoài – AI biết nút “Gửi” nằm trong hộp thoại nào mà không phải đọc cả trang.

// findOutline – dòng khớp f + các vùng (Region) bao ngoài chúng, giữ thứ tự trang; cắt ở maxShown dòng. matched = số
// dòng khớp (không tính vùng thêm vào).
func findOutline(o web.Outline, f textop.Finder, maxShown int) (web.Outline, int) {
	keep := make([]bool, len(o.Items))
	matched := 0
	for i, it := range o.Items {
		if !f(it.Name, it.Value) {
			continue
		}
		matched++
		keep[i] = true
		d := it.Depth // vùng chứa dòng i: dòng vùng gần nhất phía trước có Depth nhỏ hơn một bậc
		for j := i - 1; j >= 0 && d > 0; j-- {
			if p := o.Items[j]; p.Region && p.Depth == d-1 {
				keep[j], d = true, p.Depth
			}
		}
	}
	var items []web.OutlineItem
	for i, k := range keep {
		if k {
			items = append(items, o.Items[i])
		}
	}
	o.Total = len(items)
	o.Items = items[:min(len(items), maxShown)]
	return o, matched
}

// maxPath – số vùng có tên gần nhất ghi trong đường bao ngoài của một phần tử.
const maxPath = 3

// elementPath – các phần tử có tên bao ngoài nodes[i] (gần nhất cuối), vd `window "Zalo" › list "Tin nhắn"` – cây đã
// trải phẳng theo thứ tự duyệt sâu nên cha là nút phía trước gần nhất có Depth nhỏ hơn.
func elementPath(nodes []element.Node, i int) string {
	var path []string
	d := nodes[i].Depth
	for j := i - 1; j >= 0 && d > 0 && len(path) < maxPath; j-- {
		n := nodes[j]
		if n.Depth >= d {
			continue
		}
		d = n.Depth
		if name := n.Name(); name != "" && n.Role != element.RoleText {
			path = append(path, n.Role+" "+strconv.Quote(clipRunes(name, 40)))
		}
	}
	for l, r := 0, len(path)-1; l < r; l, r = l+1, r-1 {
		path[l], path[r] = path[r], path[l]
	}
	return strings.Join(path, " › ")
}

func clipRunes(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}
