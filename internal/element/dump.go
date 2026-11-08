package element

import (
	"slices"
	"sort"

	"ghosthand/internal/model"
)

// Read – một phần tử accessibility đã đọc được, rút gọn để hiện trong chi tiết lỗi (bước 50 A2): người dùng đối chiếu
// với Accessibility Inspector xem app đọc được gì và thiếu phần tử nào.
type Read struct {
	Raw   string     `json:"raw"` // vai trò gốc của hệ điều hành (AXButton…)
	Role  string     `json:"role"`
	Name  string     `json:"name,omitempty"`
	Value string     `json:"value,omitempty"`
	Depth int        `json:"depth"`
	Box   model.Rect `json:"box"`
}

// RoleCount – số phần tử theo vai trò gốc.
type RoleCount struct {
	Raw   string `json:"raw"`
	Count int    `json:"count"`
}

// dumpMax – số phần tử liệt kê tối đa: AI đọc mỗi lần lỗi nên giữ gọn (57 C1, trước là 150 ≈ 200 dòng); cần đủ cây thì
// describe_screen elements=true.
const dumpMax = 30

// Dump – tối đa dumpMax phần tử có tên hoặc giá trị, cùng bảng đếm theo vai trò của cả cây. Chọn theo tầng: cùng vai
// trò với role= trong q → bấm / gõ được → còn lại; trả theo thứ tự đọc (UI thụt theo độ sâu).
// Cây trống / chỉ có khung cửa sổ = app không mở cây accessibility (web trong Chrome cần bật hỗ trợ).
func Dump(nodes []Node, q Query) ([]Read, []RoleCount) {
	count := map[string]int{}
	tiers := [3][]int{}
	for i, n := range nodes {
		count[n.Raw]++
		if n.Name() == "" && n.Value == "" {
			continue
		}
		t := 2
		if slices.ContainsFunc(q.Selectors, func(s model.Selector) bool { return s.By == model.SelRole && s.Value == n.Role }) {
			t = 0
		} else if n.Interactive() {
			t = 1
		}
		tiers[t] = append(tiers[t], i)
	}
	pick := slices.Concat(tiers[0], tiers[1], tiers[2])
	pick = pick[:min(len(pick), dumpMax)]
	slices.Sort(pick)
	list := make([]Read, 0, len(pick))
	for _, i := range pick {
		n := nodes[i]
		list = append(list, Read{Raw: n.Raw, Role: n.Role, Name: clip(n.Name()), Value: clip(n.Value), Depth: n.Depth, Box: n.Box})
	}
	roles := make([]RoleCount, 0, len(count))
	for raw, c := range count {
		roles = append(roles, RoleCount{raw, c})
	}
	sort.Slice(roles, func(i, j int) bool {
		if roles[i].Count != roles[j].Count {
			return roles[i].Count > roles[j].Count
		}
		return roles[i].Raw < roles[j].Raw
	})
	return list, roles
}
