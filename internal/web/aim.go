package web

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/chromedp/cdproto/browser"
	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/chromedp"

	"ghosthand/internal/model"
)

// Trên tab thật, trước khi bấm (D0 / D2): đo toạ độ trang → màn hình, chờ khung phần tử đứng yên, thử hover điểm bấm.

// steadyGap – khoảng giữa 2 lần đọc khung khi chờ phần tử đứng yên.
const steadyGap = 100 * time.Millisecond

// steady đọc lại khung sau steadyGap; lệch quá 1 CSS px → Found.Moving (chưa bấm).
func steady(ctx, tctx context.Context, q Query, r0 findResult, tab string) (findResult, Found, error) {
	if err := sleepCtx(ctx, steadyGap); err != nil {
		return r0, Found{}, err
	}
	r, err := runFind(ctx, tctx, q)
	if err != nil {
		return r, Found{}, err
	}
	f := r.found(tab, q)
	if f.OK && !sameBox(r0, r) {
		f.OK, f.Moving = false, true
	}
	return r, f, nil
}

func sameBox(a, b findResult) bool {
	near := func(p, q float64) bool { return math.Abs(p-q) <= 1 }
	return a.Sel == b.Sel && a.Geom == b.Geom && near(a.X, b.X) && near(a.Y, b.Y) && near(a.W, b.W) && near(a.H, b.H)
}

func (c *Chrome) Hover(ctx context.Context, x, y int, onTarget bool) (Hover, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	t := c.last
	if t == nil || t.cal == nil {
		return Hover{Miss: "chưa đo toạ độ trang"}, nil
	}
	pr, ok, err := moveAndRead(ctx, c.move, tabProbe(t.ctx), x, y)
	if err != nil {
		return Hover{}, err
	}
	if !ok { // chuột không vào trang: thường do Dock / thanh menu che mép dưới / trên → cuộn phần tử vào giữa rồi thử lại
		if _, err := evalJS[bool](ctx, t.ctx, "cuộn tới phần tử", scrollCenterJS); err != nil {
			return Hover{}, err
		}
		return Hover{Miss: fmt.Sprintf("chuột tới (%d, %d) nhưng trang không nhận – bị Dock / thanh menu / cửa sổ khác che?", x, y)}, nil
	}
	want := t.cal.toClient(fpoint{float64(x), float64(y)})
	if d := math.Hypot(pr.at.X-want.X, pr.at.Y-want.Y); d > maxResidual {
		t.cal = nil // số đo cũ (cửa sổ dời mà trang không báo) – lần tìm sau đo lại
		return Hover{Miss: fmt.Sprintf("trang nhận chuột lệch %.0f px so với số đo – đo lại", d)}, nil
	}
	if onTarget && !pr.hit {
		return Hover{Miss: "dưới chuột là " + pr.cover + ", không phải phần tử cần bấm"}, nil
	}
	return Hover{OK: true}, nil
}

const scrollCenterJS = `(() => { const t = window.__acTarget;
	if (t) t.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'}); return !!t; })()`

// calibrate đưa tab lên trước rồi đo toạ độ trang → màn hình (calibrate.go).
func (c *Chrome) calibrate(ctx, tctx context.Context) (*calibration, error) {
	if err := bringToFront(ctx, tctx); err != nil {
		return nil, err
	}
	w, err := run(ctx, tctx, "đọc khung cửa sổ", func(ctx context.Context, t *chromedp.Target) (browser.GetWindowForTargetResult, error) {
		return cdp.Call(ctx, t, browser.GetWindowForTarget, browser.GetWindowForTargetParams{})
	})
	if err != nil {
		return nil, err
	}
	b := w.Bounds
	if b == nil || b.Left == nil || b.Top == nil {
		return nil, &BrowserError{"trình duyệt không báo vị trí cửa sổ (đang thu nhỏ?)"}
	}
	win := model.Rect{X: int(*b.Left), Y: int(*b.Top), W: int(b.Width), H: int(b.Height)}
	cal, err := measure(ctx, win, c.move, tabProbe(tctx))
	if err != nil {
		return nil, err
	}
	g, err := evalJS[geom](ctx, tctx, "đọc hình học trang", geomJS)
	if err != nil {
		return nil, err
	}
	cal.geom = g
	return &cal, nil
}

// tabProbe – đọc pointermove cuối trang nhận (probe.js).
func tabProbe(tctx context.Context) pageProbe {
	return func(ctx context.Context) (probeRead, error) {
		mv, err := evalJS[struct {
			X, Y float64
			N    int
			Hit  bool
			At   string
		}](ctx, tctx, "đọc chuột trong trang", pageJS(probeJS))
		return probeRead{n: mv.N, at: fpoint{mv.X, mv.Y}, hit: mv.Hit, cover: mv.At}, err
	}
}

const geomJS = `({ScreenX: screenX, ScreenY: screenY, OuterW: outerWidth, OuterH: outerHeight, InnerW: innerWidth, InnerH: innerHeight, DPR: devicePixelRatio})`
