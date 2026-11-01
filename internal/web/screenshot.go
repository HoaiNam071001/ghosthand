package web

import (
	"bytes"
	"context"
	"image"
	"image/png"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

// TabShot – ảnh khung nhìn của một tab (46 B4, MCP screenshot webTab): chụp qua CDP nên đúng tab đó kể cả khi Chrome
// bị che / tab không ở trước. CSSWidth – bề rộng khung nhìn theo CSS px (đổi px ảnh → toạ độ trong trang).
type TabShot struct {
	Image    image.Image
	Tab      string // id tab
	URL      string
	CSSWidth int
}

// Screenshot chụp tab (id / URL / tiêu đề chứa; "" = tab đang hiện). Không bật trình duyệt nếu chưa mở.
func (c *Chrome) Screenshot(ctx context.Context, tab string) (TabShot, error) {
	t, url, err := c.activeTabFor(ctx, tab)
	if err != nil {
		return TabShot{}, err
	}
	_ = t.emulateFocus(ctx) // tab sau / cửa sổ bị che: trang vẫn vẽ như đang được xem
	r, err := run(ctx, t.ctx, "chụp tab", func(ctx context.Context, tg *chromedp.Target) (page.CaptureScreenshotResult, error) {
		return cdp.Call(ctx, tg, page.CaptureScreenshot, page.CaptureScreenshotParams{Format: page.CaptureScreenshotFormatPng})
	})
	if err != nil {
		return TabShot{}, err
	}
	img, err := png.Decode(bytes.NewReader(r.Data))
	if err != nil {
		return TabShot{}, err
	}
	w, err := evalJS[int](ctx, t.ctx, "đọc bề rộng trang", "innerWidth")
	if err != nil {
		return TabShot{}, err
	}
	return TabShot{Image: img, Tab: t.id, URL: url, CSSWidth: w}, nil
}
