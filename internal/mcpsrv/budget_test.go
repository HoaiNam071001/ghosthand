package mcpsrv

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Ngân sách chữ AI phải đọc (byte UTF-8; tiếng Việt ~3 byte / token). instructions + tools/list client nạp ở mọi phiên,
// get_step_types compact=true là bước đầu mọi lần tạo kịch bản – thêm node / tool / mẹo làm vượt thì viết gọn lại
// chỗ vừa thêm (hoặc dời sang type=… / topic=debug) trước khi nâng ngưỡng. Xem skill add-node-type.
const (
	budgetInstructions = 3200
	budgetToolsList    = 30000
	budgetCompactGuide = 26000
	budgetNodeLine     = 330 // một dòng "type: dùng khi…" trong bản gọn (steptypes_use.go)
	budgetTypeDoc      = 3600
)

func TestTokenBudget(t *testing.T) {
	cs, _ := connect(t)
	ctx := context.Background()
	if n := len(cs.InitializeResult().Instructions); n > budgetInstructions {
		t.Errorf("instructions %d byte > %d", n, budgetInstructions)
	}
	tl, err := cs.ListTools(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if b, _ := json.Marshal(tl.Tools); len(b) > budgetToolsList {
		t.Errorf("tools/list %d byte > %d", len(b), budgetToolsList)
	}
	r, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "get_step_types", Arguments: map[string]any{"compact": true}})
	if err != nil {
		t.Fatal(err)
	}
	text := r.Content[0].(*mcp.TextContent).Text
	if len(text) > budgetCompactGuide {
		t.Errorf("get_step_types compact %d byte > %d", len(text), budgetCompactGuide)
	}
	var g compactGuide
	json.Unmarshal([]byte(text), &g)
	for _, line := range strings.Split(g.Nodes, "\n") {
		if len(line) > budgetNodeLine {
			t.Errorf("dòng node dài %d byte > %d: %.60s…", len(line), budgetNodeLine, line)
		}
	}
	for _, d := range stepTypeDocs() {
		if b, _ := json.Marshal(d); len(b) > budgetTypeDoc {
			t.Errorf("get_step_types type=%s %d byte > %d", d.Type, len(b), budgetTypeDoc)
		}
	}
}
