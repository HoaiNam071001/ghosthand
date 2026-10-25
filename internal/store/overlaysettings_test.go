package store

import "testing"

func TestBarSide(t *testing.T) {
	for in, want := range map[string]string{"": BarTop, "top": BarTop, "left": BarLeft, "right": BarRight, "bottom": BarBottom, "x": BarTop} {
		if got := (OverlaySettings{Toolbar: in}).BarSide(); got != want {
			t.Errorf("BarSide(%q) = %q, muốn %q", in, got, want)
		}
	}
}

func TestSetOverlayRejectsUnknown(t *testing.T) {
	if err := SetOverlay(OverlaySettings{Toolbar: "diagonal"}); err == nil {
		t.Error("cạnh lạ phải báo lỗi")
	}
}
