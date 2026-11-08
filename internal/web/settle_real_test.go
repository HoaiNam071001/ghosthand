package web

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/model"
)

const settlePageA = `<!doctype html><html><head><meta charset="utf-8"><title>Trang A</title></head><body>
<button id="more">Tải thêm</button> <button id="pop">Mở tab</button> <a id="go" href="settle-b.html">Sang B</a>
<button id="spa">Đổi URL</button> <button id="clock">Đồng hồ</button>
<div id="list"></div><span id="t">0</span>
<script>
// thêm 5 dòng, mỗi dòng cách 60 ms – Settle phải chờ đủ cả 5
document.getElementById('more').onclick = () => { let i = 0; const add = () => { const d = document.createElement('div');
  d.className = 'row'; d.textContent = 'dòng ' + i; document.getElementById('list').append(d); if (++i < 5) setTimeout(add, 60); }; setTimeout(add, 60); };
document.getElementById('pop').onclick = () => window.open('settle-b.html?pop=1');
document.getElementById('spa').onclick = () => history.pushState({}, '', '#/don');
// đổi chữ liên tục (không thêm / bớt phần tử) – không được làm Settle chờ tới trần
document.getElementById('clock').onclick = () => setInterval(() => { document.getElementById('t').textContent = Date.now(); }, 20);
</script></body></html>`

const settlePageB = `<!doctype html><html><head><meta charset="utf-8"><title>Trang B</title></head><body><h1>B</h1></body></html>`

// Mark / Settle trên Chrome thật (56 B2): DOM đang dựng thêm thì chờ, tab mới, sang trang, SPA đổi URL, chữ đổi liên tục.
// Chỉ khi GHOSTHAND_REAL=1.
func TestRealSettle(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để thử với Chrome thật")
	}
	dir := t.TempDir()
	for name, html := range map[string]string{"settle-a.html": settlePageA, "settle-b.html": settlePageB} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(html), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	c := NewChrome(filepath.Join(os.TempDir(), "ghosthand-test-browser"), func(int, int) error { return nil })
	defer c.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	open := func() {
		if _, err := c.CheckPage(ctx, "file:///"+filepath.ToSlash(filepath.Join(dir, "settle-a.html"))); err != nil {
			t.Fatal(err)
		}
	}
	click := func(css string) Effect {
		f, err := c.Find(ctx, Query{Selectors: []model.Selector{{By: model.SelCSS, Value: css}}, Scroll: true, Background: true})
		if err != nil || !f.OK {
			t.Fatalf("%s: %+v %v", css, f, err)
		}
		m, err := c.Mark(ctx, "", true)
		if err != nil {
			t.Fatal(err)
		}
		r := f.Rect
		start := time.Now()
		if err := c.BgClick(ctx, r.X+r.W/2, r.Y+r.H/2, "left", 1); err != nil {
			t.Fatal(err)
		}
		eff, err := c.Settle(ctx, m)
		if err != nil {
			t.Fatal(err)
		}
		t.Logf("%s: %+v sau %v", css, eff, time.Since(start))
		return eff
	}
	open()
	if eff := click("#more"); eff.Navigated || !eff.Settled {
		t.Errorf("tải thêm: %+v", eff)
	}
	rows, err := evalJS[int](ctx, c.last.ctx, "đếm", `document.querySelectorAll('.row').length`)
	if err != nil || rows != 5 {
		t.Errorf("Settle trả khi mới có %d / 5 dòng (%v)", rows, err)
	}
	if eff := click("#spa"); !eff.Navigated || !strings.HasSuffix(eff.URL, "#/don") {
		t.Errorf("SPA đổi URL: %+v", eff)
	}
	start := time.Now()
	if eff := click("#clock"); !eff.Settled || time.Since(start) > 2*time.Second {
		t.Errorf("chữ đổi liên tục làm chờ tới trần: %+v", eff)
	}
	if eff := click("#pop"); !strings.Contains(eff.Popup, "settle-b.html") || eff.Navigated {
		t.Errorf("mở tab: %+v", eff)
	}
	open()
	if eff := click("#go"); !eff.Navigated || !strings.Contains(eff.URL, "settle-b.html") || !eff.Settled {
		t.Errorf("sang trang: %+v", eff)
	}
}
