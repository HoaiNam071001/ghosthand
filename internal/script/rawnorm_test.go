package script

import (
	"encoding/json"
	"slices"
	"testing"

	"ghosthand/internal/model"
)

func TestSplitCombo(t *testing.T) {
	for _, c := range []struct {
		in         string
		keys, mods []string
	}{
		{"enter", []string{"enter"}, []string{}},
		{"cmd+c", []string{"c"}, []string{"cmd"}},
		{"Command + Shift + T", []string{"t"}, []string{"cmd", "shift"}},
		{"control+option+plus", []string{"plus"}, []string{"ctrl", "alt"}},
	} {
		keys, mods := splitCombo(c.in)
		if !slices.Equal(keys, c.keys) || !slices.Equal(mods, c.mods) {
			t.Errorf("%q → %v %v, muốn %v %v", c.in, keys, mods, c.keys, c.mods)
		}
	}
}

// 57 A2 / A3: cách viết AI hay dùng ở dạng gọn được nhận, lưu lại đúng một dạng.
func TestExpandAliases(t *testing.T) {
	sc := compactScript(t, `{"steps":[
		{"type":"window","winOp":"focus","winApp":"Google Chrome"},
		{"type":"key","keys":"enter"},
		{"type":"key","keys":"cmd+shift+t","modifiers":["shift"]},
		{"type":"key","keys":["a"]}]}`)
	if sc.Steps[0].WinOp != model.WinFocus {
		t.Errorf("winOp focus → %q", sc.Steps[0].WinOp)
	}
	want := []struct{ keys, mods []string }{{[]string{"enter"}, []string{}}, {[]string{"t"}, []string{"shift", "cmd"}}, {[]string{"a"}, []string{}}}
	for i, w := range want {
		s := sc.Steps[i+1]
		if !slices.Equal(s.Keys, w.keys) || !slices.Equal(s.Modifiers, w.mods) {
			t.Errorf("node %d: keys %v modifiers %v, muốn %v %v", i+2, s.Keys, s.Modifiers, w.keys, w.mods)
		}
	}
}

func TestPatchKeysString(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"key","keys":["a"]}]}`)
	got, _, err := ApplyPatch(sc, Patch{Steps: []json.RawMessage{
		json.RawMessage(`{"ref":"n1","keys":"ctrl+v"}`),
		json.RawMessage(`{"type":"window","winOp":"focus","winTitle":"Zalo"}`),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if s := got.Steps[0]; !slices.Equal(s.Keys, []string{"v"}) || !slices.Equal(s.Modifiers, []string{"ctrl"}) {
		t.Errorf("sửa keys chuỗi: %v %v", s.Keys, s.Modifiers)
	}
	if got.Steps[1].WinOp != model.WinFocus {
		t.Errorf("node mới winOp focus → %q", got.Steps[1].WinOp)
	}
}
