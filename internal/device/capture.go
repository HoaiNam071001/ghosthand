package device

import (
	"errors"
	"fmt"
	"image"
	"image/color"
	goruntime "runtime"

	"github.com/go-vgo/robotgo"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Chụp màn hình / đọc màu pixel cho bước chờ ảnh, click theo ảnh, chờ pixel (bước 25). Tách interface để test engine
// bằng màn hình giả. Toạ độ theo hệ robotgo (macOS: point, Windows: px thật); ảnh chụp theo px thật nên có thể lớn hơn
// vùng chụp (Retina 2x) – tỷ lệ = cỡ ảnh / cỡ vùng.
type Screen interface {
	Capture(r model.Rect) (image.Image, error)
	Pixel(x, y int) (color.RGBA, error)
	// DPIScale – độ nét của màn chứa r ngoài phần toạ độ đã gồm (xem vision.MatchScaled): Windows DPI / 96, macOS 1.
	DPIScale(r model.Rect) float64
}

type RobotgoScreen struct{}

func (RobotgoScreen) DPIScale(r model.Rect) float64 { return DPIScale(r) }

// TemplateScale – px ảnh mẫu / 1 px logic khi chụp img ở vùng r (ghi vào Step.TemplateScale).
func TemplateScale(img image.Image, r model.Rect) float64 {
	return vision.ImageScale(img, r) * DPIScale(r)
}

// Capture chụp vùng r (nằm gọn trong một màn hình, xem captureArea). Ưu tiên cách chụp không dính con trỏ chuột; cửa sổ app
// nằm trong ảnh như mọi cửa sổ khác.
func (RobotgoScreen) Capture(r model.Rect) (image.Image, error) {
	if err := screenCaptureCheck(); err != nil {
		return nil, err
	}
	if img, ok, err := captureClean(r); ok {
		return img, err
	}
	if m := MainScreen(); goruntime.GOOS == "darwin" && !inside(r, m) {
		// robotgo trên macOS chỉ chụp màn chính; chụp màn phụ cần ScreenCaptureKit (macOS 14+)
		return nil, errors.New("tìm ảnh trên màn hình phụ cần macOS 14 trở lên")
	}
	img, err := robotgo.CaptureImg(r.X, r.Y, r.W, r.H)
	if err != nil {
		return nil, fmt.Errorf("không chụp được màn hình: %w", err)
	}
	return img, nil
}

// Pixel đọc màu tại (x, y) – chụp 1×1 cùng cách như Capture (không dính con trỏ chuột).
func (s RobotgoScreen) Pixel(x, y int) (color.RGBA, error) {
	if err := screenCaptureCheck(); err != nil {
		return color.RGBA{}, err
	}
	if img, ok, err := captureClean(model.Rect{X: x, Y: y, W: 1, H: 1}); ok {
		if err != nil {
			return color.RGBA{}, err
		}
		r, g, b, _ := img.At(img.Bounds().Min.X, img.Bounds().Min.Y).RGBA()
		return color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), 255}, nil
	}
	return vision.ParseColor("#" + robotgo.GetPixelColor(x, y))
}

// CaptureArea kiểm tra vùng chụp nằm gọn trong một màn hình (ds – khung các màn; rỗng = không kiểm tra).
// ErrNoPermission – thiếu quyền ghi màn hình (macOS Screen Recording) – StepError code permission.
var ErrNoPermission = errors.New("chưa cấp quyền ghi màn hình (Screen Recording) – System Settings → Privacy & Security → Screen Recording, bật cho app / terminal rồi mở lại")

func CaptureArea(r model.Rect, ds []model.Rect) error {
	if r.W <= 0 || r.H <= 0 {
		return errors.New("vùng tìm rỗng")
	}
	if len(ds) == 0 || displayOf(r, ds) >= 0 {
		return nil
	}
	for _, d := range ds {
		if r.X < d.X+d.W && d.X < r.X+r.W && r.Y < d.Y+d.H && d.Y < r.Y+r.H {
			return errors.New("vùng tìm nằm vắt qua 2 màn hình – chọn lại vùng trong một màn")
		}
	}
	return errors.New("vùng tìm nằm ngoài màn hình")
}

func inside(r, d model.Rect) bool {
	return r.X >= d.X && r.Y >= d.Y && r.X+r.W <= d.X+d.W && r.Y+r.H <= d.Y+d.H
}

// displayOf trả chỉ số màn chứa trọn r, -1 nếu không có.
func displayOf(r model.Rect, ds []model.Rect) int {
	for i, d := range ds {
		if inside(r, d) {
			return i
		}
	}
	return -1
}
