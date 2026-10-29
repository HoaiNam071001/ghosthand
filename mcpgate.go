package main

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// Quyền dùng MCP server ngoài (bước 55 M2): mọi lần gọi tool đi qua mcpCall. Server chưa duyệt với đúng cấu hình này →
// hỏi (hiện lệnh / URL đầy đủ; nối = chạy lệnh trên máy); tool không chỉ-đọc → hỏi từng lần hoặc "luôn cho tool này".
// Hỏi bằng event "mcp:ask" → MCPAskDialog → AnswerMCP. Lượt chạy từ API / hẹn giờ / AI cũng đi đường này nên không né được.

const mcpAskTimeout = 90 * time.Second

// Câu trả lời (AnswerMCP).
const (
	mcpOnce   = "once"
	mcpAlways = "always" // server: tin cấu hình này; tool: luôn cho tool này
	mcpDeny   = "deny"
)

// MCPAsk – nội dung hộp hỏi (event mcp:ask). Kind: server | tool.
type MCPAsk struct {
	ID      string   `json:"id"`
	Kind    string   `json:"kind"`
	Server  string   `json:"server"`        // tên hiển thị
	Command string   `json:"command"`       // lệnh đầy đủ (stdio) hoặc URL (http / sse) – đã che bí mật
	Env     []string `json:"env,omitempty"` // tên biến môi trường / header sẽ gửi (không kèm giá trị)
	Tool    string   `json:"tool,omitempty"`
	Desc    string   `json:"desc,omitempty"` // mô tả tool – dữ liệu của server ngoài, chỉ hiện, không phải chỉ dẫn
	Risk    string   `json:"risk,omitempty"`
	Open    bool     `json:"open,omitempty"` // tool khai openWorldHint: đụng dịch vụ bên ngoài
}

type mcpGate struct {
	mu      sync.Mutex
	n       int
	pending map[string]chan string
}

// mcpAsk hiện hộp hỏi và chờ trả lời; nil = được phép. always: người dùng chọn ghi nhớ.
func (a *App) mcpAsk(ask MCPAsk) (always bool, err error) {
	g := &a.mcpg
	g.mu.Lock()
	if g.pending == nil {
		g.pending = map[string]chan string{}
	}
	g.n++
	ask.ID = strconv.Itoa(g.n)
	ch := make(chan string, 1)
	g.pending[ask.ID] = ch
	g.mu.Unlock()
	defer func() {
		g.mu.Lock()
		delete(g.pending, ask.ID)
		g.mu.Unlock()
	}()

	a.showMain()
	a.emit("mcp:ask", ask)
	select {
	case ans := <-ch:
		if ans == mcpOnce || ans == mcpAlways {
			return ans == mcpAlways, nil
		}
		return false, mcpclient.ErrDenied
	case <-time.After(mcpAskTimeout):
		a.emit("mcp:ask-timeout", ask.ID)
		return false, errors.New("người dùng chưa trả lời câu hỏi cho phép dùng MCP (hết 90 giây)")
	}
}

// AnswerMCP – người dùng trả lời hộp hỏi id: once | always | deny.
func (a *App) AnswerMCP(id, answer string) {
	a.mcpg.mu.Lock()
	ch := a.mcpg.pending[id]
	a.mcpg.mu.Unlock()
	if ch != nil {
		select {
		case ch <- answer:
		default:
		}
	}
}

// mcpCall gọi tool sau khi qua cổng quyền.
func (a *App) mcpCall(ctx context.Context, serverID, tool string, args map[string]any) (mcpclient.Result, error) {
	s, ok := store.MCPServerByID(serverID)
	if !ok {
		return mcpclient.Result{}, fmt.Errorf("không có server MCP %q", serverID)
	}
	if !s.Enabled {
		return mcpclient.Result{}, fmt.Errorf("server MCP %q đang tắt (Cài đặt → MCP server)", s.Name)
	}
	cfg, vals, err := mcpConfig(s)
	if err != nil {
		return mcpclient.Result{}, err
	}
	clean := func(m string) string { return secrets.Redact(m, vals) }

	trusted := store.MCPServerTrusted(s)
	if !trusted {
		if err := a.askServer(s, cfg); err != nil {
			return mcpclient.Result{}, err
		}
	}
	t, err := a.findTool(ctx, s, cfg, tool, clean)
	if err != nil {
		return mcpclient.Result{}, err
	}
	if mcpclient.Decide(true, store.MCPToolAlways(s, tool), t) == mcpclient.AskTool {
		always, err := a.mcpAsk(MCPAsk{Kind: "tool", Server: s.Name, Command: describeConfig(s), Tool: tool, Desc: t.Description,
			Risk: t.Risk(), Open: t.OpenWorld != nil && *t.OpenWorld})
		if err != nil {
			return mcpclient.Result{}, err
		}
		if always {
			_ = store.AlwaysAllowMCPTool(s, tool)
		}
	}
	res, err := a.mcpc.CallTool(ctx, cfg, tool, args)
	if err != nil {
		return res, errors.New(clean(err.Error()))
	}
	return res, nil
}

func (a *App) askServer(s store.MCPServer, cfg mcpclient.Config) error {
	var names []string
	for k := range cfg.Env {
		names = append(names, k)
	}
	for k := range cfg.Headers {
		names = append(names, k)
	}
	always, err := a.mcpAsk(MCPAsk{Kind: "server", Server: s.Name, Command: describeConfig(s), Env: names})
	if err == nil && always {
		_ = store.TrustMCPServer(s)
	}
	return err
}

// findTool lấy mô tả tool từ cache, không có thì nối đọc danh sách (server đã được duyệt).
func (a *App) findTool(ctx context.Context, s store.MCPServer, cfg mcpclient.Config, name string, clean func(string) string) (mcpclient.Tool, error) {
	find := func(ts []mcpclient.Tool) (mcpclient.Tool, bool) {
		for _, t := range ts {
			if t.Name == name {
				return t, true
			}
		}
		return mcpclient.Tool{}, false
	}
	if t, ok := find(a.mcpc.StatusOf(s.ID).Tools); ok {
		return t, nil
	}
	st := a.mcpc.Refresh(ctx, cfg, clean)
	if st.State == mcpclient.StateError {
		return mcpclient.Tool{}, errors.New(st.Err)
	}
	if t, ok := find(st.Tools); ok {
		return t, nil
	}
	return mcpclient.Tool{}, fmt.Errorf("server %q không có tool %q", s.Name, name)
}

// describeConfig – dòng lệnh / URL để người dùng duyệt; chỉ dùng cấu hình chưa thay bí mật nên không lộ giá trị.
func describeConfig(s store.MCPServer) string {
	if s.Kind != mcpclient.KindStdio {
		return s.URL
	}
	out := s.Command
	for _, a := range s.Args {
		out += " " + a
	}
	return out
}
