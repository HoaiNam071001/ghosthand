package script

import (
	"encoding/json"
	"strings"

	"ghosthand/internal/model"
)

// Node Gọi tool MCP (bước 55 M3): dữ liệu đủ để chạy. Server có tồn tại ở máy này hay không không kiểm ở đây
// (kịch bản phải mở được ở máy chưa cài server) – engine báo lúc chạy.
func validateMCPTool(i int, s model.Step) error {
	if strings.TrimSpace(s.MCPServer) == "" {
		return stepErr(i, s, "mcpServer", "chưa chọn server MCP")
	}
	if strings.TrimSpace(s.MCPTool) == "" {
		return stepErr(i, s, "mcpTool", "chưa chọn tool MCP")
	}
	// có {{biến}} thì chỉ biết dạng khi chạy
	if a := strings.TrimSpace(s.MCPArgs); a != "" && !strings.Contains(a, "{{") {
		var m map[string]any
		if err := json.Unmarshal([]byte(a), &m); err != nil {
			return stepErr(i, s, "mcpArgs", "đối số tool phải là JSON object, vd {\"path\":\"/tmp\"}")
		}
	}
	return nil
}
