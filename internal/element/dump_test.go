package element

import (
	"testing"

	"ghosthand/internal/model"
)

func TestDump(t *testing.T) {
	nodes := []Node{
		{Raw: "AXWindow", Role: "window", Title: "Trang"},
		{Raw: "AXButton", Role: "button"}, // không tên, không giá trị → không liệt kê nhưng vẫn đếm
		{Raw: "AXButton", Role: "button", Title: "Gửi"},
		{Raw: "AXStaticText", Role: RoleText, Value: "xin\nchào"},
	}
	list, roles := Dump(nodes, Query{})
	if len(list) != 3 || list[2].Value != "xin chào" {
		t.Fatalf("list = %+v", list)
	}
	if roles[0].Raw != "AXButton" || roles[0].Count != 2 {
		t.Errorf("roles = %+v", roles)
	}
}

// 57 C1: cây lớn → ≤ dumpMax dòng; cùng vai trò role= có trước, rồi phần tử bấm / gõ được; giữ thứ tự đọc.
func TestDumpLimitTiers(t *testing.T) {
	var nodes []Node
	for range 100 {
		nodes = append(nodes, Node{Raw: "AXStaticText", Role: RoleText, Value: "chữ"})
	}
	nodes = append(nodes, Node{Raw: "AXButton", Role: "button", Title: "Gửi"}, Node{Raw: "AXTextArea", Role: "textbox", Desc: "Write to"})
	q := Query{Selectors: []model.Selector{{By: model.SelRole, Value: "textbox", Name: "Message"}}}
	list, roles := Dump(nodes, q)
	if len(list) != dumpMax || list[dumpMax-2].Role != "button" || list[dumpMax-1].Role != "textbox" {
		t.Fatalf("list (%d) đuôi = %+v", len(list), list[len(list)-2:])
	}
	if roles[0].Count != 100 {
		t.Errorf("đếm vẫn theo cả cây: %+v", roles)
	}
}
