package app

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/launch"
	"ghosthand/internal/store"
)

// Cài đặt → Lưu trữ (bước 41): thư mục kịch bản (tay / AI) và ảnh chụp; trống = mặc định (store.DefaultDirs).

// StorageDefaults – thư mục mặc định, hiện trong ô để trống.
func (a *App) StorageDefaults() (store.StorageDefaults, error) { return store.DefaultDirs() }

// SetStorageSettings lưu thư mục đã chọn (phải đang có).
func (a *App) SetStorageSettings(s store.StorageSettings) error { return store.SetStorage(s) }

// PickFolder – hộp thoại chọn thư mục, mở sẵn ở from. "" = người dùng huỷ.
func (a *App) PickFolder(title, from string) (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: title, DefaultDirectory: from, CanCreateDirectories: true})
}

// OpenFolder mở thư mục trong Finder / Explorer (thư mục mặc định chưa có thì tạo trước).
func (a *App) OpenFolder(dir string) error {
	if !filepath.IsAbs(dir) { // đường dẫn đến từ frontend – không đưa chuỗi lạ (vd "-a") cho lệnh open
		return fmt.Errorf("thư mục phải là đường dẫn đầy đủ: %s", dir)
	}
	defs, err := store.DefaultDirs()
	if err == nil && (dir == defs.ScriptsDir || dir == defs.ShotsDir) {
		os.MkdirAll(dir, 0o755)
	}
	if st, err := os.Stat(dir); err != nil || !st.IsDir() {
		return fmt.Errorf("không thấy thư mục %s", dir)
	}
	return launch.OpenTarget(dir, "")
}
