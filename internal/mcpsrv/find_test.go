package mcpsrv

import (
	"strings"
	"testing"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/textop"
	"ghosthand/internal/web"
)

// Trang: banner có nút Đăng nhập; main chứa form (ô Email, nút Gửi) và hộp thoại (nút Gửi); nút Gửi cuối trang ngoài vùng.
func findPage() web.Outline {
	return web.Outline{URL: "https://shop.vn/", Title: "Shop", Items: []web.OutlineItem{
		{Role: "banner", Region: true},
		{Role: "button", Name: "Đăng nhập", Depth: 1},
		{Role: "main", Region: true},
		{Role: "form", Name: "Liên hệ", Region: true, Depth: 1},
		{Role: "textbox", Name: "Email", Value: "a@b.vn", Depth: 2},
		{Role: "button", Name: "Gửi", Depth: 2},
		{Role: "dialog", Name: "Xác nhận", Region: true, Depth: 1},
		{Role: "button", Name: "Gửi lại", Depth: 2},
		{Role: "link", Name: "Gửi góp ý"},
	}}
}

func roles(o web.Outline) string {
	var s []string
	for _, it := range o.Items {
		s = append(s, it.Role)
	}
	return strings.Join(s, " ")
}

func TestFindOutline(t *testing.T) {
	cases := []struct {
		q, want string
		matched int
	}{
		{"gui", "main form button dialog button link", 3}, // vùng bao ngoài đi kèm, không lặp
		{"dang nhap", "banner button", 1},
		{"/^Gửi$/", "main form button", 1},
		{"b.vn", "main form textbox", 1}, // khớp cả giá trị ô
		{"không có", "", 0},
	}
	for _, c := range cases {
		f, _ := textop.NewFinder(c.q)
		o, n := findOutline(findPage(), f, 80)
		if got := roles(o); got != c.want || n != c.matched || o.Total != len(o.Items) {
			t.Errorf("%q: %q (khớp %d, total %d), muốn %q (%d)", c.q, got, n, o.Total, c.want, c.matched)
		}
	}
	f, _ := textop.NewFinder("gui")
	if o, _ := findOutline(findPage(), f, 2); len(o.Items) != 2 || o.Total != 6 || !strings.Contains(o.Text(), "… còn 4 phần tử") {
		t.Errorf("cắt dòng: %d / %d\n%s", len(o.Items), o.Total, o.Text())
	}
}

func TestElementPath(t *testing.T) {
	nodes := []element.Node{
		{Role: "window", Title: "Zalo"},
		{Role: "group", Depth: 1}, // không tên – bỏ qua
		{Role: "list", Title: "Tin nhắn", Depth: 2},
		{Role: "text", Value: "Hôm nay", Depth: 3},
		{Role: "button", Title: "Gửi", Depth: 3},
	}
	if got := elementPath(nodes, 4); got != `window "Zalo" › list "Tin nhắn"` {
		t.Errorf("đường = %q", got)
	}
	if got := elementPath(nodes, 0); got != "" {
		t.Errorf("cửa sổ không có vùng ngoài: %q", got)
	}
}

func TestFindTools(t *testing.T) {
	cs, back := connect(t)
	back.outline = findPage()
	out, isErr := call(t, cs, "read_web_outline", map[string]any{"find": "gửi lại"})
	if o, _ := out["outline"].(string); isErr || !back.outlineAll || out["matches"] != float64(1) || !strings.Contains(o, `dialog "Xác nhận"`) || strings.Contains(o, "Email") {
		t.Fatalf("read_web_outline find: %v (đọc cả trang %v)", out, back.outlineAll)
	}
	if out, _ := call(t, cs, "read_web_outline", map[string]any{"find": "zzz"}); out["matches"] != float64(0) || out["hint"] == nil {
		t.Errorf("không khớp phải có gợi ý: %v", out)
	}
	if _, isErr := call(t, cs, "read_web_outline", map[string]any{"find": "/(/"}); !isErr {
		t.Error("regex sai phải lỗi")
	}

	r := model.Rect{X: 100, Y: 120, W: 80, H: 20}
	back.elems = []element.Node{
		{Role: "window", Title: "Form", Box: model.Rect{X: 100, Y: 100, W: 800, H: 600}},
		{Role: "button", Title: "Lưu", Box: r, Depth: 1},
		{Role: "button", Title: "Xoá", Box: model.Rect{X: 100, Y: 150, W: 80, H: 20}, Depth: 1},
	}
	out, isErr = call(t, cs, "describe_screen", map[string]any{"elements": true, "find": "xoa"})
	lines, _ := out["elements"].([]any)
	if isErr || len(lines) != 1 || lines[0] != `#1 button "Xoá" {100,150,80,20}  ⊂ window "Form"` {
		t.Fatalf("describe_screen find: %v", out)
	}
	sg, _ := call(t, cs, "suggest_selector", map[string]any{"mark": 1}) // số theo danh sách đã lọc
	if first := sg["suggestions"].([]any)[0].(map[string]any); first["selector"] != `text="Xoá"` {
		t.Errorf("suggest #1 sau khi lọc: %v", sg)
	}
}
