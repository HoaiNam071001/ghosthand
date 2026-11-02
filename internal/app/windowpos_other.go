//go:build !windows

package app

import "github.com/wailsapp/wails/v2/pkg/runtime"

// windowPos – vị trí cửa sổ cùng hệ với runtime.WindowSetPosition (macOS: Wails đọc / đặt cùng theo màn hiện tại).
func (a *App) windowPos() (int, int) { return runtime.WindowGetPosition(a.ctx) }
