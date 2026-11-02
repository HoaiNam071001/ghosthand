package app

import (
	"context"
	"time"

	"ghosthand/internal/shortcuts"
)

// ListShortcuts – tên các Shortcut trong ứng dụng Phím tắt (chỉ macOS) cho ô chọn của node Shortcuts hệ điều hành.
func (a *App) ListShortcuts() ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return shortcuts.System{}.List(ctx)
}
