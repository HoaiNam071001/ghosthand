//go:build darwin

package device

import "testing"

// Chạy thật trên máy Mac (không đổi gì): danh sách cửa sổ / app đọc được, vùng làm việc hợp lý.
func TestDarwinWindowsList(t *testing.T) {
	ws, err := SystemWindows{}.List()
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("%d cửa sổ", len(ws))
	for _, w := range ws {
		if w.ID == 0 || w.PID == 0 || w.App == "" {
			t.Errorf("cửa sổ thiếu id / pid / app: %+v", w)
		}
		if !w.Minimized && (w.Box.W <= 0 || w.Box.H <= 0) {
			t.Errorf("cửa sổ đang hiện mà khung rỗng: %+v", w)
		}
	}
	apps, err := SystemApps{}.List()
	if err != nil || len(apps) == 0 {
		t.Fatalf("apps = %v, %v", apps, err)
	}
	if wa := (SystemWindows{}).WorkArea(MainScreen()); wa.W <= 0 || wa.H <= 0 || wa.H > MainScreen().H {
		t.Errorf("WorkArea = %+v", wa)
	}
}

func TestDarwinWindowGone(t *testing.T) {
	if err := (SystemWindows{}).Focus(0xFFFFFFF0); err == nil {
		t.Error("id không có phải báo lỗi")
	}
}
