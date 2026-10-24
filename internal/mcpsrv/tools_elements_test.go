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

func TestTemplateFlow(t *testing.T) {
	cs, back := connect(t)
	if _, isErr := call(t, cs, "capture_template", map[string]any{}); !isErr {
		t.Fatal("thiếu vùng phải báo lỗi")
	}
	cap, isErr := call(t, cs, "capture_template", map[string]any{"x": 100, "y": 100, "w": 40, "h": 30})
	if isErr || cap["template"] != "tpl:1" || cap["templateScale"] != float64(2) {
		t.Fatalf("capture: %v", cap)
	}
	f, isErr := call(t, cs, "find_image", map[string]any{"template": "tpl:1", "x": 0, "y": 0, "w": 500, "h": 500})
	if isErr || f["found"] != true || f["center"].(map[string]any)["x"] != float64(25) || back.found.Threshold != 80 || back.found.Template == "" {
		t.Fatalf("find: %v / %+v", f, back.found)
	}
	if _, isErr := call(t, cs, "find_image", map[string]any{"template": "tpl:9"}); !isErr {
		t.Fatal("ảnh mẫu không có phải báo lỗi")
	}
	// ảnh mẫu thật thay vào kịch bản khi tạo
	out, isErr := call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "Ảnh mẫu", "steps": []any{
		map[string]any{"type": "clickImage", "template": "tpl:1"},
	}}})
	if isErr {
		t.Fatalf("create: %v", out)
	}
	rd, _ := call(t, cs, "read_script", map[string]any{"path": out["created"].([]any)[0].(map[string]any)["path"]})
	st := rd["script"].(map[string]any)["steps"].([]any)[0].(map[string]any)
	if tp, _ := st["template"].(string); strings.HasPrefix(tp, "tpl:") || tp == "" || st["templateScale"] != float64(2) {
		t.Fatalf("template chưa thay: %v", st)
	}
	bad, isErr := call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "Hỏng", "steps": []any{
		map[string]any{"type": "clickImage", "template": "tpl:77"},
	}}})
	if !isErr {
		t.Fatalf("tpl không có phải lỗi: %v", bad)
	}
}

func TestMouseAndWindows(t *testing.T) {
	cs, _ := connect(t)
	m, isErr := call(t, cs, "get_mouse_position", map[string]any{})
	if isErr || m["x"] != float64(300) || m["y"] != float64(400) {
		t.Fatalf("mouse: %v", m)
	}
	w, isErr := call(t, cs, "list_windows", map[string]any{})
	if isErr || len(w["windows"].([]any)) != 1 {
		t.Fatalf("windows: %v", w)
	}
}

func TestSimulateScript(t *testing.T) {
	cs, _ := connect(t)
	sc := map[string]any{"name": "Thử khô", "steps": []any{
		map[string]any{"type": "wait", "delayAfter": 1},
		map[string]any{"type": "click", "x": 10, "y": 10},
		map[string]any{"type": "type", "text": "{{n1.output.ten}}"},
	}, "edges": []any{map[string]any{"from": "n1", "port": "success", "to": "n2"}, map[string]any{"from": "n2", "port": "fail", "to": "n3"}}}
	out, isErr := call(t, cs, "simulate_script", map[string]any{"script": sc,
		"outcomes": map[string]any{"n2": "fail"}, "outputs": map[string]any{"n1": map[string]any{"ten": "Lan"}}})
	if isErr || out["ok"] != true || out["visited"] != float64(3) || len(out["unvisited"].([]any)) != 0 {
		t.Fatalf("simulate: %v", out)
	}
	if bad, isErr := call(t, cs, "simulate_script", map[string]any{"script": sc, "outcomes": map[string]any{"n1": "yes"}}); !isErr {
		t.Fatalf("cổng không có phải lỗi: %v", bad)
	}
	out, _ = call(t, cs, "simulate_script", map[string]any{"script": sc}) // n2 thành công → n3 không tới
	if out["visited"] != float64(2) || len(out["unvisited"].([]any)) != 1 {
		t.Fatalf("mặc định: %v", out)
	}
}

func TestCaptureNotes(t *testing.T) {
	cs, back := connect(t)
	call(t, cs, "describe_screen", map[string]any{})
	call(t, cs, "screenshot", map[string]any{})
	call(t, cs, "get_mouse_position", map[string]any{})
	if back.captures != 2 {
		t.Fatalf("captures = %d, cần 2 (describe_screen + screenshot, không tính get_mouse_position)", back.captures)
	}
}
