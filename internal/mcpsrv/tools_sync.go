package mcpsrv

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// sync_status (bước 54 C10): AI chỉ biết đồng bộ cloud đang ở trạng thái nào để báo người dùng. KHÔNG có tool bật đồng bộ /
// đăng nhập / đặt cụm mật khẩu / giải bí mật (AI không được tự đẩy dữ liệu ra ngoài), và không lộ tên máy, tên file,
// thông báo lỗi (có thể chứa đường dẫn / tên tài khoản) – chỉ cờ và số đếm.

// SyncInfo – trạng thái đồng bộ cho Backend trả.
type SyncInfo struct {
	On        bool   `json:"on"`                // đã bật ít nhất một phần phạm vi
	Backend   string `json:"backend,omitempty"` // gdrive | mcp
	LoggedIn  bool   `json:"loggedIn"`          // gdrive: còn đăng nhập; mcp: server đang bật
	Running   bool   `json:"running,omitempty"`
	LastAt    string `json:"lastAt,omitempty"` // RFC3339 lần xong gần nhất
	Failed    bool   `json:"failed,omitempty"` // lượt gần nhất lỗi (xem chi tiết ở Cài đặt → Đồng bộ)
	Conflicts int    `json:"conflicts,omitempty"`
	Missing   int    `json:"missing,omitempty"` // tệp đi kèm không đọc được
	Held      int    `json:"held,omitempty"`    // hoãn vì đang soạn dở
}

func (s *Server) syncStatus(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	return ok(s.back.SyncInfo())
}
