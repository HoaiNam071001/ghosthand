package engine

import (
	"errors"
	"image"
	goruntime "runtime"
	"strings"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// API của engine cho app (RunScript, Thử node, Thử tìm) và sau này MCP – không cần biết trường nội bộ.

// Options – cấu hình một engine. Giá trị 0 = không dùng (Thử node / Thử tìm chỉ cần Screen + Displays).
type Options struct {
	Screen      model.Rect   // khung màn hình chính: kịch bản không có vùng thì neo theo khung này
	Displays    []model.Rect // khung các màn (tìm "cả màn", kiểm tra vùng chụp); nil = không kiểm tra
	OnProgress  func(Progress)
	OnNode      func(model.StepResult)      // mỗi node chạy xong
	Debug       bool                        // dừng ở node có Breakpoint (chạy từ app)
	StepMode    bool                        // dừng trước mỗi node (chạy từng node)
	KeepShots   bool                        // chụp màn hình lúc node thất bại (lịch sử chạy)
	ShotEach    bool                        // cùng KeepShots: chụp thêm sau mỗi node thành công (AI xin, shots: each – 31b)
	Browser     web.Browser                 // node web + node Mở bằng Chrome của app; nil = không có (node web lỗi code browser)
	AllowDanger bool                        // cho thao tác nguy hiểm (xoá file, buộc thoát app, đóng cửa sổ) – runner đặt khi người dùng đã xác nhận (script.DangerOps)
	StopAt      string                      // chạy xong node này thì dừng (kết thúc bình thường – Reached) – AI chạy đến node (31b)
	Seed        *Carry                      // kết quả node + biến của lần chạy trước, nạp vào đầu vòng 1 – chạy tiếp từ node lỗi
	Simulate    *Simulate                   // chạy thử khô (31c): node không điều khiển không chạy thật, trả kết quả giả
	Pins        map[string]model.StepResult // node ghim (31c): không chạy, trả luôn Output + cổng đã ghim (theo id node)
	Secrets     map[string]string           // giá trị {{secret.<tên>}} (kho bí mật, bước 43 S10) – chỉ các tên kịch bản dùng; giá trị bị che ở mọi kết quả rời engine
	FocusClick  bool                        // click thì focus cửa sổ dưới chuột trước (phiên chạy thật; test để false – không đụng cửa sổ thật)
	ShotsDir    string                      // thư mục ảnh trong Cài đặt cho node Chụp màn hình để trống saveDir ("" = Pictures/Ghosthand)
}

// Carry – kết quả node (theo id) + biến {{vars.…}} của vòng cuối một lần chạy, để lần sau chạy tiếp mà biến node trước vẫn có.
type Carry struct {
	Results map[string]model.StepResult `json:"results"`
	Vars    map[string]any              `json:"vars"`
}

// Carry – kết quả + biến của vòng cuối (đọc sau khi Run xong).
func (e *Engine) Carry() Carry {
	c := Carry{Results: map[string]model.StepResult{}, Vars: map[string]any{}}
	for id, r := range e.results {
		c.Results[id] = *r
	}
	for k, v := range e.rv.vars {
		c.Vars[k] = e.mask.value(v)
	}
	return c
}

// Reached – lần chạy dừng vì tới node StopAt.
func (e *Engine) Reached() bool { return e.reached }

// TimedOut – lần chạy dừng vì hết MaxMinutes (không lỗi – kịch bản chạy "trong N phút" là bình thường).
func (e *Engine) TimedOut() bool { return e.timedOut }

// New – engine cho một lần chạy kịch bản sc. in = nil khi không thao tác chuột / phím (Thử node, Thử tìm).
func New(in device.Input, sc model.Script, o Options) *Engine {
	e := newEngine(in, sc, o.OnProgress)
	e.screen, e.displays, e.onNode, e.debug, e.browser, e.allowDanger = o.Screen, o.Displays, o.OnNode, o.Debug, o.Browser, o.AllowDanger
	e.stopAt, e.seed, e.shotsDir, e.pins, e.sim = o.StopAt, o.Seed, o.ShotsDir, o.Pins, o.Simulate
	e.rv.secrets, e.mask = o.Secrets, newMasker(o.Secrets)
	e.focusClick = o.FocusClick
	e.pasteAuto, e.imeCheck = goruntime.GOOS == "windows", true
	e.step.Store(o.StepMode)
	if o.KeepShots {
		e.shots, e.eachShot = map[string]image.Image{}, o.ShotEach
	}
	return e
}

// Failed – node làm lần chạy dừng vì lỗi ("" = không) và, nếu là chờ ảnh hết giờ, chỗ giống nhất.
func (e *Engine) Failed() (string, *FindResult) { return e.failed, e.miss }

// Shots – ảnh màn hình lúc node thất bại (+ sau mỗi node khi ShotEach) theo tên file (Options.KeepShots).
func (e *Engine) Shots() map[string]image.Image { return e.shots }

// FindResult – kết quả thử tìm ảnh mẫu / chữ trên màn hình hiện tại.
type FindResult struct {
	Found bool       `json:"found"` // độ khớp ≥ ngưỡng của bước
	Score int        `json:"score"` // % khớp tốt nhất
	X     int        `json:"x"`     // khung chỗ giống nhất (toạ độ robotgo)
	Y     int        `json:"y"`
	W     int        `json:"w"`
	H     int        `json:"h"`
	Area  model.Rect `json:"area"`           // vùng đã tìm
	Ms    int        `json:"ms"`             // thời gian tìm
	Read  []string   `json:"read,omitempty"` // tìm theo chữ mà không thấy: các dòng đọc được trong vùng
	// % lệch màu chỗ giống nhất so với ảnh mẫu – chỉ khi node bật kiểm tra màu (ColorTol); khớp đủ mà Found false = lệch màu
	ColorDiff int `json:"colorDiff,omitempty"`
	// Tìm tất cả (42 G3): số chỗ thấy + khung từng chỗ theo thứ tự đọc (X / Y / W / H = chỗ đầu); Found = số chỗ đạt min / max
	Count int          `json:"count,omitempty"`
	All   []model.Rect `json:"all,omitempty"`
}

// FindOnce tìm ảnh mẫu / chữ / phần tử (Đọc phần tử: phần tử / nhãn) của node s trên màn hình lúc này (một lần, không chờ) – nút "Thử tìm".
// {{biến}} trong s phải thay sẵn (script.WithInputDefaults).
func (e *Engine) FindOnce(s model.Step) (FindResult, error) {
	if s.Type == model.StepFindAll {
		return e.findAllOnce(s)
	}
	if s.FindBy == model.FindByElement || s.Type == model.StepElementRead && s.FindBy == "" { // Đọc phần tử: "" = cây phần tử
		return e.findElementOnce(s)
	}
	area := e.searchArea(s)
	if err := device.CaptureArea(area, e.displays); err != nil {
		return FindResult{}, err
	}
	start := time.Now()
	if s.FindBy == model.FindByText {
		if strings.TrimSpace(s.FindText) == "" {
			return FindResult{}, errors.New("chưa nhập chữ cần tìm")
		}
		hit, read, ok, err := locateText(e.scr, e.ocr, area, s)
		if err != nil {
			return FindResult{}, err
		}
		res := FindResult{Found: ok, Area: area, Read: vision.TextLines(read, 40), Ms: int(time.Since(start).Milliseconds()), X: hit.X, Y: hit.Y, W: hit.W, H: hit.H}
		if ok {
			res.Score = 100
		}
		return res, nil
	}
	if s.Template == "" {
		return FindResult{}, errors.New("bước chưa có ảnh mẫu")
	}
	tpl, err := vision.DecodePNG(s.Template)
	if err != nil {
		return FindResult{}, err
	}
	shot, err := e.scr.Capture(area)
	if err != nil {
		return FindResult{}, err
	}
	res := matchImage(shot, area, vision.NewTemplate(tpl), s, e.scr.DPIScale(area))
	res.Ms = int(time.Since(start).Milliseconds())
	return res, nil
}
