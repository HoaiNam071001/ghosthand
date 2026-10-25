package web

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	goruntime "runtime"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/target"
	"github.com/chromedp/chromedp"
	"github.com/chromedp/chromedp/remote"
)

// Chrome – Browser thật: Chrome / Edge / Brave của app (profile riêng) qua CDP. Nối lười ở lần dùng đầu; một bản cho
// mỗi lần chạy kịch bản.
type Chrome struct {
	profile string
	move    mover

	mu     sync.Mutex
	port   int
	alloc  context.Context
	cancel context.CancelFunc
	tabs   map[string]*tabConn
	prefer string    // tab vừa mở bằng Open – mặc định của node web không lọc tab
	last   *tabConn  // tab của lần Find (Scroll) thấy gần nhất – Hover dùng
	checks checkMemo // kết quả Thử trang gần nhất theo URL (checkmemo.go)
}

type tabConn struct {
	id       string
	ctx      context.Context
	cancel   context.CancelFunc
	cal      *calibration // nil = chưa đo / phải đo lại
	focusEmu bool         // đã bật giả lập focus (chạy nền)
}

// NewChrome – profile: thư mục profile riêng của app; move: di chuột thật (đo toạ độ).
func NewChrome(profile string, move func(x, y int) error) *Chrome {
	return &Chrome{profile: profile, move: move, tabs: map[string]*tabConn{}}
}

// launchTimeout – chờ trình duyệt vừa bật mở cổng điều khiển (lần đầu tạo profile chậm hơn).
const launchTimeout = 20 * time.Second

// connect nối vào trình duyệt của profile đang mở; chưa mở → ErrNoBrowser.
func (c *Chrome) connect(ctx context.Context) (int, error) {
	if c.port != 0 {
		if _, err := listTabs(ctx, c.port); err == nil {
			return c.port, nil
		}
		c.reset() // trình duyệt đã tắt / mất kết nối
	}
	port, err := activePort(c.profile)
	if err != nil {
		return 0, ErrNoBrowser
	}
	if _, err := listTabs(ctx, port); err != nil {
		return 0, ErrNoBrowser // file cổng còn sót từ lần trước, trình duyệt đã tắt
	}
	c.port = port
	c.alloc, c.cancel = remote.NewAllocator(context.Background(), fmt.Sprintf("http://127.0.0.1:%d", port))
	return port, nil
}

// reset bỏ mọi kết nối (không đóng tab / trình duyệt).
func (c *Chrome) reset() {
	for id, t := range c.tabs {
		t.cancel()
		delete(c.tabs, id)
	}
	if c.cancel != nil {
		c.cancel()
	}
	c.port, c.alloc, c.cancel = 0, nil, nil
}

func (c *Chrome) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reset()
}

func (c *Chrome) Open(ctx context.Context, u string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	port, err := c.connect(ctx)
	if errors.Is(err, ErrNoBrowser) {
		return c.launch(ctx, u)
	}
	if err != nil {
		return err
	}
	id, err := newTab(ctx, port, u)
	if err != nil {
		return &BrowserError{fmt.Sprintf("không mở được tab mới: %v", err)}
	}
	c.prefer = id
	return devtools(ctx, port, http.MethodGet, "activate/"+id, nil)
}

// launch bật trình duyệt mới với profile của app, mở u ở tab đầu.
func (c *Chrome) launch(ctx context.Context, u string) error {
	bin, err := findBrowser(goruntime.GOOS)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(c.profile, 0o755); err != nil {
		return err
	}
	_ = os.Remove(filepath.Join(c.profile, "DevToolsActivePort")) // file sót – không nhầm cổng cũ
	if err := startBrowser(bin, launchArgs(c.profile, u)); err != nil {
		return err
	}
	if _, err := waitPort(ctx, c.profile, launchTimeout); err != nil {
		return err
	}
	port, err := c.connect(ctx)
	if err != nil {
		return err
	}
	tabs, err := listTabs(ctx, port)
	if err != nil || len(tabs) == 0 {
		return &BrowserError{"trình duyệt đã bật nhưng chưa có tab nào"}
	}
	c.prefer = tabs[0].ID // tab của url vừa mở đứng đầu (vừa dùng)
	return nil
}

// tab – kết nối CDP tới tab id (tạo một lần, nhả khi tab không còn).
func (c *Chrome) tab(id string, alive []tabInfo) (*tabConn, error) {
	for tid, t := range c.tabs {
		if !hasTab(alive, tid) {
			t.cancel()
			delete(c.tabs, tid)
		}
	}
	if t, ok := c.tabs[id]; ok {
		return t, nil
	}
	ctx, cancel := chromedp.NewContext(c.alloc, chromedp.WithTargetID(target.ID(id)), chromedp.WithDetachOnCancel())
	// Lần Run đầu gắn phiên tab vào context được truyền – phải là ctx gốc (context có timeout của run() hết là mất phiên).
	if err := chromedp.Do(ctx); err != nil {
		cancel()
		return nil, browserErr("nối vào tab", err)
	}
	t := &tabConn{id: id, ctx: ctx, cancel: cancel}
	c.tabs[id] = t
	return t, nil
}

func hasTab(tabs []tabInfo, id string) bool {
	for _, t := range tabs {
		if t.ID == id {
			return true
		}
	}
	return false
}

func (c *Chrome) Find(ctx context.Context, q Query) (Found, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	port, err := c.connect(ctx)
	if err != nil {
		return Found{}, err
	}
	tabs, err := listTabs(ctx, port)
	if err != nil {
		return Found{}, &BrowserError{fmt.Sprintf("mất kết nối trình duyệt: %v", err)}
	}
	ti, ok := pickTab(tabs, q.Tab, c.prefer)
	if !ok {
		return Found{Selector: -1, NoTab: true}, nil
	}
	t, err := c.tab(ti.ID, tabs)
	if err != nil {
		return Found{}, err
	}
	r, err := runFind(ctx, t.ctx, q)
	if err != nil {
		return Found{}, err
	}
	f := r.found(ti.URL, q)
	if !f.OK || q.CheckOnly {
		return f, nil
	}
	if q.Background {
		return c.findBackground(ctx, t, q, r, f)
	}
	if q.Scroll && !(r.Focus && r.Visible) { // sắp bấm: tab / cửa sổ phải ở trên cùng (D0: Page.bringToFront đủ)
		if err := bringToFront(ctx, t.ctx); err != nil {
			return Found{}, err
		}
		if r, err = runFind(ctx, t.ctx, q); err != nil {
			return Found{}, err
		}
		if f = r.found(ti.URL, q); !f.OK {
			return f, nil
		}
	}
	if t.cal == nil || t.cal.geom != r.Geom {
		if t.cal, err = c.calibrate(ctx, t.ctx); err != nil {
			return Found{}, err
		}
		if r, err = runFind(ctx, t.ctx, q); err != nil { // đo xong đọc lại khung (chuột đi qua có thể làm trang đổi)
			return Found{}, err
		}
		if f = r.found(ti.URL, q); !f.OK {
			return f, nil
		}
	}
	if q.Scroll { // sắp bấm: khung phải đứng yên (đọc lại sau một nhịp – cũng là đo lại ngay trước khi di chuột)
		if r, f, err = steady(ctx, t.ctx, q, r, ti.URL); err != nil || !f.OK {
			return f, err
		}
		c.last = t
	}
	f.Rect = t.cal.rectToScreen(r.X, r.Y, r.W, r.H)
	return f, nil
}

func bringToFront(ctx, tctx context.Context) error {
	_, err := run(ctx, tctx, "đưa tab lên trước", func(ctx context.Context, t *chromedp.Target) (cdp.Empty, error) {
		return cdp.Call(ctx, t, page.BringToFront, cdp.Empty{})
	})
	if err != nil {
		return err
	}
	return sleepCtx(ctx, 300*time.Millisecond) // cửa sổ kịp lên trên (D0)
}

// browserErr – lỗi CDP thành BrowserError; lỗi JS trong trang (selector CSS / XPath sai…) thành QueryError.
func browserErr(what string, err error) error {
	if err == nil {
		return nil
	}
	var exc *chromedp.ExceptionError
	if errors.As(err, &exc) {
		return &QueryError{fmt.Sprintf("%s: %s", what, exc.Error())}
	}
	if errors.Is(err, context.Canceled) {
		return err
	}
	return &BrowserError{fmt.Sprintf("%s: %v", what, err)}
}
