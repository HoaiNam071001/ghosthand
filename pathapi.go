package main

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Nút "Chọn…" cạnh mọi ô đường dẫn của node (bước 50 B): file có sẵn / thư mục / nơi lưu file mới.
const (
	pickFile   = "file"
	pickFolder = "folder"
	pickSave   = "save"
)

// PickPath mở hộp chọn đường dẫn theo kind (file | folder | save), mở sẵn ở current (~ và biến {{…}} xử lý ở đây:
// biến thì bỏ qua). "" = người dùng huỷ.
func (a *App) PickPath(kind, title, current string) (string, error) {
	dir, name := startAt(current)
	switch kind {
	case pickFolder:
		return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: title, DefaultDirectory: dir, CanCreateDirectories: true})
	case pickSave:
		return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{Title: title, DefaultDirectory: dir, DefaultFilename: name, CanCreateDirectories: true})
	}
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{Title: title, DefaultDirectory: dir})
}

// startAt – thư mục + tên file để mở sẵn hộp thoại; ô trống / chứa biến / thư mục không còn → thư mục người dùng.
func startAt(current string) (dir, name string) {
	home, _ := os.UserHomeDir()
	p := strings.TrimSpace(current)
	if p == "" || strings.Contains(p, "{{") {
		return home, ""
	}
	if p == "~" || strings.HasPrefix(p, "~/") || strings.HasPrefix(p, `~\`) {
		p = filepath.Join(home, p[1:])
	}
	if st, err := os.Stat(p); err == nil && st.IsDir() {
		return p, ""
	}
	if st, err := os.Stat(filepath.Dir(p)); err == nil && st.IsDir() {
		return filepath.Dir(p), filepath.Base(p)
	}
	return home, ""
}
