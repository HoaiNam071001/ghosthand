// Package browser – điều khiển trình duyệt thường họ Chromium (Chrome / Edge / Brave / Cốc Cốc đã đăng nhập của người
// dùng) ở mức tab: đọc, chuyển, mở, đóng, tải lại (bước 43 B). Không CDP, không extension: macOS qua AppleScript (JXA,
// tabs_darwin.go), Windows qua UI Automation (tabs_windows.go). Khác internal/web: web điều khiển Chrome của app qua CDP.
package browser

import (
	"context"
	"errors"
	"runtime"

	"ghosthand/internal/model"
)

// Backend – thao tác tab. Engine dùng qua interface để test bằng bản giả (browsertest.Fake).
type Backend interface {
	// Tabs – mọi tab của trình duyệt b ("" = mọi trình duyệt đang chạy, trình duyệt đang ở trước trước), trong mỗi
	// trình duyệt cửa sổ trên cùng trước, tab theo thứ tự trên thanh tab. Không có trình duyệt nào chạy → rỗng, không lỗi.
	Tabs(ctx context.Context, b string) ([]model.TabInfo, error)
	Activate(ctx context.Context, t model.TabInfo) error              // chuyển tới tab + đưa cửa sổ, app lên trước
	NewTab(ctx context.Context, b, url string) (model.TabInfo, error) // tab mới ở cửa sổ trên cùng (url "" = trang trống)
	Close(ctx context.Context, t model.TabInfo) error                 // đóng tab
	Nav(ctx context.Context, t model.TabInfo, op string) error        // model.TabReload / TabBack / TabForward
	Go(ctx context.Context, t model.TabInfo, url string) error        // đổi URL của tab (không cần tab ở trước)
	Frame(ctx context.Context, t model.TabInfo) (model.TabFrame, error)
	// Normalize – tab t phải đang ở trước (Activate): zoom / Esc là phím gửi cho cửa sổ trước nhất. Trả: cửa sổ đã ở toàn màn hình.
	Normalize(ctx context.Context, t model.TabInfo, o model.NormalizeOpts) (wasFullscreen bool, err error)
}

var (
	// ErrNotRunning – chưa có trình duyệt nào (đúng loại) đang chạy (mã lỗi browser).
	ErrNotRunning = errors.New("chưa mở trình duyệt – mở bằng node Mở trước")
	// ErrNoAutomation – macOS chưa cho app điều khiển trình duyệt (mã lỗi permission).
	ErrNoAutomation = errors.New("chưa cho phép điều khiển trình duyệt – System Settings → Privacy & Security → Automation, bật trình duyệt cho app / terminal")
	// ErrTabGone – tab đã đóng giữa chừng.
	ErrTabGone = errors.New("tab không còn mở")
)

// System – trình duyệt thật của máy.
type System struct{}

// ElementApp – tên app của trình duyệt b để đọc cây accessibility của đúng trình duyệt (device.ElementReader): macOS
// bundle id, Windows tên tệp chạy (như winBrowser). b "" → "".
func ElementApp(b string) string {
	if runtime.GOOS == "windows" {
		return map[string]string{model.BrowserChrome: "chrome", model.BrowserEdge: "msedge", model.BrowserBrave: "brave",
			model.BrowserCocCoc: "browser"}[b]
	}
	return map[string]string{model.BrowserChrome: "com.google.Chrome", model.BrowserEdge: "com.microsoft.edgemac",
		model.BrowserBrave: "com.brave.Browser", model.BrowserCocCoc: "com.coccoc.Coccoc"}[b]
}
