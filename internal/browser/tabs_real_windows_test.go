package browser

import (
	"context"
	"os"
	"os/exec"
	"slices"
	"testing"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
)

// Điều khiển trình duyệt thật – GHOSTHAND_REAL=1 (GHOSTHAND_BROWSER = chrome | edge…, mặc định chrome). Chỉ đụng tab test
// tự mở (mở → đi tới URL → tải lại → đóng) và trả tab đang hiện về như cũ.
func TestRealTabs(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để chạy với trình duyệt thật")
	}
	b := os.Getenv("GHOSTHAND_BROWSER")
	if b == "" {
		b = model.BrowserChrome
	}
	ctx := context.Background()
	var s System
	before, err := s.Tabs(ctx, b)
	if err != nil || len(before) == 0 {
		t.Fatalf("cần trình duyệt %s đang mở: %v (%d tab)", b, err, len(before))
	}
	orig := before[model.ActiveTab(before)]
	t.Logf("tab đang hiện: %+v (%d tab)", orig, len(before))

	nt, err := s.NewTab(ctx, b, "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("tab mới: %+v", nt)
	defer func() {
		if err := s.Close(ctx, nt); err != nil {
			t.Errorf("đóng tab test: %v", err)
		}
		time.Sleep(300 * time.Millisecond)
		if err := s.Activate(ctx, orig); err != nil {
			t.Errorf("trả tab cũ: %v", err)
		}
	}()

	waitTab := func(want func(model.TabInfo) bool) model.TabInfo {
		for i := 0; i < 60; i++ {
			tabs, err := s.Tabs(ctx, b)
			if err != nil {
				t.Fatal(err)
			}
			for _, x := range tabs {
				if x.ID == nt.ID && want(x) {
					return x
				}
			}
			time.Sleep(250 * time.Millisecond)
		}
		t.Fatalf("hết giờ chờ tab")
		return model.TabInfo{}
	}
	got := waitTab(func(x model.TabInfo) bool { return !x.Loading && x.Title != "" && x.Active })
	t.Logf("sau mở: %+v", got)

	if err := s.Go(ctx, got, "https://example.org"); err != nil {
		t.Fatal(err)
	}
	got = waitTab(func(x model.TabInfo) bool { return x.URL == "https://example.org/" || x.URL == "https://example.org" })
	t.Logf("sau đi tới: %+v", got)

	if err := s.Nav(ctx, got, model.TabReload); err != nil {
		t.Fatal(err)
	}
	if err := s.Nav(ctx, got, model.TabBack); err != nil {
		t.Fatal(err)
	}
	got = waitTab(func(x model.TabInfo) bool {
		return !x.Loading && x.URL != "https://example.org" && x.URL != "https://example.org/"
	})
	t.Logf("sau quay lại: %+v", got)

	fr, err := s.Frame(ctx, got)
	t.Logf("khung: %+v %v", fr, err)
}

// Chuẩn hoá cửa sổ trình duyệt thật: mở cửa sổ riêng, F11, thoát toàn màn hình + đặt khung + zoom, rồi đóng cửa sổ đó.
func TestRealNormalize(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để chạy với trình duyệt thật")
	}
	ctx := context.Background()
	var s System
	before, _ := browserWindows("chrome")
	if len(before) == 0 {
		t.Fatal("cần Chrome đang mở")
	}
	if err := exec.Command(before[0].AppID, "--new-window", "about:blank").Start(); err != nil {
		t.Fatal(err)
	}
	var win model.WindowInfo
	for i := 0; i < 40 && win.ID == 0; i++ {
		time.Sleep(200 * time.Millisecond)
		now, _ := browserWindows("chrome")
		for _, w := range now {
			if !slices.ContainsFunc(before, func(x model.WindowInfo) bool { return x.ID == w.ID }) {
				win = w
			}
		}
	}
	if win.ID == 0 {
		t.Fatal("không thấy cửa sổ mới")
	}
	defer device.SystemWindows{}.Close(win.ID)
	pick := func() model.TabInfo {
		tabs, _ := s.Tabs(ctx, "chrome")
		for _, x := range tabs {
			if x.Window == int64(win.ID) {
				return x
			}
		}
		t.Fatal("cửa sổ test không có tab")
		return model.TabInfo{}
	}
	tab := pick()
	if err := s.Activate(ctx, tab); err != nil {
		t.Fatal(err)
	}
	if err := tapKeys("f11"); err != nil {
		t.Fatal(err)
	}
	time.Sleep(1500 * time.Millisecond)
	tab = pick()
	fr, _ := s.Frame(ctx, tab)
	t.Logf("sau F11: tab=%+v frame=%+v", tab, fr)
	if !fr.Fullscreen {
		t.Fatalf("muốn toàn màn hình")
	}
	r := model.Rect{X: 200, Y: 150, W: 1000, H: 700}
	was, err := s.Normalize(ctx, tab, model.NormalizeOpts{Fullscreen: true, Zoom: true, Popups: true, Bounds: &r})
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(300 * time.Millisecond)
	tab = pick()
	fr, _ = s.Frame(ctx, tab)
	t.Logf("sau chuẩn hoá: was=%v tab=%+v frame=%+v", was, tab, fr)
	if !was || fr.Fullscreen || abs(fr.Box.W-r.W) > 20 || abs(fr.Box.H-r.H) > 20 {
		t.Errorf("khung sai: %+v", fr)
	}
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
