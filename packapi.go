package main

import (
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/model"
	"ghosthand/internal/pack"
	"ghosthand/internal/store"
)

// Gói kịch bản .zip để chia sẻ (bước 28 R3) – kịch bản + file node đọc từ máy; logic ở internal/pack.

var packFilters = []runtime.FileFilter{{DisplayName: "Gói kịch bản Ghosthand (*.zip)", Pattern: "*.zip"}}

// ExportPack hỏi chỗ lưu rồi ghi gói của sc. Path "" = người dùng huỷ hộp thoại.
func (a *App) ExportPack(sc model.Script) (pack.Result, error) {
	name := strings.TrimSpace(sc.Name)
	if name == "" {
		name = "kich-ban"
	}
	dst, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{Title: "Xuất gói kịch bản", DefaultFilename: name + ".zip", Filters: packFilters})
	if err != nil || dst == "" {
		return pack.Result{}, err
	}
	if !strings.EqualFold(filepath.Ext(dst), ".zip") {
		dst += ".zip"
	}
	return pack.Export(sc, dst)
}

// ImportPack hỏi file gói, giải nén vào thư mục kịch bản (Cài đặt) rồi mở kịch bản vừa tạo. Path "" = huỷ.
func (a *App) ImportPack() (ScriptFile, error) {
	src, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{Title: "Nhập gói kịch bản", Filters: packFilters})
	if err != nil || src == "" {
		return ScriptFile{}, err
	}
	dir, err := store.ScriptsDir()
	if err != nil {
		return ScriptFile{}, err
	}
	res, err := pack.Import(src, dir)
	if err != nil {
		return ScriptFile{}, err
	}
	return a.OpenScriptPath(res.Path)
}
