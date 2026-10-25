package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"ghosthand/internal/launch"
	"ghosthand/internal/update"
)

// AppVersion – phiên bản đang chạy ("dev" khi build không gắn số).
func (a *App) AppVersion() string {
	if update.IsDev() {
		return "dev"
	}
	return update.Version
}

// CheckUpdate hỏi GitHub Releases có bản mới không (nút Kiểm tra trong Cài đặt → Giới thiệu).
func (a *App) CheckUpdate() (update.Info, error) { return update.Check(context.Background(), "") }

// OpenReleasePage mở trang tải bản mới bằng trình duyệt mặc định; chỉ nhận link của repo phát hành.
func (a *App) OpenReleasePage(url string) error {
	if !strings.HasPrefix(url, "https://github.com/"+update.Repo+"/") {
		return fmt.Errorf("không phải trang phát hành của Ghosthand: %s", url)
	}
	return launch.OpenTarget(url, "")
}

// checkUpdateAtStart hỏi một lần lúc mở app (chạy nền, lỗi mạng bỏ qua); có bản mới thì báo qua event update:available.
func (a *App) checkUpdateAtStart(ctx context.Context) {
	if update.IsDev() {
		return // bản tự build chưa gắn số – không có gì để so
	}
	go func() {
		select {
		case <-time.After(5 * time.Second): // đợi app lên xong rồi mới gọi mạng
		case <-ctx.Done():
			return
		}
		if info, err := update.Check(ctx, ""); err == nil && info.Newer {
			a.emit("update:available", info)
		}
	}()
}
