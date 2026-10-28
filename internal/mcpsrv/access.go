package mcpsrv

import (
	"context"
	"net/http"
	"slices"
	"sort"
	"sync"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Chọn tool cho từng loại AI (bước 31b2). /mcp chạy stateless nên tên client không nhớ được giữa các request:
// proxy `--mcp` đọc clientInfo.name lúc initialize rồi gắn header ClientHeader vào mọi request sau; client nối HTTP
// thì thêm ?client=<tên> vào URL. Không biết tên → dùng mặc định chung.

// ClientHeader – header chứa tên loại AI (do proxy stdio gắn).
const ClientHeader = "X-Ghosthand-Client"

// Nhóm tool – nhãn trong Cài đặt.
const (
	KindRead     = "read"     // chỉ đọc / kiểm tra
	KindWrite    = "write"    // sửa kịch bản
	KindRun      = "run"      // chạy trên máy thật (chuột / phím)
	KindScreen   = "screen"   // nhìn màn hình
	KindApp      = "app"      // mở trong app
	KindSettings = "settings" // đổi cài đặt của app (ưu tiên node – 44)
)

// ToolInfo – một tool trong bảng Cài đặt.
type ToolInfo struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
	Desc string `json:"desc"`
}

// Access – ai được gọi tool nào (Backend).
type access struct {
	mu    sync.Mutex
	tools []ToolInfo
	seen  map[string]bool
}

// addTool đăng ký tool vào server và vào bảng tool của Cài đặt (một nơi duy nhất – tool mới tự có dòng).
func addTool[In, Out any](s *Server, kind string, t *mcp.Tool, h mcp.ToolHandlerFor[In, Out]) {
	if t.Annotations == nil {
		t.Annotations = annotationsFor(kind, t.Name)
	}
	mcp.AddTool(s.mcp, t, h)
	s.acc.tools = append(s.acc.tools, ToolInfo{Name: t.Name, Kind: kind, Desc: t.Description})
}

// Tools – mọi tool của server, theo thứ tự đăng ký.
func (s *Server) Tools() []ToolInfo { return slices.Clone(s.acc.tools) }

// Clients – tên các loại AI đã kết nối từ lúc mở app (cho Cài đặt chọn ghi đè), theo chữ cái.
func (s *Server) Clients() []string {
	s.acc.mu.Lock()
	defer s.acc.mu.Unlock()
	out := make([]string, 0, len(s.acc.seen))
	for c := range s.acc.seen {
		out = append(out, c)
	}
	sort.Strings(out)
	return out
}

func (s *Server) noteClient(name string) {
	if name == "" {
		return
	}
	s.acc.mu.Lock()
	defer s.acc.mu.Unlock()
	if s.acc.seen == nil {
		s.acc.seen = map[string]bool{}
	}
	s.acc.seen[name] = true
}

// clientName – tên loại AI của request: header (proxy) → ?client= đã được Handler đưa vào header.
func clientName(req mcp.Request) string {
	if ex := req.GetExtra(); ex != nil {
		return ex.Header.Get(ClientHeader)
	}
	return ""
}

// middleware: ghi nhận client, lọc tools/list, từ chối tools/call tool bị tắt.
func (s *Server) accessMiddleware(next mcp.MethodHandler) mcp.MethodHandler {
	return func(ctx context.Context, method string, req mcp.Request) (mcp.Result, error) {
		client := clientName(req)
		switch p := req.GetParams().(type) {
		case *mcp.InitializeParams:
			if p.ClientInfo != nil {
				s.noteClient(p.ClientInfo.Name)
			}
		case *mcp.CallToolParamsRaw:
			if method == "tools/call" {
				s.noteClient(client)
				if !s.back.ToolAllowed(client, p.Name) {
					r, _, _ := ok(map[string]any{"code": "tool_disabled",
						"error": "Tool " + p.Name + " đang bị tắt cho AI này trong Cài đặt của app Ghosthand – hỏi người dùng nếu cần bật."})
					r.IsError = true
					return r, nil
				}
			}
		}
		res, err := next(ctx, method, req)
		if r, ok := res.(*mcp.ListToolsResult); ok && err == nil && method == "tools/list" {
			s.noteClient(client)
			r.Tools = slices.DeleteFunc(slices.Clone(r.Tools), func(t *mcp.Tool) bool { return !s.back.ToolAllowed(client, t.Name) })
		}
		return res, err
	}
}

// withClient – ?client=<tên> (client nối thẳng HTTP) thành header như proxy stdio, nếu chưa có.
func withClient(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if q := r.URL.Query().Get("client"); q != "" && r.Header.Get(ClientHeader) == "" {
			r.Header.Set(ClientHeader, q)
		}
		next.ServeHTTP(w, r)
	})
}
