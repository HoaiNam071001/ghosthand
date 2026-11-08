package web

import (
	"context"
	"sync"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

// Mark / Settle của Chrome (bước 56 B2) – phần quyết định ở settle.go.

// navWatch – khung chính của tab bắt đầu / xong tải (Page.frameStartedLoading / Stopped): biết click đã kích điều
// hướng dù document cũ còn đứng đó chờ trang mới trả về.
type navWatch struct {
	mu      sync.Mutex
	started int
	loading bool
}

// listen gắn vào tab tctx (frame = id khung chính = id tab); dừng khi kết nối tab bị nhả.
func (w *navWatch) listen(tctx context.Context, frame string) {
	start := chromedp.Events(tctx, page.FrameStartedLoading)
	stop := chromedp.Events(tctx, page.FrameStoppedLoading)
	go func() {
		for e, err := range start {
			if err != nil {
				return
			}
			if string(e.FrameID) == frame {
				w.mu.Lock()
				w.started++
				w.loading = true
				w.mu.Unlock()
			}
		}
	}()
	go func() {
		for e, err := range stop {
			if err != nil {
				return
			}
			if string(e.FrameID) == frame {
				w.mu.Lock()
				w.loading = false
				w.mu.Unlock()
			}
		}
	}()
}

func (w *navWatch) state() (started int, loading bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.started, w.loading
}

// Mark đánh dấu tab sắp thao tác: lastFind = tab của lần Find (Scroll) gần nhất (webClick / webType), không thì tab
// theo bộ lọc như Keys.
func (c *Chrome) Mark(ctx context.Context, tab string, lastFind bool) (Mark, error) {
	var t *tabConn
	var err error
	if lastFind {
		c.mu.Lock()
		t, err = c.bgTab()
		c.mu.Unlock()
	} else {
		t, _, err = c.tabFor(ctx, tab)
	}
	if err != nil {
		return Mark{}, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	tabs, err := listTabs(ctx, c.port)
	if err != nil {
		return Mark{}, &BrowserError{"mất kết nối trình duyệt: " + err.Error()}
	}
	p, err := probeTab(ctx, t)
	if err != nil {
		return Mark{}, err
	}
	started, _ := t.nav.state()
	return Mark{Tab: t.id, URL: urlOf(tabs, t.id), Doc: p.Doc, Tabs: tabIDs(tabs), nav: started}, nil
}

// Settle chờ tab của m yên (tối đa settleCap) rồi báo điều hướng / tab mới. Hộp thoại JS mở thì thôi chờ (trang
// đứng tới khi hộp đóng – node web sau xử lý theo webDialog).
func (c *Chrome) Settle(ctx context.Context, m Mark) (Effect, error) {
	if err := sleepCtx(ctx, settleFirst); err != nil {
		return Effect{}, err
	}
	c.mu.Lock()
	t := c.tabs[m.Tab]
	c.mu.Unlock()
	if t == nil {
		return Effect{URL: m.URL}, nil
	}
	end := time.Now().Add(settleCap)
	eff := Effect{URL: m.URL}
	for t.dialogs.current() == nil {
		s, err := c.settleState(ctx, t, m)
		if err != nil {
			return eff, err
		}
		var done bool
		if done, eff = settleDone(m, s); done || time.Now().After(end) {
			return eff, nil
		}
		if err := sleepCtx(ctx, settlePoll); err != nil {
			return eff, err
		}
	}
	return eff, nil
}

// settleState – một lần hỏi: tab đang mở + probe tab (lỗi probe khi trang đang chuyển = chưa đọc được, không lỗi).
func (c *Chrome) settleState(ctx context.Context, t *tabConn, m Mark) (settleState, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	tabs, err := listTabs(ctx, c.port)
	if err != nil {
		return settleState{}, &BrowserError{"mất kết nối trình duyệt: " + err.Error()}
	}
	started, loading := t.nav.state()
	s := settleState{url: urlOf(tabs, t.id), popup: openedTab(m, tabs), loading: loading, started: started > m.nav}
	if s.closed = !contains(tabIDs(tabs), t.id); s.closed {
		return s, nil
	}
	s.probe, err = probeTab(ctx, t)
	if err != nil && ctx.Err() != nil {
		return s, ctx.Err()
	}
	s.ok = err == nil
	return s, nil
}

// probeTab – settleJS trên tab t, tối đa 1 s; hộp thoại JS đang mở / mở giữa chừng thì thôi (lệnh JS treo tới khi
// hộp đóng).
func probeTab(ctx context.Context, t *tabConn) (settleProbe, error) {
	if d := t.dialogs.current(); d != nil {
		return settleProbe{}, &BrowserError{"trang đang mở hộp thoại " + d.Type}
	}
	wctx, stop := t.dialogs.watch(ctx)
	defer stop()
	pctx, cancel := context.WithTimeout(wctx, time.Second)
	defer cancel()
	p, err := probeSettle(pctx, t.ctx)
	if err != nil && ctx.Err() != nil {
		return p, ctx.Err()
	}
	return p, err
}
