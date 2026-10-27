// Package engine – chạy kịch bản theo flow (node + cạnh): thao tác chuột / phím, chờ ảnh / chữ / màu, node điều khiển,
// biến, thử lại, tạm dừng / debug. Thiết bị qua device (Input, Screen, TextReader) để test bằng bản giả.
package engine

import (
	"image"
	"math/rand/v2"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"ghosthand/internal/browser"
	"ghosthand/internal/device"
	"ghosthand/internal/display"
	"ghosthand/internal/element"
	"ghosthand/internal/humanize"
	"ghosthand/internal/inputsource"
	"ghosthand/internal/launch"
	"ghosthand/internal/model"
	"ghosthand/internal/power"
	"ghosthand/internal/procinfo"
	"ghosthand/internal/shell"
	"ghosthand/internal/shortcuts"
	"ghosthand/internal/sysinfo"
	"ghosthand/internal/toast"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// Progress – tiến độ gửi sang frontend (event "engine:progress").
type Progress struct {
	Loop      int           `json:"loop"`  // vòng hiện tại, từ 1
	Loops     int           `json:"loops"` // 0 = vô hạn
	Step      int           `json:"step"`  // số thứ tự node đang chạy (theo model.FlowOrder, trong các node đang bật), từ 1
	Total     int           `json:"total"` // số node đang bật
	NodeID    string        `json:"nodeId,omitempty"`
	Ref       string        `json:"ref,omitempty"`
	Clicks    int           `json:"clicks"`
	ElapsedMs int64         `json:"elapsedMs"` // không tính thời gian tạm dừng
	Paused    bool          `json:"paused"`
	PausedBy  string        `json:"pausedBy,omitempty"` // tạm dừng không do nút Tạm dừng: PausedTouch
	Wait      *WaitProgress `json:"wait,omitempty"`     // đang chờ ảnh / pixel
	Retry     int           `json:"retry,omitempty"`    // đang thử lại lần thứ mấy (0 = lần đầu)
	Retries   int           `json:"retries,omitempty"`  // số lần thử lại tối đa của bước hiện tại
	Break     string        `json:"break,omitempty"`    // đang dừng trước node NodeID vì debug: breakpoint | step
	From      *FromPort     `json:"from,omitempty"`     // node vừa chạy xong + cổng đi ra tới node này (nil: node đầu vòng)
	Counter   *CounterLoop  `json:"counter,omitempty"`  // node Đếm / Lặp qua danh sách gần nhất còn lượt – đang ở trong vòng lặp của nó
}

// FromPort – node trước + cổng ra đã đi (thanh mini: "n2 · thất bại → n5").
type FromPort struct {
	Ref  string `json:"ref"`
	Port string `json:"port"`
}

// CounterLoop – lượt hiện tại của node Đếm / Lặp qua danh sách (thanh mini: "lượt n5 3 / 10").
type CounterLoop struct {
	Ref   string `json:"ref"`
	Count int    `json:"count"`
	Max   int    `json:"max"`
}

// progressEvery – giãn cách tối thiểu giữa 2 lần báo tiến độ trong cùng một bước (tránh dội event).
const progressEvery = 100 * time.Millisecond

// engine chạy một kịch bản. Tạo mới cho mỗi lần chạy.
type Engine struct {
	in          device.Input
	sc          model.Script
	gate        pauseGate
	screen      model.Rect                     // khung màn hình khi Region = nil (runner đặt = mainScreen); zero = gốc (0, 0)
	displays    []model.Rect                   // khung các màn (tìm ảnh "cả màn", kiểm tra vùng chụp); nil = không kiểm tra
	onProgress  func(Progress)                 // có thể nil
	intN        func(n int) int                // số ngẫu nhiên [0, n) – test thay bằng hàm cố định
	open        func(target, app string) error // bước Mở – test thay bằng hàm ghi lại
	scr         device.Screen                  // chụp màn hình / đọc màu (imagestep.go) – test thay bằng màn hình giả
	ocr         device.TextReader              // đọc chữ (tìm theo chữ, ocr.go) – test thay bằng bộ đọc giả
	prevTree    []element.Node                 // cây phần tử sau node trước (changes.go, chỉ khi ShotEach)
	elems       device.ElementReader           // phần tử màn hình qua Accessibility (elementstep.go) – test thay bằng cây giả
	clip        device.Clipboard               // clipboard (chụp màn hình chép ảnh – shot.go) – test thay bằng bản giả
	httpc       *http.Client                   // node HTTP (http.go) – thời gian chờ theo TimeoutMs của node
	trash       device.Trash                   // node Tệp / thư mục xoá vào Thùng rác (file.go) – test thay bằng bản giả
	audio       device.Audio                   // node Hệ thống – âm lượng (system.go) – test thay bằng bản giả
	wins        device.Windows                 // node Cửa sổ (window.go) – test thay bằng bản giả
	apps        device.Apps                    // node Ứng dụng (app.go) – test thay bằng bản giả
	mask        *masker                        // che bí mật ở kết quả rời engine (mask.go)
	powers      power.Backend                  // node Nguồn (power.go) – test thay bản giả
	disp        display.Backend                // node Màn hình / âm thanh (display.go) – test thay bản giả
	toasts      toast.Backend                  // node Thông báo hệ thống (toast.go) – test thay bản giả
	shortcuts   shortcuts.Backend              // node Shortcuts của hệ điều hành (osshortcut.go) – test thay bản giả
	inputs      inputsource.Backend            // node Bộ gõ (inputsource.go) – test thay bản giả
	procs       procinfo.Backend               // node Tiến trình (process.go) – test thay bản giả
	sysinfo     sysinfo.Backend                // node Thông tin máy (sysinfo.go) – test thay bản giả
	sh          shell.Runner                   // node Chạy lệnh (shell.go) – test thay bằng bản giả
	tabs        browser.Backend                // node Tab trình duyệt (browsertab.go) – test thay bằng bản giả
	allowDanger bool                           // người dùng đã xác nhận thao tác nguy hiểm của kịch bản (Options.AllowDanger)
	browser     web.Browser                    // node web (webstep.go) – nil = không điều khiển trình duyệt

	onNode   func(model.StepResult)       // mỗi node chạy xong (event engine:node) – có thể nil
	shots    map[string]image.Image       // ảnh màn hình lúc node thất bại theo tên file (nil = không chụp – runlog.go)
	failN    int                          // số ảnh lúc lỗi đã chụp (shots còn có ảnh sau mỗi node)
	eachShot bool                         // chụp sau mỗi node thành công (AI xin – shots.go)
	eachKeep []string                     // tên ảnh sau mỗi node còn giữ, cũ trước
	eachN    int                          // số ảnh sau node đã chụp (đặt tên)
	debug    bool                         // dừng ở node có Breakpoint (chạy từ app); không thì bỏ qua breakpoint
	step     atomic.Bool                  // chạy từng node: dừng trước mỗi node (StepScript bật, ResumeScript tắt)
	failed   string                       // id node làm lần chạy dừng vì lỗi (runner gửi engine:failed)
	miss     *FindResult                  // node chờ ảnh hết giờ: chỗ giống nhất (để xem lại vì sao không thấy)
	tpls     map[string]vision.Template   // ảnh mẫu đã giải mã theo id node
	ocrMemo  map[model.Rect]ocrMemo       // chữ đọc lần trước theo vùng chụp – điểm ảnh không đổi thì khỏi OCR lại (elementread.go)
	byID     map[string]model.Step        // node theo id (run đặt)
	order    map[string]int               // số thứ tự hiển thị của node (model.FlowOrder) – thanh mini
	results  map[string]*model.StepResult // kết quả lần chạy gần nhất của từng node trong vòng này
	rv       runVars                      // bảng tra biến {{nX…}} / {{last…}} / {{vars…}}
	counts   map[string]int               // node Đếm: số lần đã đi qua trong vòng này
	lists    map[string]*listCursor       // node Lặp qua danh sách: danh sách đã nạp + phần tử kế (foreach.go)
	stopAt   string                       // Options.StopAt
	sim      *Simulate                    // Options.Simulate
	pins     map[string]model.StepResult  // Options.Pins
	seed     *Carry                       // Options.Seed
	shotsDir string                       // Options.ShotsDir
	reached  bool                         // đã tới StopAt
	timedOut bool                         // dừng vì hết MaxMinutes (kết thúc bình thường)

	last    model.Point // chỗ engine vừa đưa chuột tới – cho bước kéo "từ điểm trước đó"
	hasLast bool

	rng   *rand.Rand        // ngẫu nhiên của thao tác giống người (human.go) – test đặt seed
	human *humanize.Profile // mức giống người của node đang chạy (setHuman); nil = tắt

	pasteAuto  bool     // gõ chữ TypeAuto thì dán (Windows – New đặt; test để false: gõ phím, không đụng clipboard thật)
	focusClick bool     // click thì đưa cửa sổ dưới chuột lên trước (focusclick.go) – Options.FocusClick
	imeCheck   bool     // gõ phím thì xem bộ gõ tiếng Việt có chạy không để nhắc (New đặt)
	ime        *string  // kết quả runningIME (nil = chưa tra)
	notes      []string // lời nhắc của node đang chạy (note) – execNode ghi vào nhật ký

	mu       sync.Mutex
	prog     Progress
	start    time.Time
	lastEmit time.Time
}

func newEngine(in device.Input, sc model.Script, onProgress func(Progress)) *Engine {
	return &Engine{in: in, sc: sc, onProgress: onProgress, intN: rand.IntN, open: launch.OpenTarget, scr: device.RobotgoScreen{}, ocr: device.SystemOCR{}, elems: device.SystemElements{}, clip: device.SystemClipboard{}, httpc: &http.Client{}, trash: device.SystemTrash{}, audio: device.SystemAudio{}, wins: device.SystemWindows{}, apps: device.SystemApps{}, tabs: browser.System{}, sh: shell.System{}, shortcuts: shortcuts.System{}, toasts: toast.System{}, powers: power.System{}, disp: display.System{}, sysinfo: sysinfo.System{}, procs: procinfo.System{}, inputs: inputsource.System{},
		rng: rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64()))}
}

// jitter trả v lệch ngẫu nhiên đều trong [v-j, v+j]; j ≤ 0 → v. Dùng cho toạ độ (có thể âm ở màn phụ).
func (e *Engine) jitter(v, j int) int {
	if j <= 0 {
		return v
	}
	return v + e.intN(2*j+1) - j
}

// jitterMs như jitter nhưng không âm – dùng cho thời gian chờ.
func (e *Engine) jitterMs(v, j int) int { return max(e.jitter(v, j), 0) }

// update sửa tiến độ rồi báo sang frontend (force = báo ngay, không giãn cách).
func (e *Engine) update(force bool, f func(*Progress)) {
	e.mu.Lock()
	f(&e.prog)
	now := time.Now()
	if !force && now.Sub(e.lastEmit) < progressEvery {
		e.mu.Unlock()
		return
	}
	e.lastEmit = now
	p := e.snapshotLocked()
	e.mu.Unlock()
	if e.onProgress != nil {
		e.onProgress(p)
	}
}

// setProg sửa tiến độ, không báo – lần update kế (node sau bắt đầu) mang theo.
func (e *Engine) setProg(f func(*Progress)) {
	e.mu.Lock()
	f(&e.prog)
	e.mu.Unlock()
}

// Snapshot trả tiến độ hiện tại (kèm thời gian đã chạy và trạng thái tạm dừng).
func (e *Engine) Snapshot() Progress {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.snapshotLocked()
}

func (e *Engine) snapshotLocked() Progress {
	p := e.prog
	p.ElapsedMs = e.gate.activeSince(e.start).Milliseconds()
	p.Paused = e.gate.paused()
	return p
}
