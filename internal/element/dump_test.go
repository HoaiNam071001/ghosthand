package element

import "testing"

func TestDump(t *testing.T) {
	nodes := []Node{
		{Raw: "AXWindow", Role: "window", Title: "Trang"},
		{Raw: "AXButton", Role: "button"}, // không tên, không giá trị → không liệt kê nhưng vẫn đếm
		{Raw: "AXButton", Role: "button", Title: "Gửi"},
		{Raw: "AXStaticText", Role: RoleText, Value: "xin\nchào"},
	}
	list, roles := Dump(nodes)
	if len(list) != 3 || list[2].Value != "xin chào" {
		t.Fatalf("list = %+v", list)
	}
	if roles[0].Raw != "AXButton" || roles[0].Count != 2 {
		t.Errorf("roles = %+v", roles)
	}
}
