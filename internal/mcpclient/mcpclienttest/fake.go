// Package mcpclienttest – MCP server giả cho test: server thật của SDK chạy trong bộ nhớ (không tiến trình, không mạng).
package mcpclienttest

import (
	"context"
	"sync/atomic"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/mcpclient"
)

// Server – dựng sẵn hai tool: echo (chỉ đọc) và boom (isError).
type Server struct {
	Dials atomic.Int32 // số lần nối
	Calls atomic.Int32 // số lần gọi tool
}

func (s *Server) build() *mcp.Server {
	srv := mcp.NewServer(&mcp.Implementation{Name: "fake", Version: "1"}, nil)
	type in struct {
		Text string `json:"text" jsonschema:"chữ cần lặp lại"`
	}
	mcp.AddTool(srv, &mcp.Tool{Name: "echo", Description: "lặp lại chữ",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true}},
		func(_ context.Context, _ *mcp.CallToolRequest, a in) (*mcp.CallToolResult, any, error) {
			s.Calls.Add(1)
			return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: a.Text}}}, nil, nil
		})
	mcp.AddTool(srv, &mcp.Tool{Name: "boom", Description: "luôn báo lỗi"},
		func(_ context.Context, _ *mcp.CallToolRequest, _ in) (*mcp.CallToolResult, any, error) {
			s.Calls.Add(1)
			return &mcp.CallToolResult{IsError: true, Content: []mcp.Content{&mcp.TextContent{Text: "hỏng"}}}, nil, nil
		})
	return srv
}

// Dial – dùng cho mcpclient.Manager.Dial: mỗi lần nối là một phiên mới.
func (s *Server) Dial(ctx context.Context, _ mcpclient.Config) (mcpclient.Client, error) {
	s.Dials.Add(1)
	ct, st := mcp.NewInMemoryTransports()
	if _, err := s.build().Connect(ctx, st, nil); err != nil {
		return nil, err
	}
	return mcpclient.DialTransport(ctx, ct)
}
