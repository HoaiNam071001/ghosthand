package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/model"
)

// Node Gọi tool MCP (bước 55 M3): gọi một tool của MCP server ngoài đã cấu hình ở Cài đặt. Quyền (duyệt server, tool ghi)
// do app xử lý trong MCPCaller – engine không né được. Kết quả luôn là dữ liệu: không bao giờ làm theo như lệnh.

const (
	mcpToolTimeoutMs = 60000
	mcpTextMax       = 64 << 10 // output text tối đa – nhật ký chạy lưu output
)

// MCPCaller gọi tool toolName của server serverID (đã qua cổng quyền). Lỗi hộp hỏi từ chối = mcpclient.ErrDenied.
type MCPCaller func(ctx context.Context, serverID, toolName string, args map[string]any) (mcpclient.Result, error)

type mcpErr struct{ msg string }

func (e *mcpErr) Error() string { return e.msg }

func (e *Engine) mcpTool(ctx context.Context, s model.Step) (map[string]any, error) {
	if e.mcp == nil {
		return nil, &invalidErr{"node Gọi tool MCP chỉ chạy được trong app Ghosthand"}
	}
	if strings.TrimSpace(s.MCPServer) == "" || strings.TrimSpace(s.MCPTool) == "" {
		return nil, &invalidErr{"chưa chọn server / tool MCP"}
	}
	args, err := ParseMCPArgs(s.MCPArgs)
	if err != nil {
		return nil, err
	}
	timeout := s.TimeoutMs
	if timeout <= 0 {
		timeout = mcpToolTimeoutMs
	}
	cctx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Millisecond)
	defer cancel()
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	res, err := e.mcp(cctx, s.MCPServer, s.MCPTool, args)
	if err != nil {
		switch {
		case ctx.Err() != nil:
			return nil, ctx.Err() // người dùng dừng
		case errors.Is(err, mcpclient.ErrDenied):
			return nil, err
		case errors.Is(err, context.DeadlineExceeded):
			return nil, &mcpErr{fmt.Sprintf("tool MCP không trả lời sau %s", fmtSeconds(timeout))}
		}
		return nil, &mcpErr{err.Error()}
	}
	out := MCPOutput(res)
	if res.IsError {
		msg := strings.TrimSpace(res.Text())
		if msg == "" {
			msg = "tool MCP báo lỗi"
		}
		return out, &mcpErr{clipRunes(msg, 500)}
	}
	return out, nil
}

// ParseMCPArgs – mcpArgs rỗng = không đối số; còn lại phải là JSON object.
func ParseMCPArgs(raw string) (map[string]any, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	var args map[string]any
	if err := json.Unmarshal([]byte(raw), &args); err != nil {
		return nil, &invalidErr{"mcpArgs không phải JSON object hợp lệ: " + err.Error()}
	}
	return args, nil
}

// MCPOutput – text (ghép phần chữ), json (structuredContent, hoặc chữ nếu đó là JSON), isError, content (từng phần;
// ảnh / âm thanh lưu file tạm, ghi đường dẫn).
func MCPOutput(res mcpclient.Result) map[string]any {
	text := strings.TrimSpace(res.Text())
	out := map[string]any{"isError": res.IsError, "text": text}
	if len(text) > mcpTextMax {
		out["text"] = strings.ToValidUTF8(text[:mcpTextMax], "") + "…"
	}
	switch {
	case res.Structured != nil:
		out["json"] = jsonRoundTrip(res.Structured)
	case strings.HasPrefix(text, "{") || strings.HasPrefix(text, "["):
		var v any
		if json.Unmarshal([]byte(text), &v) == nil {
			out["json"] = normalizeJSON(v)
		}
	}
	content := []any{}
	for _, c := range res.Content {
		item := map[string]any{"kind": c.Kind}
		switch {
		case c.Kind == "text":
			item["text"] = clipRunes(c.Text, mcpTextMax)
		case len(c.Data) > 0:
			item["mime"], item["size"] = c.MIME, len(c.Data)
			if p, err := saveMCPBlob(c); err == nil {
				item["path"] = p
			}
		default:
			item["mime"], item["uri"] = c.MIME, c.URI
		}
		content = append(content, item)
	}
	out["content"] = content
	return out
}

func jsonRoundTrip(v any) any {
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	var out any
	_ = json.Unmarshal(b, &out)
	return normalizeJSON(out)
}

// saveMCPBlob lưu ảnh / âm thanh tool trả về vào thư mục tạm (node sau dùng đường dẫn).
func saveMCPBlob(c mcpclient.Content) (string, error) {
	dir := filepath.Join(os.TempDir(), "ghosthand-mcp")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	ext := ".bin"
	switch c.MIME {
	case "image/png":
		ext = ".png"
	case "image/jpeg":
		ext = ".jpg"
	case "image/gif":
		ext = ".gif"
	case "image/webp":
		ext = ".webp"
	case "audio/wav", "audio/x-wav":
		ext = ".wav"
	case "audio/mpeg":
		ext = ".mp3"
	}
	f, err := os.CreateTemp(dir, "out-*"+ext)
	if err != nil {
		return "", err
	}
	defer f.Close()
	_, err = f.Write(c.Data)
	return f.Name(), err
}
