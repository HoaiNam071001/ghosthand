package app

import (
	"context"
	"fmt"
	"os"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/gdrive"
	"ghosthand/internal/cloud/mcpcloud"
	"ghosthand/internal/cloud/mcpmap"
	"ghosthand/internal/mcpclient"
	"ghosthand/internal/store"
)

// Chọn nơi đồng bộ tới (bước 54 C9): Google Drive hoặc MCP server do người dùng khai. Phần còn lại của đồng bộ
// (Syncer, xung đột, phạm vi) không biết khác biệt.

// syncRemote dựng Provider theo cấu hình.
func (a *App) syncRemote(cfg store.SyncSettings) cloud.Provider {
	if !cfg.UsesMCP() {
		return &gdrive.Drive{Auth: a.cloudAuth()}
	}
	server := cfg.MCP.Server
	return &mcpcloud.Provider{Map: cfg.MCP, Call: func(ctx context.Context, tool string, args map[string]any) (mcpclient.Result, error) {
		return a.mcpCall(ctx, server, tool, args) // đi qua cổng quyền chung: hỏi server lần đầu, hỏi tool ghi / xoá
	}}
}

// syncConnected: đã sẵn sàng nối tới nơi đồng bộ (Drive: còn đăng nhập; MCP: server tồn tại và đang bật).
func (a *App) syncConnected(cfg store.SyncSettings) bool {
	if !cfg.UsesMCP() {
		return a.cloudAuth().LoggedIn(context.Background())
	}
	s, ok := store.MCPServerByID(cfg.MCP.Server)
	return ok && s.Enabled
}

// notConnectedErr – lý do chưa nối được, để báo người dùng.
func (a *App) notConnectedErr(cfg store.SyncSettings) error {
	if !cfg.UsesMCP() {
		return gdrive.ErrNeedLogin
	}
	if _, ok := store.MCPServerByID(cfg.MCP.Server); !ok {
		return fmt.Errorf("MCP server %q không còn trong Cài đặt → MCP server", cfg.MCP.Server)
	}
	return fmt.Errorf("MCP server dùng để đồng bộ đang tắt (Cài đặt → MCP server)")
}

// mcpSyncPreapproved: lượt tự động không được bật hộp hỏi quyền → chỉ chạy khi người dùng đã duyệt server và cho phép
// mọi tool sẽ gọi (từ một lượt bấm Đồng bộ ngay trước đó, chọn "luôn cho").
func (a *App) mcpSyncPreapproved(cfg store.SyncSettings) bool {
	s, ok := store.MCPServerByID(cfg.MCP.Server)
	if !ok || !store.MCPServerTrusted(s) {
		return false
	}
	known := map[string]mcpclient.Tool{}
	for _, t := range a.mcpc.StatusOf(s.ID).Tools {
		known[t.Name] = t
	}
	for _, tool := range cfg.MCP.Tools() {
		if !store.MCPToolAlways(s, tool) && !known[tool].ReadOnly {
			return false
		}
	}
	return true
}

// resetSyncState bỏ trạng thái "bản cuối đã đồng bộ": nơi đồng bộ khác thì state cũ khiến nơi mới trông như đã bị xoá hết.
func resetSyncState() {
	if p, err := syncFile(syncStateFile); err == nil {
		_ = os.Remove(p)
	}
}

// sameRemote – hai cấu hình trỏ tới cùng một nơi đồng bộ (đổi nơi → resetSyncState).
func sameRemote(a, b store.SyncSettings) bool {
	if a.UsesMCP() != b.UsesMCP() {
		return false
	}
	return !a.UsesMCP() || (a.MCP.Server == b.MCP.Server && a.MCP.Root == b.MCP.Root)
}

// SyncMCPPresets – bộ ánh xạ dựng sẵn cho Cài đặt → Đồng bộ → MCP server.
func (a *App) SyncMCPPresets() []mcpmap.Preset { return mcpmap.Presets() }

// CheckSyncMCP thử nối server theo ánh xạ m (nút "Kiểm tra"): trả tên các tool đã khai mà server không có.
// Nối lần đầu hỏi duyệt server như mọi MCP server (mcpgate.go).
func (a *App) CheckSyncMCP(m mcpmap.Mapping) ([]string, error) {
	if err := m.Check(); err != nil {
		return nil, err
	}
	v, err := a.RefreshMCPServer(m.Server)
	if err != nil {
		return nil, err
	}
	if v.Status.State != mcpclient.StateOK {
		return nil, fmt.Errorf("không nối được MCP server: %s", v.Status.Err)
	}
	have := map[string]bool{}
	for _, t := range v.Status.Tools {
		have[t.Name] = true
	}
	missing := []string{}
	for _, tool := range m.Tools() {
		if !have[tool] {
			missing = append(missing, tool)
		}
	}
	return missing, nil
}
