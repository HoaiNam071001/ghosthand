//go:build windows

package runborder

import (
	"testing"
	"time"
	"unsafe"
)

// Viền thật: cửa sổ layered hiện đúng khung màn, click xuyên, ẩn lại được. Chỉ chạy được trên máy có màn hình.
func TestShowHideWindow(t *testing.T) {
	look, _ := LookFor("acting")
	Show(100, 100, 4, look)
	time.Sleep(300 * time.Millisecond)
	proc := user32.NewProc("GetWindowRect")
	vis := user32.NewProc("IsWindowVisible")
	var r rect
	proc.Call(hwnd, uintptr(unsafe.Pointer(&r)))
	if v, _, _ := vis.Call(hwnd); v == 0 || r.R-r.L < 800 || r.B-r.T < 600 {
		t.Fatalf("viền chưa hiện đúng: visible=%d rect=%+v", v, r)
	}
	ex := user32.NewProc("GetWindowLongW")
	if st, _, _ := ex.Call(hwnd, ^uintptr(19)); st&wsExTransp == 0 || st&wsExNoActivate == 0 { // GWL_EXSTYLE = -20
		t.Errorf("thiếu style click xuyên / không focus: %#x", st)
	}
	Hide()
	time.Sleep(200 * time.Millisecond)
	if v, _, _ := vis.Call(hwnd); v != 0 {
		t.Error("Hide mà viền vẫn hiện")
	}
}
