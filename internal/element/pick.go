package element

import (
	"fmt"
	"slices"
	"strings"

	"ghosthand/internal/model"
)

// At – phần tử dưới điểm p (Chọn phần tử trên màn – 37 E3): phần tử có khung chứa p, nhỏ nhất (bằng nhau thì sâu hơn);
// bỏ phần tử chưa hiện (kẹp mép). -1 = không có.
func At(nodes []Node, p model.Point) int {
	best := -1
	for i, n := range nodes {
		b := n.Box
		if !n.Shown() || p.X < b.X || p.Y < b.Y || p.X >= b.X+b.W || p.Y >= b.Y+b.H {
			continue
		}
		if best < 0 || b.W*b.H < nodes[best].Box.W*nodes[best].Box.H ||
			b.W*b.H == nodes[best].Box.W*nodes[best].Box.H && n.Depth > nodes[best].Depth {
			best = i
		}
	}
	return best
}

// Pick – câu tìm sinh cho phần tử đã chọn: các dòng selector (dòng đầu ưu tiên) + chỗ thứ mấy theo dòng đầu.
type Pick struct {
	Selectors  []string
	Occurrence int // 1 = chỗ đầu
}

// QueryFor – sinh selector cho nodes[i], mỗi dòng đều kiểm lại bằng Find (tìm lại phải ra đúng phần tử này hoặc phần
// tử nằm trong nó). Thứ tự ưu tiên: chữ đúng cả chuỗi → nhãn aria → vai trò + tên → vai trò; giá trị có phần hay đổi
// ("Messenger, 1 unread") thì dạng chứa phần cố định đứng trước (model.StableFirst). Chữ / nhãn dài quá 60 ký tự
// thì bỏ (trang đổi một chữ là hỏng). Không dòng nào tìm lại đúng → Pick rỗng.
func QueryFor(nodes []Node, i int) Pick {
	n := nodes[i]
	var lines []string
	if t := strings.TrimSpace(n.ownText()); usable(t) {
		lines = append(lines, quoted("text", t))
	}
	if d := strings.TrimSpace(n.Desc); usable(d) {
		lines = append(lines, quoted("aria", d))
	}
	if name := strings.TrimSpace(n.Name()); n.Role != "" && usable(name) && !strings.Contains(name, `"`) {
		lines = append(lines, fmt.Sprintf(`role=%s[name="%s"]`, n.Role, name))
	}
	if n.Role != "" {
		lines = append(lines, "role="+n.Role)
	}
	var p Pick
	for _, line := range model.StableFirst(lines) {
		s, err := model.ParseSelector(line)
		if err != nil {
			continue
		}
		k := occurrenceOf(nodes, s, i)
		if k == 0 || !slices.Contains(lines, line) && len(match(nodes, s, Query{})) != 1 {
			continue // dạng chứa phần cố định chỉ dùng khi không lẫn phần tử khác
		}
		if len(p.Selectors) == 0 {
			p.Occurrence = k
		} else if k != p.Occurrence {
			continue // dòng dự phòng phải trỏ cùng chỗ thứ mấy với dòng đầu (Find dùng chung Occurrence)
		}
		p.Selectors = append(p.Selectors, line)
		if len(p.Selectors) == 3 {
			break
		}
	}
	return p
}

func usable(s string) bool { return s != "" && len([]rune(s)) <= 60 }

// quoted – text="…" / aria="…" (đúng cả chuỗi); chữ có dấu nháy thì để dạng chứa (không thoát được nháy trong selector).
func quoted(by, v string) string {
	if strings.Contains(v, `"`) {
		return by + "=" + v
	}
	return fmt.Sprintf(`%s="%s"`, by, v)
}

// occurrenceOf – nodes[i] là chỗ thứ mấy khi tìm theo s (0 = tìm lại không ra nó). Kết quả nằm trong khung nodes[i]
// (text= lấy khối chữ sâu nhất trong nút) cũng tính là đúng.
func occurrenceOf(nodes []Node, s model.Selector, i int) int {
	for k := 1; ; k++ {
		r := Find(nodes, Query{Selectors: []model.Selector{s}, Occurrence: k})
		if !r.Found {
			return 0
		}
		if r.Hit.Index == i || descendant(nodes, i, r.Hit.Index) {
			return k
		}
	}
}

// descendant – nodes[j] là con cháu của nodes[i] (danh sách phẳng cha trước con).
func descendant(nodes []Node, i, j int) bool {
	if j <= i {
		return false
	}
	for k := i + 1; k <= j; k++ {
		if nodes[k].Depth <= nodes[i].Depth {
			return false
		}
	}
	return true
}
