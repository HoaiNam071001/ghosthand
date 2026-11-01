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

// Trang tự dò dấu vết điều khiển: getter stack của lỗi chỉ chạy khi DevTools (Runtime bật) đọc tham số console.
const stealthPage = `<!doctype html><html><head><meta charset="utf-8"><title>Sân thử dấu vết</title></head><body>
<button id="b">Gửi</button><iframe srcdoc='<button>Trong khung</button>'></iframe>
<script>
window.__hit = false;
setInterval(() => { const e = new Error(); Object.defineProperty(e, 'stack', { get() { window.__hit = true; return ''; } }); console.debug(e); }, 50);
</script></body></html>`

// Sau khi app tìm phần tử (cả trong iframe): trang không thấy Runtime bật, không thấy biến / cờ của app, webdriver tắt.
// Chỉ khi GHOSTHAND_REAL=1.
func TestRealStealth(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để thử với Chrome thật")
	}
	page := filepath.Join(t.TempDir(), "stealth.html")
	if err := os.WriteFile(page, []byte(stealthPage), 0o644); err != nil {
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
	for _, v := range []string{"Gửi", "Trong khung"} {
		f, err := c.Find(ctx, Query{Tab: "stealth.html", CheckOnly: true, Selectors: []model.Selector{{By: "text", Value: v}}})
		if err != nil || !f.OK {
			t.Fatalf("tìm %q: %+v %v", v, f, err)
		}
	}
	time.Sleep(300 * time.Millisecond) // vài nhịp console.debug sau khi nối
	tab, _, err := c.tabFor(ctx, "stealth.html")
	if err != nil {
		t.Fatal(err)
	}
	// world chính của trang (không qua evalJS)
	got, err := run(ctx, tab.ctx, "đọc dấu vết", chromedp.Evaluate[struct {
		Hit, Webdriver, DocFlag bool
		Keys                    []string
	}](`({Hit: window.__hit, Webdriver: navigator.webdriver, DocFlag: '__acDownHook' in document,
		Keys: Object.keys(window).filter(k => k.startsWith('__ac'))})`))
	if err != nil {
		t.Fatal(err)
	}
	if got.Hit || got.Webdriver || got.DocFlag || len(got.Keys) > 0 {
		t.Errorf("trang thấy dấu vết: %+v", got)
	}
}
