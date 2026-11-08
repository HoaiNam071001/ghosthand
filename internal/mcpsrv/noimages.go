package mcpsrv

import (
	"context"
	"slices"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Cài đặt *Gửi ảnh cho AI: không* (56 C3): client không xem được ảnh vẫn tốn token cho ảnh base64 – bỏ mọi ảnh ở
// một chỗ (screenshot, ảnh lỗi wait_run / run_step, capture_template…) thay vì từng tool tự kiểm.
const noImagesNote = "Ảnh đã bỏ: người dùng tắt Gửi ảnh cho AI trong Cài đặt → AI qua MCP – dùng describe_screen / read_web_outline (chữ) để xem màn hình."

func (s *Server) imagesMiddleware(next mcp.MethodHandler) mcp.MethodHandler {
	return func(ctx context.Context, method string, req mcp.Request) (mcp.Result, error) {
		res, err := next(ctx, method, req)
		if r, isCall := res.(*mcp.CallToolResult); isCall && err == nil && hasImage(r) && s.back.MCP().NoImages {
			stripImages(r)
		}
		return res, err
	}
}

func isImage(c mcp.Content) bool { _, img := c.(*mcp.ImageContent); return img }

func hasImage(r *mcp.CallToolResult) bool { return slices.ContainsFunc(r.Content, isImage) }

// stripImages bỏ ảnh khỏi kết quả kèm một dòng báo (AI khỏi tưởng tool lỗi).
func stripImages(r *mcp.CallToolResult) {
	r.Content = append(slices.DeleteFunc(r.Content, isImage), &mcp.TextContent{Text: noImagesNote})
}
