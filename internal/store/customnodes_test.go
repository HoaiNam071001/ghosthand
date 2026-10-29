package store

import "testing"

func TestCustomNodeCheck(t *testing.T) {
	ok := CustomNode{Name: "Đọc ghi chú", Server: "fs", Tool: "read", Args: `{"path":"/a"}`}
	if err := ok.Check(); err != nil {
		t.Fatal(err)
	}
	for name, n := range map[string]CustomNode{
		"thiếu tên":    {Server: "fs", Tool: "read"},
		"thiếu server": {Name: "x", Tool: "read"},
		"thiếu tool":   {Name: "x", Server: "fs"},
		"args mảng":    {Name: "x", Server: "fs", Tool: "r", Args: `[1]`},
	} {
		if n.Check() == nil {
			t.Errorf("%s: phải lỗi", name)
		}
	}
}

func TestCustomNodeStore(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("HOME", dir)
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("AppData", dir)
	a, err := SaveCustomNode(CustomNode{Name: "A", Server: "fs", Tool: "read"})
	if err != nil || a.ID == "" {
		t.Fatalf("lưu: %+v %v", a, err)
	}
	b, _ := SaveCustomNode(CustomNode{Name: "B", Server: "fs", Tool: "list"})
	if a.ID == b.ID {
		t.Fatal("trùng id")
	}
	a.Name = "A2"
	if _, err := SaveCustomNode(a); err != nil {
		t.Fatal(err)
	}
	list, _ := ListCustomNodes()
	if len(list) != 2 || list[0].Name != "A2" {
		t.Fatalf("danh sách: %+v", list)
	}
	if err := DeleteCustomNode(a.ID); err != nil {
		t.Fatal(err)
	}
	if list, _ = ListCustomNodes(); len(list) != 1 || list[0].ID != b.ID {
		t.Fatalf("sau xoá: %+v", list)
	}
}
