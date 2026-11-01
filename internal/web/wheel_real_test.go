package web

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/chromedp/chromedp"

	"ghosthand/internal/model"
)

const wheelPage = `<!doctype html><html><head><meta charset="utf-8"><title>Sân thử lăn</title></head><body style="margin:0">
<div id="box" style="height:200px;width:300px;overflow:auto"><div style="height:1500px"></div><button>Trong hộp</button></div>
<div id="row" style="width:300px;overflow-x:auto;white-space:nowrap"><span style="display:inline-block;width:1200px"></span><button>Bên phải</button></div>
<iframe style="height:200px;width:300px" srcdoc='<div style="height:1500px"></div><button>Trong khung</button>'></iframe>
<div style="height:3000px"></div><button>Cuối trang</button>
</body></html>`

// find.js với wheel: phần tử ngoài khung nhìn → trả đúng khung cuộn để lăn (hộp cuộn / dải ngang / iframe / cả trang),
// không tự nhảy. Chỉ khi GHOSTHAND_REAL=1.
func TestRealWheelHint(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để thử với Chrome thật")
	}
	page := filepath.Join(t.TempDir(), "wheel.html")
	if err := os.WriteFile(page, []byte(wheelPage), 0o644); err != nil {
		t.Fatal(err)
	}
	c := NewChrome(filepath.Join(os.TempDir(), "ghosthand-test-browser"), func(int, int) error { return nil })
	defer c.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	if err := c.Open(ctx, "file://"+page); err != nil {
		t.Fatal(err)
	}
	time.Sleep(time.Second)
	tab, _, err := c.tabFor(ctx, "wheel.html")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		text, dir string
		inBox     func(w wheelBox) bool // vùng đặt chuột (toạ độ client)
	}{
		{"Trong hộp", "down", func(w wheelBox) bool { return w.X == 0 && w.Y == 0 && w.W <= 300 && w.H <= 200 }},
		{"Bên phải", "right", func(w wheelBox) bool { return w.Y >= 200 && w.W <= 300 }},
		{"Trong khung", "down", func(w wheelBox) bool { return w.Y > 200 && w.W <= 300 && w.H <= 200 }},
		{"Cuối trang", "down", func(w wheelBox) bool { return w.X == 0 && w.Y == 0 && w.W > 300 }},
	}
	for _, cs := range cases {
		r, err := runFind(ctx, tab.ctx, Query{Scroll: true, Wheel: true, Selectors: []model.Selector{{By: "text", Value: cs.text}}})
		if err != nil {
			t.Fatal(err)
		}
		if r.Sel != 0 || r.InView || r.Wheel == nil || r.Wheel.Dir != cs.dir || r.Wheel.Px <= 0 || !cs.inBox(*r.Wheel) {
			t.Errorf("%s: %+v wheel %+v", cs.text, r, r.Wheel)
		}
	}
	// không nhảy: trang và các hộp vẫn ở đầu
	moved, err := evalJS[bool](ctx, tab.ctx, "đọc cuộn", `scrollY > 0 || document.getElementById('box').scrollTop > 0`)
	if err != nil || moved {
		t.Errorf("trang đã bị cuộn: %v %v", moved, err)
	}
	// không Wheel: nhảy như cũ
	r, err := runFind(ctx, tab.ctx, Query{Scroll: true, Selectors: []model.Selector{{By: "text", Value: "Cuối trang"}}})
	if err != nil || !r.InView || r.Wheel != nil {
		t.Errorf("không Wheel phải nhảy tới: %+v %v", r, err)
	}
	_, _ = run(ctx, tab.ctx, "về đầu", chromedp.Evaluate[bool](`scrollTo(0, 0) || true`))
}
