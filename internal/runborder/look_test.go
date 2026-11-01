package runborder

import "testing"

func TestLookFor(t *testing.T) {
	if l, ok := LookFor("acting"); !ok || !l.Pulse {
		t.Errorf("đang thao tác: %+v %v", l, ok)
	}
	if w, _ := LookFor("waiting"); w.Alpha >= 0.95 || w.Pulse {
		t.Errorf("đang chờ phải mờ, không nhịp: %+v", w)
	}
	if p, _ := LookFor("paused"); p.R != 0xFA || p.G != 0xCC {
		t.Errorf("tạm dừng phải vàng: %+v", p)
	}
	for _, d := range []string{"done", "failed", "stopped", ""} {
		if _, ok := LookFor(d); ok {
			t.Errorf("%q vẫn hiện viền", d)
		}
	}
	if Px("") != 4 || Px(Medium) != 8 || Px(Off) != 0 {
		t.Error("độ dày sai")
	}
}
