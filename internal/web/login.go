package web

import (
	"context"
	"errors"
	"os"
	"os/exec"
	goruntime "runtime"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/systeminfo"
	"github.com/chromedp/chromedp"
)

// Đăng nhập tài khoản web (bước 36): Gmail / Facebook nghi ngờ trình duyệt có cổng điều khiển (captcha, khoá tài khoản)
// → mở cùng profile KHÔNG có cổng để người dùng đăng nhập như Chrome thường; Xong → Chrome tự tắt (lưu cookie) rồi mở
// lại chế độ điều khiển – phiên đăng nhập còn nguyên (đã thử với Gmail 2026-10-18).

// errLoggingIn – node web / Thử trang muốn bật Chrome của app khi nó đang mở để đăng nhập (cùng profile không mở hai lần).
var errLoggingIn error = &BrowserError{"Chrome của app đang mở để đăng nhập tài khoản – đăng nhập xong bấm Xong ở app rồi chạy lại"}

// loginRun – Chrome đang mở để đăng nhập; done đóng khi nó tắt (người dùng tự đóng cũng tính là xong).
type loginRun struct {
	cmd  *exec.Cmd
	done <-chan struct{}
}

// logins theo profile – chung cho mọi bản Chrome (giao diện, lần chạy kịch bản, MCP) cùng profile.
var (
	loginMu sync.Mutex
	logins  = map[string]loginRun{}
)

func loggingIn(profile string) bool {
	loginMu.Lock()
	defer loginMu.Unlock()
	r, ok := logins[profile]
	if !ok {
		return false
	}
	select {
	case <-r.done:
		delete(logins, profile)
		return false
	default:
		return true
	}
}

// loginArgs – như launchArgs nhưng không cổng điều khiển, không cờ chạy nền.
func loginArgs(profile, url string) []string {
	return []string{"--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", url}
}

// closeTimeout – chờ Chrome tắt hẳn (lưu phiên, nhả khoá profile).
const closeTimeout = 15 * time.Second

// StartLogin đóng Chrome của app đang ở chế độ điều khiển (nếu mở) rồi mở lại cùng profile không có cổng điều khiển ở
// url. Đang mở để đăng nhập rồi thì thôi.
func (c *Chrome) StartLogin(ctx context.Context, url string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if loggingIn(c.profile) {
		return nil
	}
	if err := c.closeBrowser(ctx); err != nil {
		return err
	}
	bin, err := findBrowser(goruntime.GOOS)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(c.profile, 0o755); err != nil {
		return err
	}
	cmd, done, err := startBrowser(bin, loginArgs(c.profile, url))
	if err != nil {
		return err
	}
	loginMu.Lock()
	logins[c.profile] = loginRun{cmd, done}
	loginMu.Unlock()
	return nil
}

// FinishLogin – nút Xong: xin Chrome đăng nhập tự tắt, chờ tắt hẳn rồi mở lại chế độ điều khiển ở url.
func (c *Chrome) FinishLogin(ctx context.Context, url string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	loginMu.Lock()
	r, ok := logins[c.profile]
	delete(logins, c.profile)
	loginMu.Unlock()
	if ok {
		select {
		case <-r.done:
		default:
			_ = closeGently(r.cmd.Process.Pid)
			select {
			case <-r.done:
			case <-time.After(closeTimeout):
				loginMu.Lock()
				logins[c.profile] = r
				loginMu.Unlock()
				return &BrowserError{"Chrome đăng nhập chưa tắt sau " + closeTimeout.String() + " – đóng cửa sổ Chrome đó rồi bấm Xong lại"}
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
	if err := waitProfileFree(ctx, c.profile); err != nil {
		return err
	}
	return c.launch(ctx, url)
}

// closeBrowser đóng Chrome của app đang ở chế độ điều khiển (Browser.close – Chrome lưu phiên như khi người dùng thoát)
// và chờ nhả profile; chưa mở thì thôi.
func (c *Chrome) closeBrowser(ctx context.Context) error {
	port, err := c.connect(ctx)
	if errors.Is(err, ErrNoBrowser) {
		return nil // chưa mở – không có gì để đóng
	}
	if err != nil {
		return err
	}
	tabs, err := listTabs(ctx, port)
	if err == nil && len(tabs) == 0 { // Chrome mở mà không còn cửa sổ (macOS) – cần một tab để nối
		var id string
		if id, err = newTab(ctx, port, "about:blank"); err == nil {
			tabs = []tabInfo{{ID: id}}
		}
	}
	if err != nil {
		return &BrowserError{"không đóng được Chrome của app: " + err.Error()}
	}
	t, err := c.tab(tabs[0].ID, tabs)
	if err != nil {
		return err
	}
	// chromedp chặn Browser.close với trình duyệt nối từ xa → hỏi pid tiến trình trình duyệt rồi xin nó tự tắt
	pi, err := run(ctx, t.ctx, "đọc tiến trình trình duyệt", func(ctx context.Context, _ *chromedp.Target) (systeminfo.GetProcessInfoResult, error) {
		return cdp.Call(ctx, chromedp.FromContext(t.ctx).Browser, systeminfo.GetProcessInfo, cdp.Empty{})
	})
	c.reset()
	if err != nil {
		return err
	}
	pid := 0
	for _, p := range pi.ProcessInfo {
		if p.Type == "browser" {
			pid = int(p.ID)
		}
	}
	if pid == 0 {
		return &BrowserError{"không thấy tiến trình chính của Chrome của app để đóng"}
	}
	if err := closeGently(pid); err != nil {
		return &BrowserError{"không đóng được Chrome của app: " + err.Error()}
	}
	return waitProfileFree(ctx, c.profile)
}

// waitProfileFree chờ Chrome cũ nhả profile (detach_*.go) – mở ngay khi nó chưa tắt hẳn thì lần mở mới chỉ chuyển url
// sang tiến trình cũ rồi thoát.
func waitProfileFree(ctx context.Context, profile string) error {
	deadline := time.Now().Add(closeTimeout)
	for !profileFree(profile) {
		if time.Now().After(deadline) {
			return &BrowserError{"Chrome của app chưa tắt hẳn sau " + closeTimeout.String() + " – đóng nó rồi thử lại"}
		}
		if err := sleepCtx(ctx, 200*time.Millisecond); err != nil {
			return err
		}
	}
	return nil
}
