package app

import (
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/wisp"
)

// Cài đặt → Trình duyệt (bước 62): node web chạy trên Chrome của app hay Wisp.

// SetWebSettings lưu trình duyệt cho node web ("" tự động | chrome | wisp).
func (a *App) SetWebSettings(w store.WebSettings) error { return store.SetWeb(w) }

// WispStatus – Wisp đã cài / đang mở + bật cổng chưa (không nối, không mở app).
func (a *App) WispStatus() wisp.State { return wisp.Status() }

// wispFor – Wisp cho Thử tìm / MCP đọc trang khi Cài đặt chọn Wisp (Tự động: Wisp đang mở); nil = Chrome của app.
// Không tự mở Wisp (chỉ đọc tab đang mở – như Chrome của app chưa mở thì báo).
func (a *App) wispFor() *wisp.Browser {
	if use, _ := session.UseWisp(store.CurrentSettings().Web.Browser, wisp.Running); !use {
		return nil
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.wispB == nil {
		a.wispB = wisp.New(false)
	}
	return a.wispB
}
