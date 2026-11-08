package mcpsrv

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/store"
)

// shotContent – gọi screenshot, trả JSON đầu + số ảnh + chữ cuối.
func shotContent(t *testing.T, cs *mcp.ClientSession, args map[string]any) (map[string]any, int, string) {
	t.Helper()
	res, err := cs.CallTool(context.Background(), &mcp.CallToolParams{Name: "screenshot", Arguments: args})
	if err != nil || res.IsError {
		t.Fatalf("screenshot: %v %v", err, res)
	}
	var out map[string]any
	_ = json.Unmarshal([]byte(res.Content[0].(*mcp.TextContent).Text), &out)
	imgs, last := 0, ""
	for _, c := range res.Content {
		switch c := c.(type) {
		case *mcp.ImageContent:
			imgs++
		case *mcp.TextContent:
			last = c.Text
		}
	}
	return out, imgs, last
}

func TestNoImagesSetting(t *testing.T) {
	cs, back := connect(t)
	area := map[string]any{"x": 0, "y": 0, "w": 1000, "h": 800}
	if _, n, _ := shotContent(t, cs, area); n != 1 {
		t.Fatalf("mặc định phải gửi ảnh, có %d", n)
	}
	back.settings = store.MCPSettings{Enabled: true, NoImages: true}
	out, n, last := shotContent(t, cs, area)
	if n != 0 || !strings.Contains(last, "Gửi ảnh cho AI") || out["area"] == nil {
		t.Fatalf("tắt ảnh: %d ảnh, %q, %v", n, last, out)
	}
}

func TestScreenshotCursor(t *testing.T) {
	cs, _ := connect(t)
	out, _, _ := shotContent(t, cs, map[string]any{"x": 0, "y": 0, "w": 1000, "h": 800, "cursor": true})
	if c, _ := out["cursor"].(map[string]any); c["x"] != float64(300) || c["outside"] != nil {
		t.Fatalf("cursor trong vùng: %v", out["cursor"])
	}
	out, _, _ = shotContent(t, cs, map[string]any{"x": 500, "y": 0, "w": 100, "h": 100, "cursor": true})
	if c, _ := out["cursor"].(map[string]any); c["outside"] != true {
		t.Fatalf("cursor ngoài vùng: %v", out["cursor"])
	}
}
