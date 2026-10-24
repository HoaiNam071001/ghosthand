package mcpsrv

import (
	"strings"
	"testing"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

func formTree() []element.Node {
	r := func(y int) model.Rect { return model.Rect{X: 100, Y: y, W: 80, H: 20} }
	return []element.Node{
		{Role: "window", Title: "Form", Box: model.Rect{X: 100, Y: 100, W: 800, H: 600}},
		{Role: "button", Title: "Lưu", Box: r(120), Depth: 1},
		{Role: "button", Title: "Xoá", Box: r(150), Depth: 1},
		{Role: "button", Title: "Xoá", Box: r(180), Depth: 1},
	}
}

func TestDescribeElementsAndSuggest(t *testing.T) {
	cs, back := connect(t)
	back.elems = formTree()
	out, isErr := call(t, cs, "describe_screen", map[string]any{"elements": true})
	if isErr {
		t.Fatalf("describe_screen elements: %v", out)
	}
	lines, _ := out["elements"].([]any)
	if len(lines) != 4 || !strings.HasPrefix(lines[1].(string), `#2 button "Lưu"`) {
		t.Fatalf("elements = %v", lines)
	}
	sg, isErr := call(t, cs, "suggest_selector", map[string]any{"mark": 2})
	first := sg["suggestions"].([]any)[0].(map[string]any)
	if isErr || first["selector"] != `text="Lưu"` || first["unique"] != true {
		t.Fatalf("suggest = %v", sg)
	}
	dup, _ := call(t, cs, "suggest_selector", map[string]any{"mark": 4})
	if f := dup["suggestions"].([]any)[0].(map[string]any); f["unique"] == true || f["occurrence"] != float64(2) {
		t.Fatalf("dup = %v", dup)
	}
	if _, isErr := call(t, cs, "suggest_selector", map[string]any{"mark": 99}); !isErr {
		t.Fatal("số ngoài danh sách phải báo lỗi")
	}
	byPoint, isErr := call(t, cs, "suggest_selector", map[string]any{"x": 110, "y": 125})
	if isErr || byPoint["suggestions"].([]any)[0].(map[string]any)["selector"] != `text="Lưu"` {
		t.Fatalf("theo toạ độ: %v", byPoint)
	}
}

func TestScreenshotMarks(t *testing.T) {
	cs, back := connect(t)
	back.elems = formTree()
	out, isErr := call(t, cs, "screenshot", map[string]any{"x": 0, "y": 0, "w": 1000, "h": 800, "marks": true})
	if isErr {
		t.Fatalf("screenshot marks: %v", out)
	}
	if m, _ := out["marks"].([]any); len(m) != 3 { // chỉ phần tử bấm được, không tính cửa sổ
		t.Fatalf("marks = %v", out["marks"])
	}
}

func TestScreenChanges(t *testing.T) {
	cs, back := connect(t)
	back.elems = formTree()
	if _, isErr := call(t, cs, "screen_changes", map[string]any{"action": "end"}); !isErr {
		t.Fatal("end trước start phải lỗi")
	}
	call(t, cs, "screen_changes", map[string]any{"action": "start"})
	back.elems = append(formTree()[:3], element.Node{Role: "dialog", Title: "Đã lưu", Box: model.Rect{X: 300, Y: 300, W: 100, H: 50}})
	out, isErr := call(t, cs, "screen_changes", map[string]any{"action": "end"})
	ch := out["changes"].(map[string]any)
	if isErr || out["same"] != false || len(ch["added"].([]any)) != 1 || len(ch["removed"].([]any)) != 1 {
		t.Fatalf("changes = %v", out)
	}
}

func TestTitleDiff(t *testing.T) {
	o, c := titleDiff([]string{"a", "b", "b"}, []string{"b", "c"})
	if len(o) != 1 || o[0] != "c" || len(c) != 2 {
		t.Fatalf("opened %v closed %v", o, c)
	}
}
