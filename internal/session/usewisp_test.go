package session

import (
	"testing"

	"ghosthand/internal/store"
)

func TestUseWisp(t *testing.T) {
	on, off := func() bool { return true }, func() bool { return false }
	cases := []struct {
		choice      string
		running     func() bool
		use, launch bool
	}{
		{store.WebBrowserAuto, on, true, false},   // Tự động: Wisp đang mở → Wisp, không tự mở lại
		{store.WebBrowserAuto, off, false, false}, // Tự động: Wisp tắt → Chrome của app
		{store.WebBrowserWisp, off, true, true},   // chọn Wisp: tự mở
		{store.WebBrowserChrome, on, false, false},
	}
	for _, c := range cases {
		if use, launch := UseWisp(c.choice, c.running); use != c.use || launch != c.launch {
			t.Errorf("UseWisp(%q) = %v %v, cần %v %v", c.choice, use, launch, c.use, c.launch)
		}
	}
}
