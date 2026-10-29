package main

import (
	"context"
	"fmt"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// MCP server ngoài (bước 55 M1, Cài đặt → MCP server): cấu hình + trạng thái kết nối + danh sách tool (cache).
// Chỉ giao diện gọi các method này – AI qua MCP không thêm / sửa cấu hình (nó chạy lệnh trên máy), xem decisions.md.

// MCPServerView – cấu hình kèm trạng thái lần Tải lại gần nhất.
type MCPServerView struct {
	store.MCPServer
	Status mcpclient.Status `json:"status"`
}

func (a *App) mcpView(s store.MCPServer) MCPServerView {
	return MCPServerView{MCPServer: s, Status: a.mcpc.StatusOf(s.ID)}
}

// ListMCPServers – mọi server đã cấu hình.
func (a *App) ListMCPServers() []MCPServerView {
	list := store.CurrentSettings().MCPServers
	out := make([]MCPServerView, 0, len(list))
	for _, s := range list {
		out = append(out, a.mcpView(s))
	}
	return out
}

// SaveMCPServer thêm hoặc sửa server; đổi cấu hình thì bỏ kết nối + danh sách tool cũ.
func (a *App) SaveMCPServer(s store.MCPServer) (MCPServerView, error) {
	saved, err := store.SaveMCPServer(s)
	if err != nil {
		return MCPServerView{}, err
	}
	a.mcpc.Forget(saved.ID)
	return a.mcpView(saved), nil
}

// DeleteMCPServer xoá server và đóng kết nối của nó.
func (a *App) DeleteMCPServer(id string) error {
	a.mcpc.Forget(id)
	_ = store.ForgetMCPConsent(id)
	return store.DeleteMCPServer(id)
}

// SetMCPServerEnabled bật / tắt; tắt thì đóng kết nối (không để tiến trình con chạy ngầm).
func (a *App) SetMCPServerEnabled(id string, enabled bool) (MCPServerView, error) {
	s, ok := store.MCPServerByID(id)
	if !ok {
		return MCPServerView{}, fmt.Errorf("không có server MCP %q", id)
	}
	s.Enabled = enabled
	if !enabled {
		a.mcpc.Forget(id)
	}
	saved, err := store.SaveMCPServer(s)
	if err != nil {
		return MCPServerView{}, err
	}
	return a.mcpView(saved), nil
}

// RefreshMCPServer nối lại và đọc danh sách tool (nút Tải lại).
func (a *App) RefreshMCPServer(id string) (MCPServerView, error) {
	s, ok := store.MCPServerByID(id)
	if !ok {
		return MCPServerView{}, fmt.Errorf("không có server MCP %q", id)
	}
	cfg, vals, err := mcpConfig(s)
	if err != nil {
		return MCPServerView{}, err
	}
	if !store.MCPServerTrusted(s) { // nối = chạy lệnh trên máy: lần đầu (hoặc khi cấu hình đổi) phải được duyệt
		if err := a.askServer(s, cfg); err != nil {
			return MCPServerView{}, err
		}
	}
	ctx := context.Background()
	if a.ctx != nil {
		ctx = a.ctx
	}
	a.mcpc.Refresh(ctx, cfg, func(m string) string { return secrets.Redact(m, vals) })
	return a.mcpView(s), nil
}

// mcpConfig thay {{secret.*}} bằng giá trị thật. Thiếu bí mật → lỗi nói rõ tên (không nối với giá trị rỗng).
func mcpConfig(s store.MCPServer) (mcpclient.Config, map[string]string, error) {
	vals, missing, err := store.Secrets().Resolve(context.Background(), s.SecretNames())
	if err != nil {
		return mcpclient.Config{}, nil, err
	}
	if len(missing) > 0 {
		return mcpclient.Config{}, nil, fmt.Errorf("server %q cần bí mật chưa có: %v (Cài đặt → Bí mật)", s.Name, missing)
	}
	c := s.Config()
	c.Command, c.URL = secrets.Expand(c.Command, vals), secrets.Expand(c.URL, vals)
	for i, a := range c.Args {
		c.Args[i] = secrets.Expand(a, vals)
	}
	c.Env, c.Headers = expandMap(c.Env, vals), expandMap(c.Headers, vals)
	return c, vals, nil
}

func expandMap(m, vals map[string]string) map[string]string {
	if m == nil {
		return nil
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = secrets.Expand(v, vals)
	}
	return out
}
