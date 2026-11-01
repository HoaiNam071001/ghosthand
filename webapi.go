package main

import (
	"context"
	"errors"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// Hàm cho giao diện (và MCP – bước 31) quanh node web (bước 25d D3): trạng thái Chrome của app, Thử tìm, Chọn phần tử
// trên trang. Dùng một bản web.Chrome riêng của giao diện (lần chạy kịch bản có bản của nó – runner.go).

// webUITimeout – Thử tìm / mở trình duyệt tối đa (lần đầu đo toạ độ ~0,5 s, bật Chrome mới lâu hơn).
const webUITimeout = 30 * time.Second

// pickTimeout – chờ người dùng bấm vào phần tử.
const pickTimeout = 2 * time.Minute

func (a *App) browser() (*web.Chrome, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.web == nil {
		profile, err := store.BrowserProfile()
		if err != nil {
			return nil, err
		}
		a.web = web.NewChrome(profile, device.RobotgoInput{}.Move)
	}
	return a.web, nil
}

// BrowserStatus – Chrome của app đang mở chưa + các tab (không bật trình duyệt).
func (a *App) BrowserStatus() web.Status {
	b, err := a.browser()
	if err != nil {
		return web.Status{Tabs: []web.Tab{}}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return b.Status(ctx)
}

// OpenAppBrowser mở url ("" = trang trống) bằng Chrome của app – chưa mở thì bật lên (để đăng nhập, mở trang trước
// khi Chọn phần tử).
func (a *App) OpenAppBrowser(url string) error {
	b, err := a.browser()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), webUITimeout)
	defer cancel()
	return b.Open(ctx, orBlank(url))
}

// loginTimeout – đóng Chrome cũ (≤ 15 s) + mở lại chế độ điều khiển (≤ 20 s).
const loginTimeout = 60 * time.Second

// StartWebLogin – nút Đăng nhập tài khoản web (bước 36): mở Chrome của app không có cổng điều khiển ở url ("" = trang
// trống) để người dùng đăng nhập Gmail / Facebook như Chrome thường.
func (a *App) StartWebLogin(url string) error {
	b, err := a.browser()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), loginTimeout)
	defer cancel()
	return b.StartLogin(ctx, orBlank(url))
}

// FinishWebLogin – nút Xong: Chrome đăng nhập tự tắt (lưu cookie) rồi mở lại chế độ điều khiển ở url; app lên lại trước.
func (a *App) FinishWebLogin(url string) error {
	b, err := a.browser()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), loginTimeout)
	defer cancel()
	err = b.FinishLogin(ctx, orBlank(url))
	a.showWindow()
	return err
}

func orBlank(url string) string {
	if url == "" {
		return "about:blank"
	}
	return url
}

// FindElement thử tìm phần tử của node web stepID trên tab hiện tại (một lần, không chờ) – nút "Thử tìm".
// {{biến}} lấy giá trị mặc định của input.
func (a *App) FindElement(sc model.Script, stepID string) (engine.WebFindResult, error) {
	s, err := stepOf(sc, stepID)
	if err != nil {
		return engine.WebFindResult{}, err
	}
	if s, err = script.WithInputDefaults(sc, s); err != nil {
		return engine.WebFindResult{}, err
	}
	b, err := a.browser()
	if err != nil {
		return engine.WebFindResult{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), webUITimeout)
	defer cancel()
	res, err := engine.New(nil, sc, engine.Options{Browser: b}).FindElement(ctx, s)
	a.showWindow() // lần đầu đo toạ độ đưa Chrome lên trước – app lên lại để thấy kết quả
	return res, err
}

func (a *App) showWindow() {
	if a.ctx != nil {
		runtime.WindowShow(a.ctx)
	}
}

// PickElement bật chế độ chọn trên tab (lọc như trường Tab của node; "" = tab đang hiện) và chờ người dùng bấm vào
// phần tử → selector đã kiểm. CancelPick / Esc trong trang để huỷ.
func (a *App) PickElement(tab string) (web.Picked, error) {
	b, err := a.browser()
	if err != nil {
		return web.Picked{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), pickTimeout)
	defer cancel()
	a.mu.Lock()
	if a.pickCancel != nil {
		a.pickCancel() // lần chọn trước còn chờ – bỏ
	}
	a.pickCancel = cancel
	a.mu.Unlock()
	p, err := b.Pick(ctx, tab)
	if !errors.Is(err, context.Canceled) {
		a.showWindow() // chọn xong (hoặc Esc) → app lên lại trước Chrome
	}
	if errors.Is(err, context.DeadlineExceeded) {
		err = errors.New("hết 2 phút chưa chọn phần tử nào")
	}
	return p, err
}

// CancelPick huỷ lần Chọn phần tử đang chờ (không lỗi nếu không có).
func (a *App) CancelPick() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.pickCancel != nil {
		a.pickCancel()
		a.pickCancel = nil
	}
}

// checkTimeout – thử trang: bật trình duyệt (≤ 20 s) + chờ trang yên (≤ 30 s) + dò.
const checkTimeout = 60 * time.Second

// CheckPage – nút Thử trang (bước 44): mở url trên Chrome của app, dò captcha / chặn bot / canvas; url rỗng = Dò lại
// tab đang mở (không tải lại). Xong thì app lên lại trước Chrome để thấy kết quả.
func (a *App) CheckPage(url string) (web.PageCheck, error) {
	pc, err := a.checkPage(context.Background(), url)
	a.showWindow()
	return pc, err
}

func (a *App) checkPage(ctx context.Context, url string) (web.PageCheck, error) {
	b, err := a.browser()
	if err != nil {
		return web.PageCheck{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()
	return b.CheckPage(ctx, url)
}
