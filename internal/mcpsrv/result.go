package mcpsrv

import (
	"errors"
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/store"
)

// ok – kết quả tool dạng chữ JSON (client không đọc structuredContent vẫn dùng được). Không thụt lề, không đổi < > &
// thành \u003c… – AI đọc như nhau mà ít token hơn.
func ok(v any) (*mcp.CallToolResult, any, error) {
	b, err := script.MarshalRaw(v)
	if err != nil {
		return nil, nil, err
	}
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: string(b)}}}, nil, nil
}

// fail – lỗi tool (isError) có mã + chi tiết node / trường để AI tự sửa rồi gọi lại.
func fail(err error) (*mcp.CallToolResult, any, error) {
	r, _, e := ok(errorBody(err))
	if e != nil {
		return nil, nil, e
	}
	r.IsError = true
	return r, nil, nil
}

// errorBody – {error, code, detail?}; code: invalid | not_found | conflict | busy.
func errorBody(err error) map[string]any {
	body := map[string]any{"error": err.Error(), "code": "invalid"}
	var se *model.ScriptError
	var ce *store.ConflictError
	switch {
	case errors.As(err, &ce):
		body["code"], body["revision"] = ce.Code(), ce.Have
		body["error"] = err.Error() + " (read_script lấy bản mới)"
	case errors.Is(err, fs.ErrNotExist):
		body["code"] = "not_found"
	case errors.As(err, &se):
		body["detail"] = se
	}
	return body
}

// resolvePath – đường dẫn tuyệt đối; tên trơn (vd "Mở nhạc" / "Mở nhạc.json") → kịch bản cùng tên trong danh sách,
// không có thì trong thư mục kịch bản của AI.
func (s *Server) resolvePath(p string) (string, error) {
	p = strings.TrimSpace(p)
	if p == "" {
		return "", errors.New("thiếu path (đường dẫn hoặc tên kịch bản – xem list_scripts)")
	}
	if filepath.IsAbs(p) {
		return filepath.Clean(p), nil
	}
	name := strings.TrimSuffix(p, ".json")
	if !strings.ContainsAny(p, `/\`) {
		for _, q := range s.paths() {
			if strings.EqualFold(strings.TrimSuffix(filepath.Base(q), ".json"), name) {
				return q, nil
			}
		}
	}
	dir, err := s.back.ScriptsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, name+".json"), nil
}
