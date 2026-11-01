package element

import (
	"testing"

	"ghosthand/internal/model"
)

func box(x, y, w, h int) model.Rect { return model.Rect{X: x, Y: y, W: w, H: h} }

// tree – cây giả kiểu trang web trong Chrome: cửa sổ → vùng web → các phần tử.
func tree() []Node {
	return []Node{
		{Role: "window", Raw: "AXWindow", Title: "Shop", Box: box(0, 0, 1000, 800), Depth: 0},
		{Role: "document", Raw: "AXWebArea", Box: box(0, 80, 1000, 720), Depth: 1},
		{Role: "button", Raw: "AXButton", Title: "Thêm vào giỏ", Box: box(100, 200, 120, 40), Depth: 2},
		{Role: RoleText, Raw: "AXStaticText", Value: "Thêm vào giỏ", Box: box(110, 210, 100, 20), Depth: 3},
		{Role: "button", Raw: "AXButton", Desc: "Đóng", Box: box(900, 90, 24, 24), Depth: 2},
		{Role: RoleText, Raw: "AXStaticText", Value: "Giá: 1.234.000 ₫", Box: box(100, 300, 200, 20), Depth: 2},
		{Role: "textbox", Raw: "AXTextField", Placeholder: "Tìm sản phẩm", Value: "áo thun", Box: box(100, 100, 300, 30), Depth: 2},
		{Role: "button", Raw: "AXButton", Title: "Thêm vào giỏ", Box: box(100, 790, 120, 1), Depth: 2},
	}
}

func sel(t *testing.T, line string) model.Selector {
	t.Helper()
	s, err := model.ParseSelector(line)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestFind(t *testing.T) {
	nodes := tree()
	cases := []struct {
		name  string
		q     Query
		index int // -1 = không thấy
		count int
	}{
		{"text lấy khối chữ trong nút", Query{Selectors: []model.Selector{sel(t, "Thêm vào giỏ")}}, 3, 2},
		{"text chỗ thứ 2", Query{Selectors: []model.Selector{sel(t, "Thêm vào giỏ")}, Occurrence: 2}, 7, 2},
		{"text chỗ thứ 3 không có", Query{Selectors: []model.Selector{sel(t, "Thêm vào giỏ")}, Occurrence: 3}, -1, 2},
		{"text bỏ dấu", Query{Selectors: []model.Selector{sel(t, "them vao gio")}, NoAccent: true}, 3, 2},
		{"text đúng cả chuỗi", Query{Selectors: []model.Selector{sel(t, `"1.234.000"`)}}, -1, 0},
		{"text ô nhập theo chữ mờ", Query{Selectors: []model.Selector{sel(t, "Tìm sản phẩm")}}, 6, 1},
		{"aria nút icon", Query{Selectors: []model.Selector{sel(t, "aria=đóng")}}, 4, 1},
		{"role + tên theo nhãn", Query{Selectors: []model.Selector{sel(t, `role=button[name="Đóng"]`)}}, 4, 1},
		{"role không tên", Query{Selectors: []model.Selector{sel(t, "role=textbox")}}, 6, 1},
		{"selector sau khi cái đầu không thấy", Query{Selectors: []model.Selector{sel(t, "Không có"), sel(t, "Giá:")}}, 5, 1},
		{"lọc vùng", Query{Selectors: []model.Selector{sel(t, "role=button")}, Area: &model.Rect{X: 800, Y: 0, W: 200, H: 200}}, 4, 1},
	}
	for _, c := range cases {
		r := Find(nodes, c.q)
		if c.index < 0 {
			if r.Found || r.Count != c.count {
				t.Errorf("%s: Found=%v Count=%d, muốn không thấy, Count=%d", c.name, r.Found, r.Count, c.count)
			}
			continue
		}
		if !r.Found || r.Hit.Index != c.index || r.Count != c.count {
			t.Errorf("%s: Found=%v Index=%d Count=%d, muốn %d / %d", c.name, r.Found, r.Hit.Index, r.Count, c.index, c.count)
		}
	}
}

func TestNodeTextAndShown(t *testing.T) {
	nodes := tree()
	if got := nodes[6].Text(); got != "áo thun" {
		t.Errorf("ô nhập đọc ra %q", got)
	}
	if got := nodes[4].Text(); got != "Đóng" {
		t.Errorf("nút icon đọc ra %q", got)
	}
	if got := nodes[5].Name(); got != "Giá: 1.234.000 ₫" {
		t.Errorf("tên khối chữ %q", got)
	}
	if nodes[7].Shown() || !nodes[2].Shown() {
		t.Error("khung kẹp ở mép (cao 1) phải coi là chưa hiện")
	}
}

func TestRoleFromAX(t *testing.T) {
	cases := map[[2]string]string{
		{"AXButton", ""}:                     "button",
		{"AXTextField", "AXSearchField"}:     "searchbox",
		{"AXTextField", "AXSecureTextField"}: "textbox",
		{"AXPopUpButton", ""}:                "combobox",
		{"AXRadioButton", "AXTabButton"}:     "tab",
		{"AXGroup", ""}:                      "group",
		{"AXScrollArea", ""}:                 "scrollarea",
		{"AXGroup", "AXApplicationDialog"}:   "dialog", // Chrome: <div role="dialog">
		{"AXGroup", "AXApplicationAlert"}:    "alert",
	}
	for in, want := range cases {
		if got := RoleFromAX(in[0], in[1]); got != want {
			t.Errorf("RoleFromAX(%q, %q) = %q, muốn %q", in[0], in[1], got, want)
		}
	}
}

func TestCheckSelectorAndSettled(t *testing.T) {
	if err := CheckSelector(sel(t, "css=.btn")); err == nil {
		t.Error("css= phải báo lỗi")
	}
	if err := CheckSelector(sel(t, "role=link")); err != nil {
		t.Error(err)
	}
	if !Settled(box(10, 10, 50, 20), box(11, 9, 50, 21)) || Settled(box(10, 10, 50, 20), box(13, 10, 50, 20)) {
		t.Error("Settled sai ngưỡng 1 điểm")
	}
}

func TestFindAll(t *testing.T) {
	hits, i := FindAll(tree(), Query{Selectors: []model.Selector{sel(t, "aria=Không có"), sel(t, "role=button[name=Thêm vào giỏ]")}})
	if i != 1 || len(hits) != 2 || hits[0].Index != 2 || hits[1].Index != 7 {
		t.Fatalf("muốn 2 nút qua selector thứ 2, có %d chỗ, selector %d: %+v", len(hits), i, hits)
	}
	if hits, i := FindAll(tree(), Query{Selectors: []model.Selector{sel(t, "aria=Không có")}}); hits != nil || i != -1 {
		t.Fatalf("không khớp: muốn nil, -1; có %v, %d", hits, i)
	}
}
