package element

import (
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

const dumpMax = 150 // số phần tử liệt kê tối đa – đủ nhìn, không phình kết quả chạy

// Dump – tối đa dumpMax phần tử đầu (thứ tự đọc) có tên hoặc giá trị, cùng bảng đếm theo vai trò của cả cây.
// Cây trống / chỉ có khung cửa sổ = app không mở cây accessibility (web trong Chrome cần bật hỗ trợ).
func Dump(nodes []Node) ([]Read, []RoleCount) {
	var list []Read
	count := map[string]int{}
	for _, n := range nodes {
		count[n.Raw]++
		if len(list) >= dumpMax || n.Name() == "" && n.Value == "" {
			continue
		}
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
