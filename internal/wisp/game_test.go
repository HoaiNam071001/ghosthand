package wisp

import "testing"

func TestGameArea(t *testing.T) {
	sr := &screenRect{rect: rect{X: 100, Y: 50, W: 1000, H: 600}, Scale: 2}
	r, err := gameArea(frameResult{ScreenRect: sr}, false)
	if err != nil || r.X != 100 || r.W != 1000 {
		t.Fatalf("macOS giữ DIP: %v %v", r, err)
	}
	if r, _ = gameArea(frameResult{ScreenRect: sr}, true); r.X != 200 || r.W != 2000 || r.H != 1200 {
		t.Errorf("Windows nhân tỉ lệ: %v", r)
	}
	for name, f := range map[string]frameResult{
		"không khung": {}, "thu nhỏ": {ScreenRect: sr, Hidden: true},
		"tab nền": {ScreenRect: &screenRect{rect: sr.rect, Offscreen: true}},
	} {
		if _, err := gameArea(f, false); err == nil {
			t.Errorf("%s phải báo lỗi", name)
		}
	}
}
