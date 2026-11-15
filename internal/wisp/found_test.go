package wisp

import (
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

func TestSelectorLineRoundTrip(t *testing.T) {
	for _, line := range []string{`text=Đăng nhập`, `text="Gửi"`, `aria=Tìm kiếm`, `role=button`, `role=link[name="Xem lịch sử"]`,
		`label="Email"`, `css=#q`, `xpath=//a[1]`} {
		sel, err := model.ParseSelector(line)
		if err != nil {
			t.Fatal(err)
		}
		back, _ := model.ParseSelector(SelectorLine(sel))
		if back != sel {
			t.Errorf("%s → %s → %+v, cần %+v", line, SelectorLine(sel), back, sel)
		}
	}
}

func TestPickTab(t *testing.T) {
	tabs := []tabEntry{{ID: 1, URL: "https://a.vn/", Title: "Trang A"}, {ID: 2, URL: "https://shop.vn/orders", Title: "Đơn hàng", Active: true}}
	cases := []struct {
		filter string
		prefer int
		want   int
	}{
		{"", 0, 2},          // tab đang xem
		{"", 1, 1},          // tab node Mở vừa mở
		{"", 9, 2},          // tab đã đóng → tab đang xem
		{"1", 0, 1},         // id
		{"SHOP.vn", 0, 2},   // URL chứa
		{"trang a", 0, 1},   // tiêu đề chứa
		{"không có", 0, -1}, // không chọn bừa
	}
	for _, c := range cases {
		got, ok := pickTab(tabs, c.filter, c.prefer)
		if !ok {
			got.ID = -1
		}
		if got.ID != c.want {
			t.Errorf("pickTab(%q, %d) = %d, cần %d", c.filter, c.prefer, got.ID, c.want)
		}
	}
}

func TestPickElemAndFound(t *testing.T) {
	r := findResult{SelectorIndex: 1, Found: []elem{
		{Ref: "p.1", Rect: rect{0, 900, 10, 10}, InView: false, Text: "ngoài"},
		{Ref: "p.2", Rect: rect{0, 0, 10, 10}, InView: true, Covered: "div.modal"},
		{Ref: "p.3", Rect: rect{20, 30, 40, 50}, InView: true, Name: "Gửi",
			ScreenRect: &screenRect{rect: rect{100, 200, 40, 50}, Scale: 2}},
	}, More: 4}
	click := web.Query{Scroll: true}
	if i := pickElem(r, click); i != 2 {
		t.Fatalf("sắp bấm: chọn %d, cần 2 (trong khung, không bị che)", i)
	}
	if i := pickElem(r, web.Query{}); i != 0 {
		t.Errorf("chỉ chờ: chọn %d, cần 0 (cái đầu)", i)
	}
	if i := pickElem(r, web.Query{Occurrence: 2}); i != 1 {
		t.Errorf("chỗ thứ 2: %d", i)
	}
	if i := pickElem(r, web.Query{Occurrence: 4}); i != -1 {
		t.Errorf("chỗ thứ 4 không có: %d", i)
	}
	f := toFound(r, 2, click, "https://x/", false, false)
	if !f.OK || f.Rect != (model.Rect{X: 20, Y: 30, W: 40, H: 50}) || f.Text != "Gửi" || f.Count != 7 || f.Selector != 1 || f.Counts[1].Shown != 7 {
		t.Errorf("toFound trong trang: %+v", f)
	}
	if f := toFound(r, 2, click, "", true, true); f.Rect != (model.Rect{X: 200, Y: 400, W: 80, H: 100}) {
		t.Errorf("toạ độ màn hình pixel thật: %+v", f.Rect)
	}
	if f := toFound(r, 1, click, "", false, false); f.OK || f.Covered != "div.modal" {
		t.Errorf("bị che thì chưa tính là thấy: %+v", f)
	}
	if f := toFound(r, 1, web.Query{}, "", false, false); !f.OK {
		t.Errorf("chỉ chờ: bị che vẫn là thấy")
	}
	if f := toFound(r, -1, web.Query{Occurrence: 9}, "", false, false); f.OK || f.Selector != -1 || f.Count != 7 {
		t.Errorf("không có chỗ thứ 9: %+v", f)
	}
	if f := toFound(findResult{SelectorIndex: -1, Hidden: 3}, -1, click, "", false, false); f.OK || f.Hidden != 3 {
		t.Errorf("không thấy, có phần tử ẩn: %+v", f)
	}
}

func TestSettleEffect(t *testing.T) {
	m := web.Mark{Tab: "2", URL: "https://a/", Tabs: []string{"1", "2"}, Doc: "3"}
	same := []tabEntry{{ID: 1, URL: "https://x/"}, {ID: 2, URL: "https://a/"}}
	if e := settleEffect(m, same, 3, true); e.Navigated || e.Popup != "" || e.URL != "https://a/" || !e.Settled {
		t.Errorf("không đổi: %+v", e)
	}
	if e := settleEffect(m, same, 4, true); !e.Navigated {
		t.Errorf("tải lại cùng URL vẫn là điều hướng: %+v", e)
	}
	moved := []tabEntry{{ID: 1, URL: "https://x/"}, {ID: 2, URL: "https://a/b"}, {ID: 5, URL: "https://pop/"}}
	if e := settleEffect(m, moved, 3, false); !e.Navigated || e.Popup != "https://pop/" || e.Settled {
		t.Errorf("đổi URL + popup: %+v", e)
	}
	if e := settleEffect(m, []tabEntry{{ID: 1}}, 3, false); !e.Settled || e.Navigated {
		t.Errorf("tab tự đóng: %+v", e)
	}
}

func TestToOutline(t *testing.T) {
	r := outlineResult{URL: "u", Title: "t", Total: 2, Items: []outlineRow{
		{Role: "dialog", Name: "Xác nhận", Depth: 0},
		{Role: "checkbox", Name: "Nhớ", Selector: `role=checkbox[name="Nhớ"]`, Depth: 1, InView: true, State: outlineState{Checked: "true"}},
	}}
	r.View.W, r.View.H = 800, 600
	o := toOutline(r, "3")
	if o.Dialogs != 1 || !o.Items[0].Region || o.Items[1].Checked != "true" || o.Items[1].Selector == "" || o.ViewW != 800 || o.Tab != "3" {
		t.Errorf("toOutline: %+v", o)
	}
}
