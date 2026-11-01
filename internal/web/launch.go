package web

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Mở / nối Chrome của app: profile riêng (từ Chrome 136 không bật cổng debug được trên profile mặc định), cổng debug
// do Chrome chọn (--remote-debugging-port=0, D0: cổng cố định có thể đã bị tiến trình khác giữ) ghi ở DevToolsActivePort.

// browserPaths – chỗ hay cài Chrome / Edge / Brave theo hệ điều hành, thử theo thứ tự. env đọc biến môi trường (test).
func browserPaths(goos string, env func(string) string) []string {
	switch goos {
	case "darwin":
		var out []string
		for _, base := range []string{"/Applications", filepath.Join(env("HOME"), "Applications")} {
			for _, app := range []string{"Google Chrome", "Microsoft Edge", "Brave Browser", "Chromium"} {
				out = append(out, base+"/"+app+".app/Contents/MacOS/"+app)
			}
		}
		return out
	case "windows":
		var out []string
		for _, rel := range []string{`Google\Chrome\Application\chrome.exe`, `Microsoft\Edge\Application\msedge.exe`, `BraveSoftware\Brave-Browser\Application\brave.exe`} {
			for _, base := range []string{env("ProgramFiles"), env("ProgramFiles(x86)"), env("LocalAppData")} {
				if base != "" {
					out = append(out, base+`\`+rel)
				}
			}
		}
		return out
	}
	return []string{"google-chrome", "google-chrome-stable", "microsoft-edge", "brave-browser", "chromium", "chromium-browser"}
}

func findBrowser(goos string) (string, error) {
	for _, p := range browserPaths(goos, os.Getenv) {
		if filepath.IsAbs(p) {
			if _, err := os.Stat(p); err == nil {
				return p, nil
			}
		} else if full, err := exec.LookPath(p); err == nil {
			return full, nil
		}
	}
	return "", &BrowserError{"không tìm thấy Chrome / Edge / Brave trên máy – cài một trong các trình duyệt này để dùng node web"}
}

// launchArgs – tham số bật trình duyệt; url mở ngay ở tab đầu.
func launchArgs(profile, url string) []string {
	return []string{"--remote-debugging-port=0", "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check",
		// cổng debug làm navigator.webdriver = true ngay khi trang tải (bước 36 – trang chống bot đọc cờ này); Chrome hiện
		// thanh cảnh báo cờ không hỗ trợ, đóng được
		"--disable-blink-features=AutomationControlled",
		// chạy nền (D4b): cửa sổ bị che / thu nhỏ, tab không hiện vẫn chạy đủ nhịp (không bị giảm tốc / dừng vẽ)
		"--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", url}
}

// activePort – dòng đầu <profile>/DevToolsActivePort là cổng Chrome đã chọn (file còn khi Chrome đã tắt – phải hỏi lại).
func activePort(profile string) (int, error) {
	b, err := os.ReadFile(filepath.Join(profile, "DevToolsActivePort"))
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(strings.TrimSpace(strings.SplitN(string(b), "\n", 2)[0]))
}

// tabInfo – một mục của /json/list. Chrome xếp theo lần dùng gần nhất (tab vừa dùng đứng đầu).
type tabInfo struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

var httpClient = &http.Client{Timeout: 2 * time.Second}

// devtools gọi endpoint HTTP của cổng debug (list, new, activate…); out = nil thì bỏ nội dung.
func devtools(ctx context.Context, port int, method, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, fmt.Sprintf("http://127.0.0.1:%d/json/%s", port, path), nil)
	if err != nil {
		return err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("trình duyệt trả %s cho /json/%s", resp.Status, path)
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func listTabs(ctx context.Context, port int) ([]tabInfo, error) {
	var list []tabInfo
	if err := devtools(ctx, port, http.MethodGet, "list", &list); err != nil {
		return nil, err
	}
	out := list[:0]
	for _, t := range list {
		if t.Type == "page" && !strings.HasPrefix(t.URL, "devtools://") && !strings.HasPrefix(t.URL, "chrome-extension://") {
			out = append(out, t)
		}
	}
	return out, nil
}

// pickTab – tab theo bộ lọc (URL / tiêu đề chứa, không phân biệt hoa thường); không lọc thì tab ưu tiên (vừa mở bằng
// node Mở) nếu còn, không thì tab dùng gần nhất.
func pickTab(tabs []tabInfo, filter, prefer string) (tabInfo, bool) {
	if f := strings.ToLower(strings.TrimSpace(filter)); f != "" {
		for _, t := range tabs { // id tab (read_web_outline trả) đi trước – không nhầm với tab khác cùng URL
			if strings.EqualFold(t.ID, f) {
				return t, true
			}
		}
		for _, t := range tabs {
			if strings.Contains(strings.ToLower(t.URL), f) || strings.Contains(strings.ToLower(t.Title), f) {
				return t, true
			}
		}
		return tabInfo{}, false
	}
	for _, t := range tabs {
		if t.ID == prefer {
			return t, true
		}
	}
	if len(tabs) == 0 {
		return tabInfo{}, false
	}
	return tabs[0], true
}

// newTab mở url ở tab mới (PUT – Chrome 111+ từ chối GET) và trả id tab.
func newTab(ctx context.Context, port int, u string) (string, error) {
	var t tabInfo
	if err := devtools(ctx, port, http.MethodPut, "new?"+url.PathEscape(u), &t); err != nil {
		return "", err
	}
	return t.ID, nil
}

// waitPort chờ trình duyệt vừa bật ghi cổng debug và trả lời.
func waitPort(ctx context.Context, profile string, timeout time.Duration) (int, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if port, err := activePort(profile); err == nil {
			if _, err := listTabs(ctx, port); err == nil {
				return port, nil
			}
		}
		if err := sleepCtx(ctx, 200*time.Millisecond); err != nil {
			return 0, err
		}
	}
	return 0, &BrowserError{"trình duyệt đã bật nhưng không mở cổng điều khiển sau " + timeout.String()}
}

// startBrowser bật trình duyệt tách khỏi app (app tắt thì trình duyệt vẫn mở – detach_*.go); done đóng khi nó tắt.
func startBrowser(bin string, args []string) (cmd *exec.Cmd, done <-chan struct{}, err error) {
	cmd = exec.Command(bin, args...)
	detach(cmd)
	if err := cmd.Start(); err != nil {
		return nil, nil, &BrowserError{fmt.Sprintf("không bật được trình duyệt %s: %v", filepath.Base(bin), err)}
	}
	ch := make(chan struct{})
	go func() { _ = cmd.Wait(); close(ch) }() // không để tiến trình zombie khi trình duyệt tắt lúc app còn chạy
	return cmd, ch, nil
}
