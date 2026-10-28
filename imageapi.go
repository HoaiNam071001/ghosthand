package main

import (
	"errors"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/vision"
)

// Hàm cho giao diện (và MCP – bước 31) quanh ảnh mẫu / màu pixel (bước 25). Cửa sổ app (overlay phủ màn hình, hoặc
// màn chính) che màn hình thật nên ẩn cửa sổ một chút trong lúc chụp.

// hideDelay – chờ cửa sổ ẩn hẳn (hiệu ứng của hệ điều hành) trước khi chụp.
const hideDelay = 250 * time.Millisecond

// TemplateShot – ảnh mẫu vừa chụp.
type TemplateShot struct {
	Png   string  `json:"png"`   // PNG base64 – ghi vào Step.Template
	Scale float64 `json:"scale"` // ghi vào Step.TemplateScale
	W     int     `json:"w"`     // cỡ theo toạ độ robotgo
	H     int     `json:"h"`
}

// withHidden ẩn cửa sổ app, chạy f, rồi hiện lại – ảnh chụp có cả cửa sổ app nên overlay phải ẩn đi mới thấy màn thật.
func (a *App) withHidden(f func() error) error {
	if a.ctx != nil {
		runtime.WindowHide(a.ctx)
		defer runtime.WindowShow(a.ctx)
		time.Sleep(hideDelay)
	}
	return f()
}

// CaptureTemplate chụp vùng r (toạ độ robotgo, nằm trong một màn hình) làm ảnh mẫu.
func (a *App) CaptureTemplate(r model.Rect) (TemplateShot, error) {
	if err := device.CaptureArea(r, device.Displays()); err != nil {
		return TemplateShot{}, err
	}
	if r.W < 4 || r.H < 4 {
		return TemplateShot{}, errors.New("vùng khoanh quá nhỏ (cần ít nhất 4 × 4)")
	}
	var shot TemplateShot
	err := a.withHidden(func() error {
		img, err := device.RobotgoScreen{}.Capture(r)
		if err != nil {
			return err
		}
		png, err := vision.EncodePNG(img)
		shot = TemplateShot{Png: png, Scale: device.TemplateScale(img, r), W: r.W, H: r.H}
		return err
	})
	return shot, err
}

// FindImage thử tìm ảnh mẫu / chữ của bước stepID trên màn hình hiện tại (một lần, không chờ) – nút "Thử tìm".
// {{biến}} lấy giá trị mặc định của input.
func (a *App) FindImage(sc model.Script, stepID string) (engine.FindResult, error) {
	s, err := stepOf(sc, stepID)
	if err != nil {
		return engine.FindResult{}, err
	}
	if s, err = script.WithInputDefaults(sc, s); err != nil {
		return engine.FindResult{}, err
	}
	if s.FindBy == "" && s.Template == "" && s.Type != model.StepElementRead { // tìm theo ảnh mà chưa có ảnh mẫu: báo ngay, khỏi ẩn cửa sổ
		return engine.FindResult{}, errors.New("bước chưa có ảnh mẫu")
	}
	e := engine.New(nil, sc, engine.Options{Screen: device.MainScreen(), Displays: device.Displays()})
	var res engine.FindResult
	err = a.withHidden(func() (err error) {
		res, err = e.FindOnce(s)
		return err
	})
	return res, err
}

// stepOf – node stepID của kịch bản (bản sao).
func stepOf(sc model.Script, stepID string) (model.Step, error) {
	for _, s := range sc.Steps {
		if s.ID == stepID {
			return s, nil
		}
	}
	return model.Step{}, errors.New("không có node này")
}

// PickElementAt – "Chọn phần tử trên màn" (bước 37 E3): phần tử dưới điểm (x, y) – toạ độ robotgo, bấm trên overlay –
// trong cây accessibility của app node stepID dùng ("" = app có cửa sổ trên cùng), kèm selector tìm lại nó.
func (a *App) PickElementAt(sc model.Script, stepID string, x, y int) (engine.ElementPick, error) {
	s, err := stepOf(sc, stepID)
	if err != nil {
		return engine.ElementPick{}, err
	}
	if s, err = script.WithInputDefaults(sc, s); err != nil {
		return engine.ElementPick{}, err
	}
	return engine.New(nil, sc, engine.Options{}).PickElement(s.ElementApp, model.Point{X: x, Y: y})
}

// PixelColorAt trả màu (#RRGGBB) đang hiện tại (x, y) – nút "Lấy màu" của bước chờ pixel.
func (a *App) PixelColorAt(x, y int) (string, error) {
	var hex string
	err := a.withHidden(func() error {
		c, err := device.RobotgoScreen{}.Pixel(x, y)
		hex = vision.HexColor(c)
		return err
	})
	return hex, err
}

// ScreenCaptureAllowed: đã có quyền chụp màn hình chưa (macOS Screen Recording; hệ khác luôn true).
func (a *App) ScreenCaptureAllowed() bool { return device.ScreenCaptureAllowed() }

// RequestScreenCapture mở hộp thoại xin quyền chụp màn hình của macOS (cấp xong thường phải mở lại app).
func (a *App) RequestScreenCapture() bool { return device.RequestScreenCapture() }

// TestNode thử node stepID của kịch bản sc.
func (a *App) TestNode(sc model.Script, stepID string) (engine.NodeTest, error) {
	s, err := stepOf(sc, stepID)
	if err != nil {
		return engine.NodeTest{}, err
	}
	if s, err = script.WithInputDefaults(sc, s); err != nil {
		return engine.NodeTest{}, err
	}
	e := engine.New(nil, sc, engine.Options{Screen: device.MainScreen(), Displays: device.Displays()})
	var res engine.NodeTest
	run := func() (err error) {
		res, err = e.TestNode(s)
		return err
	}
	if s.Type == model.StepSwitch { // không nhìn màn hình – khỏi ẩn cửa sổ
		return res, run()
	}
	return res, a.withHidden(run)
}
