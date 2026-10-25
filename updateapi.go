package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/launch"
	"ghosthand/internal/update"
)

// updateState – bản mới hỏi được lần gần nhất (InstallUpdate chỉ tin cái này, không nhận link từ frontend) + cờ đang cài.
type updateState struct {
	mu   sync.Mutex
	info update.Info
	busy bool
}

func (u *updateState) set(i update.Info) { u.mu.Lock(); u.info = i; u.mu.Unlock() }

// AppVersion – phiên bản đang chạy ("dev" khi build không gắn số).
func (a *App) AppVersion() string {
	if update.IsDev() {
		return "dev"
	}
	return update.Version
}

// CheckUpdate hỏi GitHub Releases có bản mới không (nút Kiểm tra trong Cài đặt → Giới thiệu).
func (a *App) CheckUpdate() (update.Info, error) {
	info, err := update.Check(context.Background(), "")
	if err == nil {
		a.upd.set(info)
	}
	return info, err
}

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
		if info, err := update.Check(ctx, ""); err == nil {
			a.upd.set(info)
			if info.Newer {
				a.emit("update:available", info)
			}
		}
	}()
}

// updateProgress – event update:progress: phase download (done / total byte) | install | restart.
type updateProgress struct {
	Phase string `json:"phase"`
	Done  int64  `json:"done"`
	Total int64  `json:"total"`
}

// InstallUpdate tải bản mới (kiểm sha256), cài và mở lại app (nút Cập nhật ngay). Không làm khi đang chạy kịch bản hoặc
// còn thay đổi chưa lưu; lỗi ở bước tải / chép trả về ngay, app vẫn chạy bản cũ.
func (a *App) InstallUpdate() error {
	a.upd.mu.Lock()
	info, busy := a.upd.info, a.upd.busy
	if !busy && info.Newer {
		a.upd.busy = true
	}
	a.upd.mu.Unlock()
	switch {
	case busy:
		return fmt.Errorf("đang cập nhật")
	case !info.Newer:
		return fmt.Errorf("chưa có bản mới – bấm Kiểm tra bản mới trước")
	}
	defer func() { a.upd.mu.Lock(); a.upd.busy = false; a.upd.mu.Unlock() }()

	if a.sess.Running() != "" {
		return fmt.Errorf("đang chạy kịch bản – dừng lại rồi cập nhật")
	}
	a.mu.Lock()
	dirty := a.dirty
	a.mu.Unlock()
	if dirty {
		return fmt.Errorf("kịch bản đang soạn chưa lưu – lưu lại rồi cập nhật")
	}
	file, sum, err := update.PickAsset(info.Assets, runtime.GOOS, update.Installed())
	if err != nil {
		return err
	}
	dir := filepath.Join(os.TempDir(), "ghosthand-update")
	os.RemoveAll(dir)
	path, err := update.Download(context.Background(), file, sum, dir, func(done, total int64) {
		a.emit("update:progress", updateProgress{Phase: "download", Done: done, Total: total})
	})
	if err != nil {
		return err
	}
	a.emit("update:progress", updateProgress{Phase: "install"})
	if err := update.Install(path); err != nil {
		return err
	}
	a.emit("update:progress", updateProgress{Phase: "restart"})
	a.mu.Lock()
	a.quitting = true // đã hỏi xong ở trên (không còn thay đổi chưa lưu)
	a.mu.Unlock()
	go func() { time.Sleep(600 * time.Millisecond); wailsruntime.Quit(a.ctx) }()
	return nil
}
