package web

import (
	"context"
	"sync"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"

	"ghosthand/internal/model"
)

// Hộp thoại JS (alert / confirm / prompt / beforeunload – bước 56 B1): lúc hộp đang mở, mọi lệnh JS trong trang treo
// tới khi hộp đóng → node web sẽ hết giờ mà không biết vì sao. Mỗi tab nghe Page.javascriptDialogOpening; Find gặp hộp
// thì làm theo Query.Dialog: "" báo ngay (Found.Dialog), accept / dismiss tự đóng rồi tìm tiếp (Found.Handled).

// Dialog – hộp thoại JS trên tab.
type Dialog struct {
	Type    string `json:"type"` // alert | confirm | prompt | beforeunload
	Message string `json:"message"`
	URL     string `json:"url,omitempty"`
}

// dialogWatch – hộp đang mở của một tab (sự kiện CDP tới từ goroutine của chromedp).
type dialogWatch struct {
	mu     sync.Mutex
	open   *Dialog
	opened chan struct{} // đóng khi có hộp mới mở – huỷ lệnh JS đang treo (watch)
}

func newDialogWatch() *dialogWatch { return &dialogWatch{opened: make(chan struct{})} }

// listen gắn vào tab tctx (chromedp đã bật Page domain lúc nối); dừng khi kết nối tab bị nhả (tctx huỷ).
func (w *dialogWatch) listen(tctx context.Context) {
	opening := chromedp.Events(tctx, page.JavascriptDialogOpening) // đăng ký ngay – không lỡ hộp mở trước khi goroutine chạy
	closed := chromedp.Events(tctx, page.JavascriptDialogClosed)
	go func() {
		for e, err := range opening {
			if err != nil {
				return
			}
			w.mu.Lock()
			w.open = &Dialog{Type: string(e.Type), Message: e.Message, URL: e.URL}
			close(w.opened)
			w.opened = make(chan struct{})
			w.mu.Unlock()
		}
	}()
	go func() {
		for _, err := range closed {
			if err != nil {
				return
			}
			w.mu.Lock()
			w.open = nil
			w.mu.Unlock()
		}
	}()
}

func (w *dialogWatch) current() *Dialog {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.open
}

// watch – ctx bị huỷ khi có hộp thoại mở giữa chừng (lệnh JS đang chờ sẽ không bao giờ trả).
func (w *dialogWatch) watch(ctx context.Context) (context.Context, context.CancelFunc) {
	w.mu.Lock()
	ch := w.opened
	w.mu.Unlock()
	cctx, cancel := context.WithCancel(ctx)
	go func() {
		select {
		case <-ch:
			cancel()
		case <-cctx.Done():
		}
	}()
	return cctx, cancel
}

// handleDialog đóng hộp đang mở: accept = OK (prompt để trống), dismiss = Huỷ.
func handleDialog(ctx, tctx context.Context, accept bool) error {
	_, err := run(ctx, tctx, "đóng hộp thoại JS", func(ctx context.Context, t *chromedp.Target) (cdp.Empty, error) {
		return cdp.Call(ctx, t, page.HandleJavaScriptDialog, page.HandleJavaScriptDialogParams{Accept: accept})
	})
	return err
}

// gateDialog – trước / sau một lần tìm: có hộp đang mở thì báo (done) hoặc đóng theo q.Dialog rồi tìm tiếp (handled).
func gateDialog(ctx context.Context, t *tabConn, q Query) (d *Dialog, done bool, err error) {
	if d = t.dialogs.current(); d == nil {
		return nil, false, nil
	}
	if q.Dialog == "" {
		return d, true, nil
	}
	if err := handleDialog(ctx, t.ctx, q.Dialog == model.WebDialogAccept); err != nil {
		return d, false, err
	}
	t.dialogs.mu.Lock() // sự kiện closed có thể tới sau – đừng đóng lại hộp đã đóng
	t.dialogs.open = nil
	t.dialogs.mu.Unlock()
	return d, false, nil
}
