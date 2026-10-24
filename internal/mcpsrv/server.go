// Package mcpsrv – MCP server cho AI (bước 31): Claude / Cursor / Codex… tạo, đọc, sửa kịch bản trong app.
// Route /mcp (Streamable HTTP, stateless, trả JSON) gắn vào API local (internal/api) – cùng 127.0.0.1 + token;
// `ghosthand --mcp` (stdio) chuyển tiếp vào đây (internal/cli). Việc thật (file, app đang mở) ở Backend (main).
// Thiết kế cho mọi AI: tham số phẳng, ít tool, chữ (JSON) trong kết quả, lỗi có cấu trúc để AI tự sửa.
package mcpsrv

import (
	"context"
	"image"
	"net/http"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// Editor – kịch bản đang mở trên app.
type Editor struct {
	Path  string // "" = chưa lưu thành file
	Dirty bool   // có thay đổi chưa lưu
}

// Display – một màn hình (toạ độ robotgo).
type Display struct {
	model.Rect
	Scale float64 `json:"scale"` // tỷ lệ DPI / Retina (125 % → 1.25)
	Main  bool    `json:"main"`
}

// Backend – việc thật (main.App). path luôn là đường dẫn tuyệt đối.
type Backend interface {
	Enabled() bool // công tắc MCP trong Cài đặt
	// ToolAllowed – loại AI client ("" = không rõ) được gọi tool này không (Cài đặt → MCP, 31b2).
	ToolAllowed(client, tool string) bool
	Recent() []string
	Editor() Editor
	ScriptsDir() (string, error) // thư mục mặc định cho kịch bản AI tạo
	ReadScript(path string) (model.Script, int, error)
	// WriteScript ghi file (kiểm tra cấu trúc, revision -1 = không so – file mới), báo app nạp lại, thêm vào Mở gần đây.
	WriteScript(path string, sc model.Script, revision int) (int, error)
	OpenInApp(path string) error
	Displays() []Display
	SecretNames() []string // tên bí mật trong kho (bước 43 S10) – KHÔNG bao giờ có giá trị

	// Chạy (31b): Run hỏi quyền theo công tắc AI (Cài đặt) rồi session.Start kịch bản sc (đọc từ path; path "" = kịch bản
	// tạm AI gửi kèm – 46 B1); Wait / Trace / Stop theo runId.
	Run(sc model.Script, path string, values map[string]any, opt session.Options) (string, error)
	Wait(ctx context.Context, id string) error
	Trace(id string) (session.Trace, error)
	Stop(id string) bool

	// Nhìn màn hình (31b).
	Capture(r model.Rect) (image.Image, error)
	ReadText(img image.Image) ([]vision.TextLine, error)
	Windows() ([]model.WindowInfo, error) // theo thứ tự chồng – trên cùng trước
	// Elements – cây phần tử AX / UIA của app ("" = app có cửa sổ trên cùng) – cây rút gọn, ảnh đánh số, selector (43 A).
	Elements(app string) ([]element.Node, error)

	// Thử trang + ưu tiên node (44): MCP – cài đặt MCP hiện tại; CheckPage theo mức AI (Chỉ soạn → từ chối);
	// SetNodePref lưu + báo người dùng.
	MCP() store.MCPSettings
	CheckPage(ctx context.Context, url string) (web.PageCheck, error)
	// ReadOutline – read_web_outline: cây rút gọn của tab (id / URL / tiêu đề; rỗng = tab đang hiện) + các tab đang mở
	ReadOutline(ctx context.Context, tab string, onlyDialog bool) (web.Outline, []web.Tab, error)
	// TabShot – screenshot webTab (46 B4): ảnh khung nhìn một tab Chrome của app qua CDP (không bật trình duyệt).
	TabShot(ctx context.Context, tab string) (web.TabShot, error)
	SetNodePref(p string) error
}

// Server – MCP server + nhật ký lệnh AI đã gọi.
type Server struct {
	back Backend
	mcp  *mcp.Server
	log  *CallLog
	acc  access
	temp tempScripts // kịch bản tạm của run_script (không có file) theo runId
	snap snapshots   // cây phần tử AI vừa xem (số # → phần tử) và cây “trước” của screen_changes (43 A)
}

const instructions = `Ghosthand – app tự động click / gõ theo kịch bản dạng flow (node + cạnh, như n8n).
Tạo kịch bản: đọc get_step_types compact=true (danh sách gọn mọi node + khi nào dùng; chi tiết một loại: type=…; hoặc resource ghosthand://guide) → viết kịch bản → validate_script → create_script.
Sửa: read_script (lấy revision) → update_script theo id / ref node. Thiếu thông tin (app nào, giá trị nào là input) thì hỏi lại người dùng trước.
Thử – sửa: run_script (cả / stopAt / only; script = kịch bản tạm, không tạo file) → node lỗi có error.detail + ảnh → update_script (kịch bản tạm: gửi script sửa vào resume_run) → resume_run (chạy tiếp từ node lỗi, giữ biến).
Xem màn hình: describe_screen (chữ + cửa sổ, rẻ) trước, screenshot khi cần nhìn. App có Accessibility: describe_screen elements=true (cây phần tử đánh số #N) hoặc screenshot marks=true → suggest_selector {mark} lấy selector bền cho node phần tử (không dùng toạ độ cứng); screen_changes start/end để biết thao tác có tác dụng không. Người dùng muốn xem / tự chạy: open_in_app.
Trang web: get_preferences – nodePref web thì probe_page(url) trước, verdict ok mới dùng node web; mặc định (vision) dùng node ảnh / chữ.
Đang thao tác dở trên trang (popup, hộp thoại): read_web_outline (dialog true = chỉ hộp thoại) lấy selector, tab = id tab trong tabs.
App có thể chỉ cho soạn hoặc hỏi người dùng trước khi chạy (Cài đặt) – bị từ chối thì báo người dùng, không thử lại liên tục.`

func New(back Backend) *Server {
	s := &Server{back: back, log: &CallLog{}}
	s.mcp = mcp.NewServer(&mcp.Implementation{Name: "ghosthand", Title: "Ghosthand", Version: "1.0"},
		&mcp.ServerOptions{Instructions: instructions})
	s.mcp.AddReceivingMiddleware(s.log.middleware, s.accessMiddleware)
	s.addReadTools()
	s.addElementTools()
	s.addWriteTools()
	s.addRunTools()
	s.addScreenTools()
	s.addWebTools()
	s.addDocs()
	return s
}

// Handler – http.Handler cho route /mcp. Stateless + JSON: mỗi request độc lập, proxy stdio chỉ cần POST từng dòng.
func (s *Server) Handler() http.Handler {
	h := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return s.mcp },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true})
	wrapped := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.back.Enabled() {
			http.Error(w, "MCP đang tắt – bật trong Cài đặt của app Ghosthand", http.StatusForbidden)
			return
		}
		h.ServeHTTP(w, r)
	})
	return withClient(wrapped)
}

// Log – nhật ký các lệnh AI đã gọi (mới nhất trước).
func (s *Server) Log() []Call { return s.log.list() }

// Call – một lần AI gọi tool.
type Call struct {
	At    time.Time `json:"at"`
	Tool  string    `json:"tool"`
	OK    bool      `json:"ok"`
	Error string    `json:"error,omitempty"`
}

const maxCalls = 50

type CallLog struct {
	mu    sync.Mutex
	calls []Call
}

func (l *CallLog) middleware(next mcp.MethodHandler) mcp.MethodHandler {
	return func(ctx context.Context, method string, req mcp.Request) (mcp.Result, error) {
		res, err := next(ctx, method, req)
		if p, ok := req.GetParams().(*mcp.CallToolParamsRaw); ok && method == "tools/call" {
			c := Call{At: time.Now(), Tool: p.Name, OK: err == nil}
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
