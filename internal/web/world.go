package web

import (
	"context"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

// Bớt dấu vết điều khiển (bước 36): script của app chạy trong isolated world riêng (như content script của extension) –
// biến window.__ac*, cờ gắn trên document, listener của app trang không đọc được; DOM và sự kiện vẫn chung. Runtime
// tắt ngay sau khi nối tab: chromedp bật nó khi attach, trang dò được qua console.debug(lỗi có getter stack).

// worldName – cùng tên thì Chrome trả lại đúng world đó của frame (biến của app còn giữ giữa các lần gọi, tới khi trang
// tải lại).
const worldName = "ghosthand"

// evalJS chạy biểu thức js trong isolated world của khung chính tab tctx (id khung chính = id tab).
func evalJS[T any](ctx, tctx context.Context, what, js string) (T, error) {
	return run(ctx, tctx, what, func(ctx context.Context, t *chromedp.Target) (T, error) {
		w, err := cdp.Call(ctx, t, page.CreateIsolatedWorld, page.CreateIsolatedWorldParams{FrameID: cdp.FrameID(t.TargetID), WorldName: worldName})
		if err != nil {
			var zero T
			return zero, err
		}
		return chromedp.Evaluate[T](js, func(p *runtime.EvaluateParams) { p.ContextID = w.ExecutionContextID })(ctx, t)
	})
}

// quietTab tắt Runtime trên tab vừa nối (evaluate không cần bật Runtime).
func quietTab(tctx context.Context) error {
	_, err := run(context.Background(), tctx, "tắt Runtime", func(ctx context.Context, t *chromedp.Target) (cdp.Empty, error) {
		return cdp.Call(ctx, t, runtime.Disable, cdp.Empty{})
	})
	return err
}
