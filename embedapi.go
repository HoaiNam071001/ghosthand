package main

import (
	"fmt"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/samples"
	"ghosthand/internal/script"
	"ghosthand/internal/store"
)

// Nhúng kịch bản khác vào kịch bản đang soạn (bước 39 G2). Phép nhúng ở script.Embed; ở đây chỉ chọn nguồn.

// EmbedScriptFile hỏi file kịch bản rồi nhúng vào parent. Result.Script.Steps trống nếu người dùng huỷ hộp thoại.
func (a *App) EmbedScriptFile(parent model.Script) (script.EmbedResult, error) {
	opts := runtime.OpenDialogOptions{Title: "Chọn kịch bản để nhúng", Filters: scriptFilters}
	if dir, err := store.ScriptsDir(); err == nil {
		opts.DefaultDirectory = dir
	}
	path, err := runtime.OpenFileDialog(a.ctx, opts)
	if err != nil || path == "" {
		return script.EmbedResult{}, err
	}
	child, err := store.ReadScriptFile(path)
	if err != nil {
		return script.EmbedResult{}, fmt.Errorf("không đọc được %s: %w", filepath.Base(path), err)
	}
	return script.Embed(parent, child, device.MainScreen(), filepath.Base(path))
}

// EmbedSample nhúng kịch bản mẫu id (Mẫu thử) vào parent.
func (a *App) EmbedSample(parent model.Script, id string) (script.EmbedResult, error) {
	url, err := sandboxURL()
	if err != nil {
		return script.EmbedResult{}, err
	}
	child, err := samples.Open(id, url)
	if err != nil {
		return script.EmbedResult{}, err
	}
	return script.Embed(parent, child, device.MainScreen(), "mẫu:"+id)
}
