package mcpsrv

import (
	"context"
	"errors"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// update_app (59 U5): AI kiểm / cài bản Release mới rồi test lại. Cài chạy nền, app thoát + mở lại; proxy --mcp tự
// nối lại (59 U4) nên AI chỉ cần gọi app_info sau đó.

// UpdateStatus – kết quả check.
type UpdateStatus struct {
	Current    string `json:"current"`
	Latest     string `json:"latest"`
	Newer      bool   `json:"newer"`
	Notes      string `json:"notes,omitempty"`
	Installing bool   `json:"installing,omitempty"` // đang tải / cài
	LastError  string `json:"lastError,omitempty"`  // lần install trước lỗi – app vẫn bản cũ
}

type updateAppIn struct {
	Action string `json:"action" jsonschema:"check | install"`
}

func (s *Server) addUpdateTools() {
	addTool(s, KindApp, &mcp.Tool{Name: "update_app", Description: "Release mới của app: check | install (cài + mở lại, rồi app_info). Chỉ khi người dùng bảo."}, s.updateApp)
}

func (s *Server) updateApp(ctx context.Context, _ *mcp.CallToolRequest, in updateAppIn) (*mcp.CallToolResult, any, error) {
	switch in.Action {
	case "check":
		st, err := s.back.CheckUpdate(ctx)
		if err != nil {
			return fail(err)
		}
		return ok(st)
	case "install":
		v, err := s.back.InstallUpdate(ctx)
		if err != nil {
			return fail(err)
		}
		return ok(map[string]any{"installing": v,
			"next": "app đang tải + cài rồi tự mở lại (thường < 1 phút) – gọi app_info, version = " + v + " là xong; vẫn bản cũ thì update_app check xem lastError"})
	}
	return fail(errors.New("action phải là check hoặc install"))
}
