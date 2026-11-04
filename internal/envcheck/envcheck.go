// Package envcheck dò trước khi chạy những chuyện hay làm kịch bản lỗi giữa chừng mà không do kịch bản (61 M3):
// trình duyệt bật *hỏi nơi lưu tệp*, hộp thoại lạ đang mở, cửa sổ trình duyệt quá nhỏ. Chỉ cảnh báo kèm cách sửa –
// không chặn chạy. Quyền hệ điều hành thiếu do internal/perm lo (MCP trả riêng missingPermissions).
package envcheck

import (
	"fmt"
	"strings"

	"ghosthand/internal/model"
)

// Warning – một cảnh báo môi trường.
type Warning struct {
	Kind string `json:"kind"` // KindDownloadPrompt | KindDialog | KindSmallWindow
	Msg  string `json:"msg"`
	Fix  string `json:"fix"`
}

const (
	KindDownloadPrompt = "downloadPrompt"
	KindDialog         = "dialog"
	KindSmallWindow    = "smallWindow"
)

// Cỡ cửa sổ trình duyệt dưới mức này thì nhiều trang đổi sang bố cục hẹp (menu thu vào nút ☰, cột ẩn).
const minBrowserW, minBrowserH = 1000, 600

// Env – trạng thái máy lúc dò. Downloads: trình duyệt đang bật hỏi nơi lưu (DownloadPrompts đọc).
type Env struct {
	Windows   []model.WindowInfo // thứ tự chồng, trên cùng trước
	Downloads []string           // tên trình duyệt đang bật "hỏi nơi lưu mỗi tệp"
}

// Check – cảnh báo cho kịch bản sc; sc nil = dò chung (check_permissions): mọi cảnh báo không phụ thuộc kịch bản.
func Check(sc *model.Script, env Env) []Warning {
	out := []Warning{}
	if sc == nil || downloads(*sc) {
		for _, b := range env.Downloads {
			out = append(out, Warning{Kind: KindDownloadPrompt, Msg: b + " đang bật hỏi nơi lưu mỗi tệp – tải xuống sẽ dừng ở hộp thoại Lưu",
				Fix: b + " → Cài đặt → Tệp đã tải xuống: tắt \"Hỏi vị trí lưu từng tệp trước khi tải xuống\""})
		}
	}
	for _, w := range dialogs(env.Windows) {
		out = append(out, Warning{Kind: KindDialog, Msg: "hộp thoại đang mở: " + label(w) + " – có thể chặn phím / click của kịch bản",
			Fix: "đóng hoặc trả lời hộp thoại trước khi chạy"})
	}
	if sc != nil && usesBrowser(*sc) && !normSizes(*sc) {
		if w, ok := frontBrowser(env.Windows); ok && (w.Box.W < minBrowserW || w.Box.H < minBrowserH) {
			out = append(out, Warning{Kind: KindSmallWindow,
				Msg: fmt.Sprintf("cửa sổ %s nhỏ (%d×%d) – trang có thể đổi bố cục, chữ / nút cần tìm bị ẩn", w.App, w.Box.W, w.Box.H),
				Fix: "phóng to cửa sổ, hoặc thêm node Đặt trình duyệt chuẩn (normSize) ở đầu kịch bản"})
		}
	}
	return out
}

// downloads – kịch bản có tải tệp (chờ tải xong, lưu PDF qua hộp thoại in).
func downloads(sc model.Script) bool {
	for _, s := range sc.Steps {
		if s.Enabled && (s.Type == model.StepWaitDownload || s.Type == model.StepSavePdf) {
			return true
		}
	}
	return false
}

// usesBrowser – kịch bản làm việc trên trình duyệt: node trình duyệt / web, hoặc Mở một URL.
func usesBrowser(sc model.Script) bool {
	for _, s := range sc.Steps {
		if !s.Enabled {
			continue
		}
		switch s.Type {
		case model.StepBrowserTab, model.StepBrowserGo, model.StepBrowserNorm, model.StepSavePdf,
			model.StepWebWait, model.StepWebClick, model.StepWebType, model.StepWebRead, model.StepWebScroll, model.StepWebKey:
			return true
		case model.StepOpen:
			t := strings.ToLower(s.Target)
			if strings.HasPrefix(t, "http://") || strings.HasPrefix(t, "https://") {
				return true
			}
		}
	}
	return false
}

// normSizes – kịch bản tự đặt cỡ cửa sổ trình duyệt (browserNorm normSize) – cỡ hiện tại không quan trọng.
func normSizes(sc model.Script) bool {
	for _, s := range sc.Steps {
		if s.Enabled && s.Type == model.StepBrowserNorm && s.NormSize {
			return true
		}
	}
	return false
}

// browserApps – tên app (macOS tên hiển thị, Windows tên tệp chạy) / bundle id của trình duyệt họ Chromium.
var browserApps = []string{"google chrome", "microsoft edge", "brave browser", "cốc cốc", "coccoc", "chromium",
	"chrome", "msedge", "brave", "browser", "com.google.chrome", "com.microsoft.edgemac", "com.brave.browser", "com.coccoc.coccoc"}

func isBrowser(w model.WindowInfo) bool {
	for _, n := range browserApps {
		if strings.EqualFold(w.App, n) || strings.EqualFold(w.AppID, n) {
			return true
		}
	}
	return false
}

// frontBrowser – cửa sổ trình duyệt trên cùng (không thu nhỏ, đủ lớn để là cửa sổ chính – bỏ popup / bong bóng).
func frontBrowser(ws []model.WindowInfo) (model.WindowInfo, bool) {
	for _, w := range ws {
		if isBrowser(w) && !w.Minimized && w.Title != "" && w.Box.W > 200 && w.Box.H > 150 {
			return w, true
		}
	}
	return model.WindowInfo{}, false
}

// dialogApps – tiến trình chỉ hiện hộp thoại hệ thống (xin quyền, cảnh báo app tải từ mạng, mật khẩu).
var dialogApps = []string{"usernotificationcenter", "securityagent", "universalaccessauthwarn", "coreservicesuiagent",
	"consent", "credentialuibroker"}

// dialogTitles – tiêu đề hộp thoại Lưu / Mở / In / quyền (so cả câu, không phân biệt hoa thường) – tiêu đề tab trình
// duyệt hiếm khi trùng đúng cả câu.
var dialogTitles = []string{"save as", "save", "save file", "open", "open file", "print", "lưu", "lưu thành", "lưu dưới dạng",
	"lưu tệp", "mở", "mở tệp", "in", "windows security", "bảo mật windows", "user account control"}

func dialogs(ws []model.WindowInfo) []model.WindowInfo {
	out := []model.WindowInfo{}
	for _, w := range ws {
		if w.Minimized {
			continue
		}
		if has(dialogApps, w.App) || has(dialogTitles, strings.TrimSpace(w.Title)) {
			out = append(out, w)
		}
	}
	return out
}

func has(list []string, v string) bool {
	for _, x := range list {
		if strings.EqualFold(x, v) {
			return true
		}
	}
	return false
}

func label(w model.WindowInfo) string {
	if w.Title == "" {
		return w.App
	}
	return "\"" + w.Title + "\" (" + w.App + ")"
}
