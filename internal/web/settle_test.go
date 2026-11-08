package web

import "testing"

func TestSettleDone(t *testing.T) {
	m := Mark{Tab: "t1", URL: "https://a.vn/", Doc: "d1", Tabs: []string{"t1"}}
	quiet := settleProbe{Doc: "d1", Idle: 150, State: "complete"}
	cases := []struct {
		name      string
		s         settleState
		done, nav bool
		popup     string
	}{
		{"không có gì đổi, trang yên", settleState{probe: quiet, ok: true, url: m.URL}, true, false, ""},
		{"DOM còn đổi", settleState{probe: settleProbe{Doc: "d1", Idle: 20, State: "complete"}, ok: true, url: m.URL}, false, false, ""},
		{"đã bắt đầu tải, document cũ còn", settleState{probe: quiet, ok: true, url: m.URL, started: true, loading: true}, false, true, ""},
		{"đang chuyển trang – chưa đọc được", settleState{url: m.URL, started: true}, false, true, ""},
		{"trang mới đã yên", settleState{probe: settleProbe{Doc: "d2", Idle: 120, State: "complete"}, ok: true, url: "https://a.vn/2", started: true}, true, true, ""},
		{"trang mới còn loading", settleState{probe: settleProbe{Doc: "d2", Idle: 500, State: "loading"}, ok: true, url: "https://a.vn/2", started: true}, false, true, ""},
		{"tải xong mà vẫn document cũ (tải file / 204)", settleState{probe: quiet, ok: true, url: m.URL, started: true}, true, false, ""},
		{"SPA đổi URL, không tải lại", settleState{probe: quiet, ok: true, url: "https://a.vn/#/don"}, true, true, ""},
		{"mở tab mới", settleState{probe: quiet, ok: true, url: m.URL, popup: "https://b.vn/"}, true, false, "https://b.vn/"},
		{"tab tự đóng", settleState{closed: true}, true, false, ""},
	}
	for _, c := range cases {
		done, eff := settleDone(m, c.s)
		if done != c.done || eff.Navigated != c.nav || eff.Popup != c.popup || eff.Settled != done {
			t.Errorf("%s: done %v nav %v popup %q settled %v – muốn %v %v %q", c.name, done, eff.Navigated, eff.Popup, eff.Settled, c.done, c.nav, c.popup)
		}
	}
}

func TestOpenedTab(t *testing.T) {
	m := Mark{Tabs: []string{"a", "b"}}
	if got := openedTab(m, []tabInfo{{ID: "c", URL: "https://moi.vn/"}, {ID: "a"}, {ID: "b"}}); got != "https://moi.vn/" {
		t.Errorf("tab mới: %q", got)
	}
	if got := openedTab(m, []tabInfo{{ID: "a"}}); got != "" {
		t.Errorf("không có tab mới: %q", got)
	}
}
