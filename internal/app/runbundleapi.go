package app

import (
	"context"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/host"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/model"
	"ghosthand/internal/store"
)

// Xuất gói lỗi (56 D2) ở Lịch sử chạy – logic + che bí mật ở store/runbundle.go.

var bundleFilters = []runtime.FileFilter{{DisplayName: "Gói lỗi Ghosthand (*.zip)", Pattern: "*.zip"}}

// ExportRunBundle hỏi chỗ lưu rồi ghi gói lỗi của lần chạy id; sc = kịch bản đang mở (chủ của lịch sử: name + path).
// Trả đường dẫn file đã ghi, "" = người dùng huỷ hộp thoại.
func (a *App) ExportRunBundle(sc model.Script, path, id string) (string, error) {
	dst, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{Title: "Xuất gói lỗi",
		DefaultFilename: store.BundleName(sc.Name, id), Filters: bundleFilters, CanCreateDirectories: true})
	if err != nil || dst == "" {
		return "", err
	}
	if !strings.EqualFold(filepath.Ext(dst), ".zip") {
		dst += ".zip"
	}
	// mọi bí mật trong kho (không chỉ bí mật kịch bản dùng) – mật khẩu có thể nằm trong output của trang / lệnh
	vals, _, _ := store.Secrets().Resolve(context.Background(), store.Secrets().Names())
	info := store.BundleInfo{App: a.AppVersion(), OS: goruntime.GOOS, OSVer: osVersion(), Arch: goruntime.GOARCH,
		Created: time.Now().Format(time.RFC3339), RunID: id, Script: sc.Name}
	f, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	if err := store.WriteRunBundle(f, sc.Name, path, id, sc, info, vals); err != nil {
		f.Close()
		os.Remove(dst) // không để lại gói dở
		return "", err
	}
	return dst, f.Close()
}

// osVersion – "Microsoft Windows 11 Pro 10.0.26200" / "darwin 15.1"; không đọc được thì "".
func osVersion() string {
	name, _, ver, err := host.PlatformInformation()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(name + " " + ver)
}
