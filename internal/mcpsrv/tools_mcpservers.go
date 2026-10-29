package mcpsrv

import (
	"context"
	"encoding/json"
	"sort"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/mcpclient"
)

// list_mcp_servers (bước 55 M7): server MCP ngoài người dùng đã thêm, để AI soạn node mcpTool đúng id / tên tool / tham số.
// Chỉ đọc. AI KHÔNG thêm / sửa cấu hình server (cấu hình = lệnh chạy trên máy) và không thấy lệnh, env, mô tả tool
// (mô tả do server ngoài viết – có thể chứa chỉ dẫn giả): chỉ tên + tham số.

// MCPServerEntry – một server cho Backend trả (đã lọc bỏ server tắt hay chưa).
type MCPServerEntry struct {
	ID      string
	Name    string
	Enabled bool
	Status  mcpclient.Status
}

type mcpToolOut struct {
	Name     string   `json:"name"`
	ReadOnly bool     `json:"readOnly,omitempty"`
	Args     []string `json:"args,omitempty"` // tên tham số, bắt buộc có dấu *
}

type mcpServerOut struct {
	ID    string       `json:"id"`
	Name  string       `json:"name"`
	State string       `json:"state"` // ok | error | idle | off
	Tools []mcpToolOut `json:"tools,omitempty"`
}

func (s *Server) listMCPServers(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	out := []mcpServerOut{}
	for _, e := range s.back.MCPServers() {
		o := mcpServerOut{ID: e.ID, Name: e.Name, State: e.Status.State}
		if !e.Enabled {
			o.State = "off"
		} else {
			for _, t := range e.Status.Tools {
				o.Tools = append(o.Tools, mcpToolOut{Name: t.Name, ReadOnly: t.ReadOnly, Args: schemaArgs(t.InputSchema)})
			}
		}
		out = append(out, o)
	}
	return ok(map[string]any{"servers": out})
}

// schemaArgs – tên các thuộc tính của inputSchema (bắt buộc đứng trước, thêm *).
func schemaArgs(raw json.RawMessage) []string {
	var sc struct {
		Properties map[string]json.RawMessage `json:"properties"`
		Required   []string                   `json:"required"`
	}
	if json.Unmarshal(raw, &sc) != nil {
		return nil
	}
	req := map[string]bool{}
	for _, r := range sc.Required {
		req[r] = true
	}
	var must, opt []string
	for n := range sc.Properties {
		if req[n] {
			must = append(must, n+"*")
		} else {
			opt = append(opt, n)
		}
	}
	sort.Strings(must)
	sort.Strings(opt)
	return append(must, opt...)
}
