package mcpsrv

import (
	"context"
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Log – nhật ký các lệnh AI đã gọi (mới nhất trước).
func (s *Server) Log() []Call { return s.log.list() }

// Call – một lần AI gọi tool (bước 53 B1: thêm ai gọi, mất bao lâu, tham số đã che).
type Call struct {
	At     time.Time         `json:"at"`
	Tool   string            `json:"tool"`
	Client string            `json:"client,omitempty"`
	Ms     int64             `json:"ms"`
	Args   map[string]string `json:"args,omitempty"`
	OK     bool              `json:"ok"`
	Error  string            `json:"error,omitempty"`
}

const maxCalls = 50

type CallLog struct {
	mu    sync.Mutex
	calls []Call
}

func (l *CallLog) middleware(next mcp.MethodHandler) mcp.MethodHandler {
	return func(ctx context.Context, method string, req mcp.Request) (mcp.Result, error) {
		start := time.Now()
		res, err := next(ctx, method, req)
		if p, ok := req.GetParams().(*mcp.CallToolParamsRaw); ok && method == "tools/call" {
			c := Call{At: start, Tool: p.Name, Client: clientName(req), Ms: time.Since(start).Milliseconds(),
				Args: summarizeArgs(p.Arguments), OK: err == nil}
			if r, ok := res.(*mcp.CallToolResult); ok && r.IsError {
				c.OK = false
				c.Error = firstText(r)
			} else if err != nil {
				c.Error = err.Error()
			}
			l.add(c)
		}
		return res, err
	}
}

func (l *CallLog) add(c Call) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.calls = append([]Call{c}, l.calls...)
	if len(l.calls) > maxCalls {
		l.calls = l.calls[:maxCalls]
	}
}

func (l *CallLog) list() []Call {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]Call{}, l.calls...)
}

func firstText(r *mcp.CallToolResult) string {
	for _, c := range r.Content {
		if t, ok := c.(*mcp.TextContent); ok {
			return t.Text
		}
	}
	return ""
}

const (
	argMaxLen   = 120
	argMaskText = "••••"
)

// khoá tham số có thể chứa bí mật – che giá trị, chỉ giữ chữ biến {{secret.x}} (kịch bản đi qua biến, không lộ giá trị)
var sensitiveKey = regexp.MustCompile(`(?i)secret|token|password|passwd|api[_-]?key|authorization|credential`)

var secretVar = regexp.MustCompile(`^\{\{\s*secret\.[^}]+\}\}$`)

// summarizeArgs – tham số của lệnh AI để ghi nhật ký: chỉ giá trị đơn giản (chữ / số / bool) đã cắt gọn; kịch bản,
// danh sách node, ảnh base64 (object / mảng / chuỗi dài) không ghi nội dung.
func summarizeArgs(raw json.RawMessage) map[string]string {
	var m map[string]any
	if len(raw) == 0 || json.Unmarshal(raw, &m) != nil || len(m) == 0 {
		return nil
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		switch x := v.(type) {
		case string:
			switch {
			case secretVar.MatchString(x):
				out[k] = x
			case sensitiveKey.MatchString(k):
				out[k] = argMaskText
			default:
				out[k] = clip(x)
			}
		case float64, bool:
			if sensitiveKey.MatchString(k) {
				out[k] = argMaskText
			} else if b, err := json.Marshal(x); err == nil {
				out[k] = string(b)
			}
		case nil:
		default:
			out[k] = "(dữ liệu)" // object / mảng: có thể là cả kịch bản
		}
	}
	return out
}

// clip cắt theo ký tự (không cắt giữa chữ tiếng Việt); chuỗi rất dài (ảnh base64, nội dung file) chỉ ghi độ dài.
func clip(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	r := []rune(s)
	if len(r) > 4*argMaxLen {
		return "(chữ dài " + strconv.Itoa(len(r)) + " ký tự)"
	}
	if len(r) > argMaxLen {
		return string(r[:argMaxLen]) + "…"
	}
	return s
}
