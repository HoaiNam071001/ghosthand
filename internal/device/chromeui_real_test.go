//go:build windows

package device

import (
	"os"
	"testing"
	"time"
)

// Đọc giao diện trình duyệt thật (chỉ đọc) – GHOSTHAND_REAL=1.
func TestRealChromeUI(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để chạy với trình duyệt thật")
	}
	wins, err := SystemWindows{}.List()
	if err != nil {
		t.Fatal(err)
	}
	for _, w := range wins {
		if w.App != "chrome" && w.App != "msedge" && w.App != "brave" && w.App != "browser" {
			continue
		}
		start := time.Now()
		cw, err := ReadChromeWindow(w.ID)
		t.Logf("%s %d %q box=%v min=%v -> %d tab, addr=%q loading=%v err=%v (%v)", w.App, w.ID, w.Title, w.Box, w.Minimized, len(cw.Tabs), cw.Address, cw.Loading, err, time.Since(start))
		for _, tb := range cw.Tabs {
			t.Logf("   %d sel=%v %q", tb.ID, tb.Selected, tb.Name)
		}
	}
}
