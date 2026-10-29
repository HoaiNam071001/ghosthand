// Package mcpclient – app làm MCP client: nối tới MCP server khác (stdio hoặc HTTP / SSE từ xa) để node mcpTool gọi tool
// (bước 55). Mọi thứ trả về đều là dữ liệu – không bao giờ diễn giải thành lệnh. Env / header đã được thay {{secret.*}}
// trước khi vào đây; lời báo lỗi không chứa chúng.
package mcpclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Kiểu kết nối (Config.Kind).
const (
	KindStdio = "stdio" // chạy lệnh, nói chuyện qua stdin / stdout
	KindHTTP  = "http"  // streamable HTTP từ xa
	KindSSE   = "sse"   // SSE từ xa (kiểu cũ)
)

// Thời gian chờ mặc định.
const (
	ConnectTimeout = 30 * time.Second
	CallTimeout    = 60 * time.Second
)

// Config – cách nối tới một server (đã thay biến).
type Config struct {
	ID      string
	Kind    string
	Command string
	Args    []string
	Env     map[string]string // thêm vào môi trường của tiến trình con
	URL     string
	Headers map[string]string // vd Authorization: Bearer …
}

// Tool – một tool của server; Read / Destructive / OpenWorld lấy từ annotations (nil = server không khai).
type Tool struct {
	Name        string          `json:"name"`
	Title       string          `json:"title,omitempty"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"inputSchema,omitempty"`
	ReadOnly    bool            `json:"readOnly,omitempty"`
	Destructive *bool           `json:"destructive,omitempty"`
	OpenWorld   *bool           `json:"openWorld,omitempty"`
}

// Content – một phần kết quả. Kind: text / image / audio / resource.
type Content struct {
	Kind string `json:"kind"`
	Text string `json:"text,omitempty"`
	MIME string `json:"mime,omitempty"`
	Data []byte `json:"data,omitempty"` // image / audio (đã giải base64)
	URI  string `json:"uri,omitempty"`
}

// ErrDenied – người dùng không cho dùng server / tool (hộp hỏi quyền) – engine báo lỗi permission.
var ErrDenied = errors.New("người dùng không cho dùng server / tool MCP này")

// Result – kết quả một lần gọi. IsError = tool báo lỗi (khác lỗi kết nối).
type Result struct {
	Content    []Content `json:"content"`
	Structured any       `json:"structured,omitempty"`
	IsError    bool      `json:"isError,omitempty"`
}

// Text ghép mọi phần chữ.
func (r Result) Text() string {
	var parts []string
	for _, c := range r.Content {
		if c.Kind == "text" {
			parts = append(parts, c.Text)
		}
	}
	return strings.Join(parts, "\n")
}

// Client – một server đã cấu hình.
type Client interface {
	ListTools(ctx context.Context) ([]Tool, error)
	CallTool(ctx context.Context, name string, args map[string]any) (Result, error)
	Close() error
}

// Mã lỗi (Error.Code).
const (
	CodeConfig  = "mcp_config"  // thiếu lệnh / URL, kiểu lạ
	CodeConnect = "mcp_connect" // không chạy được lệnh / không nối được
	CodeCall    = "mcp_call"    // server trả lỗi giao thức, hết giờ, mất kết nối giữa chừng
)

// Error – lỗi có cấu trúc.
type Error struct {
	Code string
	Msg  string
}

func (e *Error) Error() string { return e.Msg }

func newErr(code, format string, a ...any) *Error {
	return &Error{Code: code, Msg: fmt.Sprintf(format, a...)}
}

// Validate kiểm tra cấu hình, không chạy gì.
func (c Config) Validate() error {
	switch c.Kind {
	case KindStdio:
		if strings.TrimSpace(c.Command) == "" {
			return newErr(CodeConfig, "server stdio chưa có lệnh")
		}
	case KindHTTP, KindSSE:
		if !strings.HasPrefix(c.URL, "http://") && !strings.HasPrefix(c.URL, "https://") {
			return newErr(CodeConfig, "địa chỉ server phải bắt đầu bằng http:// hoặc https://")
		}
	default:
		return newErr(CodeConfig, "kiểu server %q không hỗ trợ (stdio / http / sse)", c.Kind)
	}
	return nil
}

func (c Config) transport() (mcp.Transport, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if c.Kind == KindStdio {
		cmd := exec.Command(c.Command, c.Args...)
		cmd.Env = os.Environ()
		for k, v := range c.Env {
			cmd.Env = append(cmd.Env, k+"="+v)
		}
		hideWindow(cmd)
		return &mcp.CommandTransport{Command: cmd, TerminateDuration: 3 * time.Second}, nil
	}
	hc := &http.Client{Transport: headerTransport{h: c.Headers, next: http.DefaultTransport}}
	if c.Kind == KindSSE {
		return &mcp.SSEClientTransport{Endpoint: c.URL, HTTPClient: hc}, nil
	}
	return &mcp.StreamableClientTransport{Endpoint: c.URL, HTTPClient: hc}, nil
}

type headerTransport struct {
	h    map[string]string
	next http.RoundTripper
}

func (t headerTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	r = r.Clone(r.Context())
	for k, v := range t.h {
		r.Header.Set(k, v)
	}
	return t.next.RoundTrip(r)
}

// session bọc ClientSession của SDK thành Client.
type session struct{ cs *mcp.ClientSession }

func connect(ctx context.Context, tr mcp.Transport) (Client, error) {
	ctx, cancel := context.WithTimeout(ctx, ConnectTimeout)
	defer cancel()
	c := mcp.NewClient(&mcp.Implementation{Name: "ghosthand", Version: "1"}, nil)
	cs, err := c.Connect(ctx, tr, nil)
	if err != nil {
		return nil, newErr(CodeConnect, "không nối được tới server MCP: %v", err)
	}
	return &session{cs: cs}, nil
}

// Dial nối thật theo cấu hình.
func Dial(ctx context.Context, c Config) (Client, error) {
	tr, err := c.transport()
	if err != nil {
		return nil, err
	}
	return connect(ctx, tr)
}

// DialTransport nối qua transport có sẵn (test: in-memory).
func DialTransport(ctx context.Context, tr mcp.Transport) (Client, error) { return connect(ctx, tr) }

func (s *session) ListTools(ctx context.Context) ([]Tool, error) {
	var out []Tool
	var cursor string
	for {
		res, err := s.cs.ListTools(ctx, &mcp.ListToolsParams{Cursor: cursor})
		if err != nil {
			return nil, newErr(CodeCall, "đọc danh sách tool lỗi: %v", err)
		}
		for _, t := range res.Tools {
			out = append(out, toTool(t))
		}
		if res.NextCursor == "" {
			return out, nil
		}
		cursor = res.NextCursor
	}
}

func toTool(t *mcp.Tool) Tool {
	o := Tool{Name: t.Name, Title: t.Title, Description: t.Description}
	if b, err := json.Marshal(t.InputSchema); err == nil && string(b) != "null" {
		o.InputSchema = b
	}
	if a := t.Annotations; a != nil {
		o.ReadOnly, o.Destructive, o.OpenWorld = a.ReadOnlyHint, a.DestructiveHint, a.OpenWorldHint
		if o.Title == "" {
			o.Title = a.Title
		}
	}
	return o
}

func (s *session) CallTool(ctx context.Context, name string, args map[string]any) (Result, error) {
	res, err := s.cs.CallTool(ctx, &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return Result{}, newErr(CodeCall, "tool %s hết giờ chờ", name)
		}
		return Result{}, newErr(CodeCall, "gọi tool %s lỗi: %v", name, err)
	}
	out := Result{IsError: res.IsError, Structured: res.StructuredContent}
	for _, c := range res.Content {
		out.Content = append(out.Content, toContent(c))
	}
	return out, nil
}

func toContent(c mcp.Content) Content {
	switch v := c.(type) {
	case *mcp.TextContent:
		return Content{Kind: "text", Text: v.Text}
	case *mcp.ImageContent:
		return Content{Kind: "image", MIME: v.MIMEType, Data: v.Data}
	case *mcp.AudioContent:
		return Content{Kind: "audio", MIME: v.MIMEType, Data: v.Data}
	case *mcp.ResourceLink:
		return Content{Kind: "resource", URI: v.URI, MIME: v.MIMEType, Text: v.Name}
	case *mcp.EmbeddedResource:
		r := Content{Kind: "resource"}
		if v.Resource != nil {
			r.URI, r.MIME, r.Text = v.Resource.URI, v.Resource.MIMEType, v.Resource.Text
		}
		return r
	}
	return Content{Kind: "unknown"}
}

func (s *session) Close() error { return s.cs.Close() }
