package main

import (
	"context"
	"time"

	"ghosthand/internal/procinfo"
)

// ListProcesses – tiến trình đang chạy gộp theo tên, cho nút "Chọn…" của node Tiến trình (bước 50 E4).
func (a *App) ListProcesses() ([]procinfo.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	list, err := procinfo.System{}.List(ctx)
	if err != nil {
		return nil, err
	}
	return procinfo.Groups(list), nil
}
