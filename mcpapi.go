package main

import (
	"context"
	"errors"
	"os"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/mcpsrv"
	"ghosthand/internal/model"
	"ghosthand/internal/perm"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// MCP cho AI (bước 31, internal/mcpsrv): route /mcp trên API local (cả kênh CLI – `ghosthand --mcp` chuyển tiếp
// vào đó – lẫn cổng cho chương trình khác). Công tắc trong Cài đặt, bật mặc định.

// startMCP – gọi trong startAPI, trước khi mở cổng.
func (a *App) startMCP() {
	a.mcp = mcpsrv.New(mcpBackend{a})
	a.apiSrv.Handle("/mcp", a.mcp.Handler())
}

// SetMCPSettings bật / tắt MCP.
// Chuyển về Tắt / Chỉ soạn thì huỷ ngay lượt AI đang chạy.
func (a *App) SetMCPSettings(m store.MCPSettings) error {
	if err := store.SetMCP(m); err != nil {
		return err
	}
	a.stopAIRun(m)
	return nil
}

// MCPLog – các lệnh AI đã gọi gần đây (mới nhất trước) cho Cài đặt.
func (a *App) MCPLog() []mcpsrv.Call {
	if a.mcp == nil {
		return []mcpsrv.Call{}
	}
	return a.mcp.Log()
}

// MCPClients – đoạn cấu hình mẫu cho từng client AI (exe của app + --mcp; HTTP khi API cho chương trình khác bật).
func (a *App) MCPClients() ([]mcpsrv.ClientConfig, error) {
	exe, err := os.Executable()
	if err != nil {
		return nil, err
	}
	port, api := 0, store.CurrentSettings().API
	if api.Enabled {
		port = api.Port
	}
	return mcpsrv.ClientConfigs(exe, port, api.Token), nil
}

// ClaudeDesktopConfigPath – file cấu hình của Claude Desktop (hiện trong câu hỏi trước khi ghi).
func (a *App) ClaudeDesktopConfigPath() (string, error) { return mcpsrv.ClaudeDesktopConfig() }

// AddToClaudeDesktop ghi mục ghosthand vào cấu hình Claude Desktop (frontend đã hỏi người dùng). Trả đường dẫn file.
func (a *App) AddToClaudeDesktop() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	path, err := mcpsrv.ClaudeDesktopConfig()
	if err != nil {
		return "", err
	}
	return path, mcpsrv.AddToClaudeDesktop(path, exe)
}

// AIScripts – trong danh sách mở gần đây, file nào do AI tạo (chip AI ở thư viện).
func (a *App) AIScripts() []string {
	out := []string{}
	for _, p := range store.RecentScripts() {
		if sc, err := store.ReadScriptFile(p); err == nil && sc.Meta != nil && sc.Meta.CreatedBy == model.CreatedByAI {
			out = append(out, p)
		}
	}
	return out
}

// mcpBackend – mcpsrv.Backend nối vào App.
type mcpBackend struct{ a *App }

func (b mcpBackend) Enabled() bool               { return store.CurrentSettings().MCP.Enabled }
func (b mcpBackend) Recent() []string            { return store.RecentScripts() }
func (b mcpBackend) ScriptsDir() (string, error) { return store.AIScriptsDir() }

func (b mcpBackend) Editor() mcpsrv.Editor {
	b.a.mu.Lock()
	defer b.a.mu.Unlock()
	return mcpsrv.Editor{Path: b.a.editPath, Dirty: b.a.dirty}
}

func (b mcpBackend) ReadScript(path string) (model.Script, int, error) {
	return apiBackend(b).ReadScript(path)
}

func (b mcpBackend) WriteScript(path string, sc model.Script, rev int) (int, error) {
	rev, err := b.a.writeScriptExternal(path, sc, rev, session.SourceAI)
	if err == nil {
		store.EditRecent(func(l []string) []string { return store.PushRecent(l, path) })
	}
	return rev, err
}

// OpenInApp – frontend mở file (scriptFile.ts, nghe "mcp:open") và đưa cửa sổ lên trước.
func (b mcpBackend) OpenInApp(path string) error {
	b.a.showMain()
	b.a.emit("mcp:open", path)
	return nil
}

// NoteCapture – chấm đỏ trên thanh mini (event ai:capture) trừ khi người dùng đã tắt trong Cài đặt.
func (b mcpBackend) NoteCapture() {
	if !store.CurrentSettings().MCP.HideCaptureDot {
		b.a.emit("ai:capture", nil)
	}
}

func (b mcpBackend) Permissions() []perm.Item { return perm.Check(perm.System{}) }

func (b mcpBackend) SecretNames() []string { return store.Secrets().Names() }

func (b mcpBackend) Displays() []mcpsrv.Display {
	main := device.MainScreen()
	out := []mcpsrv.Display{}
	for _, r := range device.Displays() {
		out = append(out, mcpsrv.Display{Rect: r, Scale: device.DPIScale(r), Main: r == main})
	}
	return out
}

func (b mcpBackend) ToolAllowed(client, tool string) bool {
	return store.CurrentSettings().MCP.ToolAllowed(client, tool)
}

// MCPTools – bảng tool cho Cài đặt (nhóm + mô tả lấy từ chính server).
func (a *App) MCPTools() []mcpsrv.ToolInfo {
	if a.mcp == nil {
		return []mcpsrv.ToolInfo{}
	}
	return a.mcp.Tools()
}

// MCPSeenClients – các loại AI đã kết nối từ lúc mở app (để chọn ghi đè riêng).
func (a *App) MCPSeenClients() []string {
	if a.mcp == nil {
		return []string{}
	}
	return a.mcp.Clients()
}

func (b mcpBackend) MCP() store.MCPSettings { return store.CurrentSettings().MCP }

// CheckPage – probe_page: mở trình duyệt là đụng máy → mức Chỉ soạn từ chối; Hỏi / Tự chạy không hỏi (chỉ mở trang).
func (b mcpBackend) CheckPage(ctx context.Context, url string) (web.PageCheck, error) {
	if store.CurrentSettings().MCP.RunMode() == store.AIRunEdit {
		return web.PageCheck{}, errors.New("Cài đặt của app chỉ cho AI soạn kịch bản – không mở trình duyệt thử trang được; hỏi người dùng")
	}
	return b.a.checkPage(ctx, url)
}

// SetNodePref – AI đổi ưu tiên node: lưu ngay, báo người dùng (thông báo nhỏ + Cài đặt cập nhật nếu đang mở).
// ReadOutline – chỉ đọc tab đang mở, không bật trình duyệt: không đụng máy nên mọi mức AI đều dùng được.
func (b mcpBackend) ReadOutline(ctx context.Context, tab string, onlyDialog bool) (web.Outline, []web.Tab, error) {
	c, err := b.a.browser()
	if err != nil {
		return web.Outline{}, nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	o, err := c.ReadOutline(ctx, tab, onlyDialog)
	if errors.Is(err, web.ErrNoBrowser) {
		return web.Outline{}, nil, errors.New("Chrome của app chưa mở – dùng probe_page(url) hoặc node open (webBrowser) để mở trang trước")
	}
	if err != nil {
		return web.Outline{}, nil, err
	}
	return o, c.Status(ctx).Tabs, nil
}

// TabShot – chỉ chụp tab đang mở, không bật trình duyệt: không đụng chuột / phím nên mọi mức AI đều dùng được.
func (b mcpBackend) TabShot(ctx context.Context, tab string) (web.TabShot, error) {
	c, err := b.a.browser()
	if err != nil {
		return web.TabShot{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	sh, err := c.Screenshot(ctx, tab)
	if errors.Is(err, web.ErrNoBrowser) {
		return web.TabShot{}, errors.New("Chrome của app chưa mở – dùng probe_page(url) hoặc node open (webBrowser) để mở trang trước")
	}
	return sh, err
}

func (b mcpBackend) SetNodePref(p string) error {
	if err := store.SetNodePref(p); err != nil {
		return err
	}
	b.a.emit("mcp:nodePref", p)
	return nil
}
