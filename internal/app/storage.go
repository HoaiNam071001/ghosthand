package app

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/store"
)

// Lưu / mở kịch bản (bước 21): file .json, bản nháp tự lưu và danh sách mở gần đây trong configDir().

const (
	scriptExt  = ".json"
	dialogName = "Kịch bản Ghosthand"
)

// ScriptFile – kịch bản vừa mở và đường dẫn file của nó. Path "" = người dùng huỷ hộp thoại.
type ScriptFile struct {
	Script   model.Script `json:"script"`
	Path     string       `json:"path"`
	Revision int          `json:"revision"` // store.Revisions – so với event script:changed để biết file bị ghi từ ngoài
}

// ---- Gọi từ frontend ----

var scriptFilters = []runtime.FileFilter{{DisplayName: dialogName + " (*.json)", Pattern: "*" + scriptExt}}

// SaveScript ghi kịch bản vào path; path "" (chưa lưu lần nào) thì hỏi chỗ lưu như SaveScriptAs.
// Trả kịch bản đã ghi + đường dẫn; Path "" nếu người dùng huỷ hộp thoại.
func (a *App) SaveScript(sc model.Script, path string) (ScriptFile, error) {
	if path == "" {
		return a.SaveScriptAs(sc, "")
	}
	sc.Version = model.ScriptVersion
	rev, err := a.revs.Write(path, -1, func() error { return store.WriteScriptFile(path, sc) })
	if err != nil {
		return ScriptFile{}, fmt.Errorf("không lưu được %s: %w", filepath.Base(path), err)
	}
	store.EditRecent(func(l []string) []string { return store.PushRecent(l, path) })
	return ScriptFile{Script: sc, Path: path, Revision: rev}, nil
}

// ScriptChanged – event "script:changed": file kịch bản vừa bị ghi từ ngoài app (API / AI).
type ScriptChanged struct {
	Path     string `json:"path"`
	Revision int    `json:"revision"`
	Source   string `json:"source"`
}

// writeScriptExternal – API / AI ghi kịch bản vào file: kiểm tra cấu trúc, base phải đúng revision hiện tại
// (store.ConflictError nếu không), rồi báo frontend nạp lại (giữ hoàn tác). Trả revision mới.
func (a *App) writeScriptExternal(path string, sc model.Script, base int, source string) (int, error) {
	b, err := script.EncodeScript(sc)
	if err != nil {
		return 0, err
	}
	if sc, err = script.DecodeScript(b); err != nil { // kiểm tra như lúc mở file – file ghi ra luôn mở lại được
		return 0, err
	}
	rev, err := a.revs.Write(path, base, func() error { return store.WriteScriptFile(path, sc) })
	if err != nil {
		return rev, err
	}
	a.emit("script:changed", ScriptChanged{Path: path, Revision: rev, Source: source})
	return rev, nil
}

// SaveScriptAs hỏi chỗ lưu (gợi ý thư mục / tên từ path hoặc tên kịch bản) rồi ghi; tên kịch bản đổi theo tên file.
func (a *App) SaveScriptAs(sc model.Script, path string) (ScriptFile, error) {
	opts := runtime.SaveDialogOptions{
		Title:                "Lưu kịch bản",
		DefaultFilename:      script.SafeFileName(sc.Name) + scriptExt,
		Filters:              scriptFilters,
		CanCreateDirectories: true,
	}
	if path != "" {
		opts.DefaultDirectory = filepath.Dir(path)
		opts.DefaultFilename = filepath.Base(path)
	} else {
		dir, err := store.ScriptsDir() // lưu lần đầu: mở ở thư mục kịch bản trong Cài đặt
		if err != nil {
			return ScriptFile{}, err
		}
		opts.DefaultDirectory = dir
	}
	dst, err := runtime.SaveFileDialog(a.ctx, opts)
	if err != nil || dst == "" {
		return ScriptFile{}, err
	}
	if filepath.Ext(dst) == "" {
		dst += scriptExt
	}
	sc.Name = strings.TrimSuffix(filepath.Base(dst), filepath.Ext(dst))
	return a.SaveScript(sc, dst)
}

// OpenScript hỏi file rồi đọc. Path "" nếu người dùng huỷ.
func (a *App) OpenScript() (ScriptFile, error) {
	opts := runtime.OpenDialogOptions{Title: "Mở kịch bản", Filters: scriptFilters}
	if dir, err := store.ScriptsDir(); err == nil { // thư mục đã chọn không còn: vẫn mở được file ở chỗ khác
		opts.DefaultDirectory = dir
	}
	path, err := runtime.OpenFileDialog(a.ctx, opts)
	if err != nil || path == "" {
		return ScriptFile{}, err
	}
	return a.OpenScriptPath(path)
}

// OpenScriptPath đọc file kịch bản (mục "Mở gần đây"); file không còn thì bỏ khỏi danh sách.
func (a *App) OpenScriptPath(path string) (ScriptFile, error) {
	sc, err := store.ReadScriptFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			store.EditRecent(func(l []string) []string { return store.RemoveRecent(l, path) })
			return ScriptFile{}, fmt.Errorf("không tìm thấy file %s", path)
		}
		return ScriptFile{}, fmt.Errorf("không mở được %s: %w", filepath.Base(path), err)
	}
	store.EditRecent(func(l []string) []string { return store.PushRecent(l, path) })
	return ScriptFile{Script: sc, Path: path, Revision: a.revs.Get(path)}, nil
}

// RecentScripts trả danh sách file mở / lưu gần đây, mới nhất trước.
func (a *App) RecentScripts() []string { return store.RecentScripts() }

// ForgetRecent bỏ path khỏi Mở gần đây (path "" = xoá cả danh sách). Không xoá file kịch bản.
func (a *App) ForgetRecent(path string) []string {
	store.EditRecent(func(l []string) []string {
		if path == "" {
			return nil
		}
		return store.RemoveRecent(l, path)
	})
	return store.RecentScripts()
}

// SaveDraft ghi bản nháp tự lưu (frontend gọi sau mỗi lần sửa, có giãn cách).
func (a *App) SaveDraft(d store.Draft) error { return store.SaveDraft(d) }

// LoadDraft trả bản nháp lần trước; nil nếu chưa có hoặc hỏng (bỏ qua, mở kịch bản trống).
func (a *App) LoadDraft() *store.Draft { return store.LoadDraft() }

// ClearDraft xoá bản nháp (đóng app chọn "Không lưu").
func (a *App) ClearDraft() error { return store.ClearDraft() }

// ---- Hỏi lưu khi đóng app ----

// SetEditorState: frontend báo kịch bản đang soạn (file, có thay đổi chưa lưu) – đóng app khi chưa lưu thì hỏi trước;
// AI (MCP) không ghi đè kịch bản đang sửa dở.
func (a *App) SetEditorState(path string, dirty bool) {
	a.mu.Lock()
	a.editPath, a.dirty = path, dirty
	a.mu.Unlock()
}

// ConfirmQuit đóng app sau khi frontend đã hỏi (Lưu / Không lưu).
func (a *App) ConfirmQuit() {
	a.mu.Lock()
	a.quitting = true
	a.mu.Unlock()
	runtime.Quit(a.ctx)
}

// beforeClose (OnBeforeClose): còn thay đổi chưa lưu → giữ app, nhờ frontend hỏi (event app:confirmClose).
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	a.mu.Lock()
	ask := a.dirty && !a.quitting
	a.mu.Unlock()
	if ask {
		runtime.EventsEmit(ctx, "app:confirmClose")
	}
	return ask
}
