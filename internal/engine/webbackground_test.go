package engine

import (
	"context"
	"reflect"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Chạy nền (D4b): bấm / gõ / lăn qua trình duyệt, không đụng chuột / phím thật, không thử hover.
func TestWebBackgroundClick(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})}}
	in, res, err := runWeb(t, b, webNode(model.StepWebClick, func(s *model.Step) { s.WebBackground, s.Clicks, s.Button = true, 2, "right" }))
	if err != nil {
		t.Fatal(err)
	}
	if !b.queries[0].Background || !b.queries[0].Scroll {
		t.Errorf("query %+v", b.queries[0])
	}
	if want := []string{"click 120,210 right 1", "click 120,210 right 2"}; !reflect.DeepEqual(b.bg, want) {
		t.Errorf("chạy nền %q, muốn %q", b.bg, want)
	}
	if len(in.Lines()) != 0 || len(b.hovered) != 0 || res[0].Output["clickX"] != 120 {
		t.Errorf("chuột thật %q, hover %q, output %v", in.Lines(), b.hovered, res[0].Output)
	}
}

func TestWebBackgroundType(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})}}
	in, _, err := runWeb(t, b, webNode(model.StepWebType, func(s *model.Step) {
		s.WebBackground, s.Text, s.WebClear, s.WebEnter = true, "ab", true, true
	}))
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"click 120,210 left 1", `type "ab" true true`}; !reflect.DeepEqual(b.bg, want) || b.nFocus != 1 || len(in.Lines()) != 0 {
		t.Errorf("chạy nền %q, focus %d, chuột / phím thật %q", b.bg, b.nFocus, in.Lines())
	}
}

func TestWebBackgroundScroll(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})}}
	in, _, err := runWeb(t, b, webNode(model.StepWebScroll, func(s *model.Step) {
		s.WebBackground, s.ScrollMode, s.Direction, s.Amount = true, model.ScrollModeIn, "up", 2
	}))
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"wheel 120,210 up", "wheel 120,210 up"}; !reflect.DeepEqual(b.bg, want) || len(in.Lines()) != 0 {
		t.Errorf("chạy nền %q, chuột thật %q", b.bg, in.Lines())
	}
	// tới khi thấy: khung nhìn tìm chạy nền, lăn qua trình duyệt
	view := web.Found{OK: true, Selector: 0, Rect: model.Rect{W: 800, H: 600}}
	b = &fakeBrowser{finds: []web.Found{missing, view, found(0, model.Rect{X: 10, Y: 300, W: 30, H: 40})}}
	in, _, err = runWeb(t, b, webNode(model.StepWebScroll, func(s *model.Step) {
		s.WebBackground, s.ScrollMode, s.Direction, s.Amount, s.TimeoutMs = true, model.ScrollModeUntil, "down", 1, 2000
	}))
	if err != nil {
		t.Fatal(err)
	}
	if !b.queries[0].Background || !b.queries[1].Background || !reflect.DeepEqual(b.bg, []string{"wheel 400,300 down"}) || len(in.Lines()) != 0 {
		t.Errorf("query %+v / %+v, chạy nền %q, chuột %q", b.queries[0], b.queries[1], b.bg, in.Lines())
	}
}

// Thử tìm của node chạy nền vẫn lấy toạ độ màn hình (khung vẽ trên overlay).
func TestFindElementIgnoresBackground(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{W: 10, H: 10})}}
	e := New(nil, model.Script{}, Options{Browser: b})
	if _, err := e.FindElement(context.Background(), webNode(model.StepWebClick, func(s *model.Step) { s.WebBackground = true })); err != nil {
		t.Fatal(err)
	}
	if b.queries[0].Background {
		t.Errorf("query %+v", b.queries[0])
	}
}

// nativeBrowser – trình duyệt tự thao tác bằng sự kiện thật (Wisp, bước 62).
type nativeBrowser struct{ *fakeBrowser }

func (nativeBrowser) NativeInput() bool { return true }

// Trình duyệt Native: node web không bật chạy nền vẫn đi qua Bg*, không chuột thật / hover.
func TestWebNativeBrowserRunsInBackground(t *testing.T) {
	fb := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})}}
	in, _, err := runWeb(t, nativeBrowser{fb}, webNode(model.StepWebClick, nil))
	if err != nil {
		t.Fatal(err)
	}
	if !fb.queries[0].Background || !reflect.DeepEqual(fb.bg, []string{"click 120,210 left 1"}) || len(in.Lines()) != 0 || len(fb.hovered) != 0 {
		t.Errorf("query %+v, chạy nền %q, chuột thật %q, hover %q", fb.queries[0], fb.bg, in.Lines(), fb.hovered)
	}
}
