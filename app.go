package main

import (
	"context"
	"runtime"
	"sync"

	"ghosthand/internal/api"
	"ghosthand/internal/mcpclient"
	"ghosthand/internal/mcpsrv"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
	"ghosthand/internal/winfloat"
)

// App struct
type App struct {
	ctx context.Context

	mu        sync.Mutex
	sess      *session.Manager          // phiên chạy (nút Chạy, API, CLI, hẹn giờ)
	hub       *api.Hub                  // event cho SSE của API local
	revs      *store.Revisions          // revision file kịch bản (storage.go)
	apiSrv    *api.Server               // API local (apiserver.go)
	apiCLI    *api.Listener             // kênh cho CLI – luôn bật
	apiExt    *api.Listener             // cổng cho chương trình khác – theo Cài đặt
	schedRuns map[string]model.Schedule // file kịch bản → hẹn giờ đang chạy nó (scheduleapi.go – thông báo khi xong)
	stopBg    context.CancelFunc        // dừng bộ hẹn giờ
	mode      string                    // chế độ cửa sổ hiện tại, xem window.go
	mainRect  winRect                   // vị trí/kích thước main để khôi phục
	mainMax   bool                      // main đang phóng to (nút phóng to trên thanh tiêu đề) – phóng to lại khi quay về
	mainDisp  int                       // màn chứa cửa sổ main lúc rời main (chỉ số displays()), quay về main thì dời về đây
	winDisp   int                       // màn cửa sổ đang nằm (-1 = chưa biết)
	ovDisp    int                       // màn người dùng chọn cho overlay (-1 = màn chứa cửa sổ app)
	dirty     bool                      // kịch bản đang soạn có thay đổi chưa lưu (storage.go)
	editPath  string                    // file của kịch bản đang soạn ("" = chưa lưu)
	mcp       *mcpsrv.Server            // MCP cho AI (mcpapi.go)
	mcpc      *mcpclient.Manager        // app làm MCP client tới server ngoài (mcpserversapi.go)
	quitting  bool                      // đã hỏi xong, đóng thật
	ai        aiGate                    // hỏi quyền AI chạy (mcprun.go)
	// app do AI mở nền (`--background`, bước 31b): khởi động ẩn, AI chạy thì chỉ hiện thanh mini; người dùng mở màn chính thì thôi
	background bool

	web        *web.Chrome        // Chrome của app cho giao diện (webapi.go) – tạo lười
	pickCancel context.CancelFunc // huỷ lần Chọn phần tử đang chờ

	upd updateState // bản mới đã hỏi được + đang cập nhật (updateapi.go)
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{mode: ModeMain, winDisp: -1, ovDisp: -1, hub: api.NewHub(), mcpc: &mcpclient.Manager{}, revs: store.NewRevisions(), schedRuns: map[string]model.Schedule{},
		ai: aiGate{pending: map[string]chan string{}, allowed: map[string]bool{}}}
	a.sess = session.New(a.emit, session.Deps{})
	a.sess.OnEnd = a.onRunEnd
	return a
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.startHotkeys()
	a.startAPI()
	bg, stop := context.WithCancel(ctx)
	a.stopBg = stop
	a.startScheduler(bg)
	a.checkUpdateAtStart(bg)
	winfloat.FollowActiveSpace() // macOS: màn chính hiện ở Space đang đứng
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	a.StopScript()
	a.CancelPick()
	a.stopHotkeys()
	a.stopAPI()
	a.mcpc.CloseAll()
	if a.stopBg != nil {
		a.stopBg()
	}
}

// NewStep trả bước mới với giá trị mặc định theo loại – dùng cho nút "+ Thêm bước".
func (a *App) NewStep(stepType string) (model.Step, error) { return model.NewStep(stepType) }

// NewScript trả kịch bản rỗng mặc định.
func (a *App) NewScript() model.Script { return model.NewScript() }

// StepTypes trả mô tả các loại bước app đang hỗ trợ.
func (a *App) StepTypes() []model.StepTypeDoc { return model.StepTypeDocs() }

// Platform – hệ điều hành đang chạy (GOOS: darwin | windows) để UI báo loại node không chạy được ở đây.
func (a *App) Platform() string { return runtime.GOOS }

// StepOnlyOS – loại node chỉ chạy trên một số hệ điều hành (loại vắng = chạy cả macOS + Windows).
func (a *App) StepOnlyOS() map[string][]string { return model.OnlyOS() }

// FlowGuide trả hướng dẫn cấu trúc flow, trường chung và kịch bản mẫu (cho AI / MCP, bước 31).
func (a *App) FlowGuide() model.FlowGuideDoc { return model.Guide() }

// GetSettings trả cấu hình đã lưu (mặc định nếu chưa có / không đọc được thư mục cấu hình).
func (a *App) GetSettings() store.Settings { return store.CurrentSettings() }

// SetOverlaySettings lưu cài đặt overlay (cạnh đặt thanh công cụ – bước 49).
func (a *App) SetOverlaySettings(o store.OverlaySettings) error { return store.SetOverlay(o) }

// SetTheme lưu theme: light | dark | system.
func (a *App) SetTheme(theme string) error { return store.SetTheme(theme) }

// GetInputMemory trả giá trị lần trước / preset của kịch bản id (đường dẫn file, hoặc tên khi chưa lưu).
func (a *App) GetInputMemory(id string) store.InputMemory { return store.InputMemoryFor(id) }

// SaveInputMemory ghi giá trị lần trước / preset của kịch bản id.
func (a *App) SaveInputMemory(id string, m store.InputMemory) error {
	return store.SaveInputMemory(id, m)
}
