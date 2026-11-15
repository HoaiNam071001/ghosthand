package store

import (
	"fmt"
	"slices"
)

// Trình duyệt cho node web (bước 62 – WebSettings.Browser).
const (
	WebBrowserAuto   = ""       // Wisp nếu đang mở + bật cổng Ghosthand, không thì Chrome của app
	WebBrowserChrome = "chrome" // Chrome của app (CDP, profile riêng)
	WebBrowserWisp   = "wisp"   // Wisp – chưa mở thì tự mở rồi chờ
)

// WebSettings – cài đặt node web. Riêng từng máy (Wisp cài trên máy này hay không).
type WebSettings struct {
	Browser string `json:"browser,omitempty"`
}

// SetWeb lưu cài đặt node web; trình duyệt lạ là lỗi.
func SetWeb(w WebSettings) error {
	if !slices.Contains([]string{WebBrowserAuto, WebBrowserChrome, WebBrowserWisp}, w.Browser) {
		return fmt.Errorf("trình duyệt cho node web không hợp lệ: %s", w.Browser)
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s := loadSettings(dir)
	s.Web = w
	return saveSettings(dir, s)
}
