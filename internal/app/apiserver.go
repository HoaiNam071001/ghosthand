package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/api"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// API local (bước 22, internal/api): kênh cho CLI luôn bật (cổng ngẫu nhiên, token mỗi lần mở – api.json), API cho
// chương trình khác (cổng + token cố định trong Cài đặt) chỉ khi người dùng bật. Cùng một bộ route.

// startAPI – gọi trong startup.
func (a *App) startAPI() {
	a.apiSrv = api.New(apiBackend{a}, a.hub)
	a.startMCP()
	token := store.NewToken()
	l, err := a.apiSrv.Listen(0, token)
	if err != nil {
		runtime.LogErrorf(a.ctx, "API local cho CLI: %v", err)
	} else if err = store.WriteAPIInfo(store.APIInfo{Port: l.Port, Token: token, PID: os.Getpid()}); err != nil {
		runtime.LogErrorf(a.ctx, "ghi api.json: %v", err)
	}
	a.apiCLI = l
	if err := a.applyAPI(store.CurrentSettings().API); err != nil {
		runtime.LogErrorf(a.ctx, "API local: %v", err)
	}
}

func (a *App) stopAPI() {
	if a.apiCLI != nil {
		a.apiCLI.Close()
		store.RemoveAPIInfo(os.Getpid())
	}
	_ = a.applyAPI(store.APISettings{})
}

// applyAPI mở / đóng cổng cho chương trình khác theo cài đặt.
func (a *App) applyAPI(s store.APISettings) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.apiExt != nil {
		a.apiExt.Close()
		a.apiExt = nil
	}
	if !s.Enabled || a.apiSrv == nil {
		return nil
	}
	l, err := a.apiSrv.Listen(s.Port, s.Token)
	if err != nil {
		return fmt.Errorf("không mở được cổng %d (có app khác đang dùng?): %w", s.Port, err)
	}
	a.apiExt = l
	return nil
}

// SetAPISettings lưu + áp cài đặt API cho chương trình khác (token trống = tạo mới). Trả cài đặt đã lưu.
func (a *App) SetAPISettings(s store.APISettings) (store.APISettings, error) {
	s, err := store.SetAPI(s)
	if err != nil {
		return s, err
	}
	return s, a.applyAPI(s)
}

// apiBackend – api.Backend nối vào App.
type apiBackend struct{ a *App }

func absPath(p string) string {
	if abs, err := filepath.Abs(p); err == nil {
		return filepath.Clean(abs)
	}
	return p
}

func (b apiBackend) Run(req api.RunRequest) (string, error) {
	path := absPath(req.Path)
	sc, err := store.ReadScriptFile(path)
	if err != nil {
		return "", err
	}
	values, err := presetValues(path, req.Preset)
	if err != nil {
		return "", err
	}
	for k, v := range req.Values {
		values[k] = v
	}
	src := req.Source
	if src != session.SourceCLI {
		src = session.SourceAPI
	}
	return b.a.sess.Start(sc, values, session.Options{Path: path, Source: src, Preset: req.Preset, Countdown: req.Countdown})
}

// presetValues – giá trị của bộ input name đã lưu cho kịch bản ("" = không dùng bộ nào).
func presetValues(path, name string) (map[string]any, error) {
	values := map[string]any{}
	if name == "" {
		return values, nil
	}
	mem := store.InputMemoryFor(path)
	var names []string
	for _, p := range mem.Presets {
		if p.Name == name {
			for k, v := range p.Values {
				values[k] = v
			}
			return values, nil
		}
		names = append(names, p.Name)
	}
	if len(names) == 0 {
		return nil, fmt.Errorf("kịch bản chưa có bộ giá trị nào – tạo trong form Chạy của app")
	}
	return nil, fmt.Errorf("không có bộ giá trị %q (có: %s)", name, strings.Join(names, ", "))
}

// Quit – dev-install / `ghosthand quit` (59 U2).
func (b apiBackend) Quit() error {
	if err := b.a.quitBlocker("thoát"); err != nil {
		return err
	}
	b.a.quitSoon()
	return nil
}

func (b apiBackend) Stop(id string) bool                      { return b.a.sess.Stop(id, session.StopByAPI) }
func (b apiBackend) Status(id string) (session.Status, error) { return b.a.sess.Status(id) }
func (b apiBackend) Wait(ctx context.Context, id string) (session.Status, error) {
	return b.a.sess.Wait(ctx, id)
}

func (b apiBackend) ReadScript(path string) (model.Script, int, error) {
	path = absPath(path)
	sc, err := store.ReadScriptFile(path)
	return sc, b.a.revs.Get(path), err
}

func (b apiBackend) WriteScript(path string, sc model.Script, rev int) (int, error) {
	return b.a.writeScriptExternal(absPath(path), sc, rev, session.SourceAPI)
}
