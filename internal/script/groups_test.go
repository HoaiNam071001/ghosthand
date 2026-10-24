package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestValidateGroups(t *testing.T) {
	idx := map[string]int{"a": 0, "b": 1, "c": 2}
	ok := []model.Group{{ID: "g1", Name: "A", Members: []string{"a", "b"}}, {ID: "g2", Name: "B", Members: []string{"c"}}}
	if err := validateGroups(ok, idx); err != nil {
		t.Fatalf("hợp lệ mà báo lỗi: %v", err)
	}
	bad := map[string][]model.Group{
		"trùng id": {{ID: "g1", Members: []string{"a"}}, {ID: "g1", Members: []string{"b"}}},
		"node lạ":  {{ID: "g1", Members: []string{"zzz"}}},
		"hai nhóm": {{ID: "g1", Members: []string{"a"}}, {ID: "g2", Members: []string{"a"}}},
		"thiếu id": {{Name: "x", Members: []string{"a"}}},
	}
	for name, g := range bad {
		if validateGroups(g, idx) == nil {
			t.Errorf("%s: phải báo lỗi", name)
		}
	}
}

func TestDropMember(t *testing.T) {
	in := []model.Group{{ID: "g1", Members: []string{"a", "b"}}, {ID: "g2", Members: []string{"c"}}}
	out := DropMember(in, "c")
	if len(out) != 1 || out[0].ID != "g1" {
		t.Fatalf("nhóm hết thành viên phải bị xoá: %+v", out)
	}
	out = DropMember(in, "a")
	if len(out[0].Members) != 1 || len(in[0].Members) != 2 {
		t.Fatalf("bỏ a: %+v, đầu vào bị sửa: %+v", out, in)
	}
}
