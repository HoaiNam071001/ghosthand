package app

import (
	"ghosthand/internal/device"
	"ghosthand/internal/model"
)

// Cửa sổ / app đang chạy (bước 26) – inspector node Cửa sổ / Ứng dụng chọn từ danh sách; cùng hàm cho tool MCP
// list_windows / list_apps (31b).

// ListWindows – cửa sổ đang mở theo thứ tự chồng (trên cùng trước), không gồm cửa sổ của ghosthand.
func (a *App) ListWindows() ([]model.WindowInfo, error) { return device.SystemWindows{}.List() }

// ListApps – app / tiến trình đang chạy.
func (a *App) ListApps() ([]model.AppInfo, error) { return device.SystemApps{}.List() }
