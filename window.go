package main

import (
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/winfloat"
)

// Chế độ cửa sổ. Wails v2 chỉ có một cửa sổ nên overlay / mini bar là cách đổi kích thước,
// vị trí và always-on-top của cửa sổ chính (cửa sổ luôn frameless + nền trong suốt, xem main.go).
const (
	ModeMain    = "main"
	ModeOverlay = "overlay"
	ModeMinibar = "minibar"
)

const miniBarW, miniBarH = 540, 96

type winRect struct{ x, y, w, h int }

// SetWindowMode chuyển cửa sổ sang main | overlay | minibar.
// Lưu vị trí/kích thước của main để khôi phục khi quay lại.
func (a *App) SetWindowMode(mode string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if mode == a.mode {
		return nil
	}

	if a.mode == ModeMain {
		// Đang phóng to thì thu về trước: kích thước / vị trí lưu là của cửa sổ thường,
		// và SetSize trên cửa sổ đang phóng to không có tác dụng ổn định.
		a.mainMax = runtime.WindowIsMaximised(a.ctx)
		if a.mainMax {
			runtime.WindowUnmaximise(a.ctx)
		}
		x, y := a.windowPos()
		w, h := runtime.WindowGetSize(a.ctx)
		a.mainRect = winRect{x, y, w, h}
		a.winDisp = a.detectDisplay()
		a.mainDisp = a.winDisp
	}

	switch mode {
	case ModeMain:
		r := a.mainRect
		runtime.WindowSetAlwaysOnTop(a.ctx, false)
		winfloat.Set(false, false)
		a.moveToDisplay(a.mainDisp) // vị trí main lưu theo màn của nó (Wails tính vị trí theo màn hiện tại)
		runtime.WindowSetSize(a.ctx, r.w, r.h)
		runtime.WindowSetPosition(a.ctx, r.x, r.y)
		if a.mainMax {
			runtime.WindowMaximise(a.ctx)
		}
	case ModeOverlay, ModeMinibar:
		sw, sh, err := a.currentScreenSize()
		if err != nil {
			return err
		}
		runtime.WindowSetAlwaysOnTop(a.ctx, true)
		// macOS: nổi cả trên app toàn màn hình (Space riêng); overlay nhận bàn phím, thanh mini không giành focus
		winfloat.Set(true, mode == ModeOverlay)
		if mode == ModeOverlay && a.ovDisp >= 0 && a.moveToDisplay(a.ovDisp) {
			if sw, sh, err = a.currentScreenSize(); err != nil {
				return err
			}
		}
		if mode == ModeOverlay {
			// Dời về góc màn hiện tại TRƯỚC rồi mới phóng to: Wails lấy "màn hiện tại" là màn chứa phần lớn
			// cửa sổ, phóng to trước thì cửa sổ có thể tràn sang màn bên cạnh và overlay mở nhầm màn.
			// SetSize giữ nguyên mép trên nên cửa sổ vẫn ở góc màn này.
			runtime.WindowSetPosition(a.ctx, 0, 0)
			runtime.WindowSetSize(a.ctx, sw, sh)
			winfloat.CoverScreen() // macOS: phủ cả thanh menu – overlay đúng bằng màn, toạ độ = khung màn
		} else {
			runtime.WindowSetSize(a.ctx, miniBarW, miniBarH)
			runtime.WindowSetPosition(a.ctx, (sw-miniBarW)/2, 16)
		}
	default:
		return fmt.Errorf("chế độ cửa sổ không hợp lệ: %q", mode)
	}
	a.mode = mode
	if mode == ModeMain {
		a.background = false // người dùng mở màn chính – thôi chế độ nền
	}
	runtime.WindowShow(a.ctx) // app mở nền (StartHidden) hiện lần đầu ở đây – thường là thanh mini khi AI chạy
	return nil
}

// InBackground – app do AI mở nền và người dùng chưa mở màn chính: lần chạy từ ngoài xong thì giữ thanh mini.
func (a *App) InBackground() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.background
}

// DisplayInfo – một màn hình cho bộ chọn màn trên overlay. Khung theo toạ độ robotgo (như toạ độ điểm).
type DisplayInfo struct {
	Index   int        `json:"index"`
	Rect    model.Rect `json:"rect"`
	Work    model.Rect `json:"work"`    // vùng làm việc (trừ taskbar / thanh menu) – overlay vẽ khung đích node Cửa sổ
	Main    bool       `json:"main"`    // màn chính – "toàn màn hình" (vùng = nil) tính theo màn này
	Current bool       `json:"current"` // cửa sổ app / overlay đang ở màn này
}

// Displays trả danh sách màn hình (màn chính đứng đầu).
func (a *App) Displays() []DisplayInfo {
	a.mu.Lock()
	defer a.mu.Unlock()
	ds := device.Displays()
	cur := a.winDisp
	if a.mode == ModeMain || cur < 0 || cur >= len(ds) {
		cur = a.detectDisplay()
	}
	out := make([]DisplayInfo, len(ds))
	for i, r := range ds {
		out[i] = DisplayInfo{Index: i, Rect: r, Work: device.SystemWindows{}.WorkArea(r), Main: i == 0, Current: i == cur}
	}
	return out
}

// OverlayDisplayFor chọn màn cho lần mở overlay tới: màn chứa tâm khung r (vùng của kịch bản, toàn màn hình = màn
// chính) – mở overlay luôn ở đúng màn đang soạn, không phải màn chứa cửa sổ app. Trả chỉ số màn (-1 = không đổi).
func (a *App) OverlayDisplayFor(r model.Rect) int {
	a.mu.Lock()
	defer a.mu.Unlock()
	if i := displayAt(device.Displays(), model.Point{X: r.X + r.W/2, Y: r.Y + r.H/2}); i >= 0 {
		a.ovDisp = i
		return i
	}
	return -1
}

// displayAt – chỉ số màn chứa điểm p, -1 nếu không màn nào.
func displayAt(ds []model.Rect, p model.Point) int {
	for i, d := range ds {
		if p.X >= d.X && p.X < d.X+d.W && p.Y >= d.Y && p.Y < d.Y+d.H {
			return i
		}
	}
	return -1
}

// SetOverlayDisplay dời overlay sang màn i (nút Màn 1 / 2 trên overlay); lần mở sau lại theo vùng (OverlayDisplayFor).
func (a *App) SetOverlayDisplay(i int) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if i < 0 || i >= len(device.Displays()) {
		return fmt.Errorf("không có màn hình %d", i+1)
	}
	a.ovDisp = i
	if a.mode != ModeOverlay || !a.moveToDisplay(i) {
		return nil
	}
	sw, sh, err := a.currentScreenSize()
	if err != nil {
		return err
	}
	runtime.WindowSetPosition(a.ctx, 0, 0)
	runtime.WindowSetSize(a.ctx, sw, sh)
	winfloat.CoverScreen()
	return nil
}

// moveToDisplay dời cửa sổ sang màn i; trả true nếu đã dời (đang ở màn khác).
// Wails chỉ đặt được vị trí tương đối theo màn hiện tại → cộng độ lệch giữa 2 màn. Thu nhỏ cửa sổ trước
// để nó nằm gọn trong màn đích (Wails lấy "màn hiện tại" là màn chứa phần lớn cửa sổ); người gọi tự đặt lại cỡ.
func (a *App) moveToDisplay(i int) bool {
	ds := device.Displays()
	cur := a.winDisp
	if i < 0 || i >= len(ds) || cur < 0 || cur >= len(ds) || cur == i {
		return false
	}
	runtime.WindowSetSize(a.ctx, 320, 240)
	runtime.WindowSetPosition(a.ctx, ds[i].X-ds[cur].X+40, ds[i].Y-ds[cur].Y+40)
	a.winDisp = i
	return true
}

// detectDisplay đoán màn đang chứa cửa sổ: Wails chỉ cho biết cỡ màn hiện tại (không có vị trí) → so cỡ;
// nhiều màn cùng cỡ (hoặc cỡ không khớp – Windows scale) thì lấy màn có chuột (vừa bấm nút trong cửa sổ).
func (a *App) detectDisplay() int {
	ds := device.Displays()
	if len(ds) <= 1 {
		return 0
	}
	w, h, _ := a.currentScreenSize()
	mx, my := device.Location()
	return pickDisplay(ds, w, h, model.Point{X: mx, Y: my})
}

// pickDisplay: ds – khung các màn (cùng hệ với chuột và cửa sổ Wails – device.Displays).
func pickDisplay(ds []model.Rect, w, h int, mouse model.Point) int {
	under := -1
	for i, r := range ds {
		if mouse.X >= r.X && mouse.X < r.X+r.W && mouse.Y >= r.Y && mouse.Y < r.Y+r.H {
			under = i
		}
	}
	var same []int
	for i, r := range ds {
		if r.W == w && r.H == h {
			same = append(same, i)
		}
	}
	for _, i := range same {
		if i == under {
			return i
		}
	}
	if len(same) > 0 {
		return same[0]
	}
	if under >= 0 {
		return under
	}
	return 0
}

// currentScreenSize trả kích thước (logical px) của màn hình chứa cửa sổ.
func (a *App) currentScreenSize() (int, int, error) {
	screens, err := runtime.ScreenGetAll(a.ctx)
	if err != nil {
		return 0, 0, err
	}
	for _, s := range screens {
		if s.IsCurrent {
			return s.Size.Width, s.Size.Height, nil
		}
	}
	for _, s := range screens {
		if s.IsPrimary {
			return s.Size.Width, s.Size.Height, nil
		}
	}
	return 0, 0, fmt.Errorf("không tìm thấy màn hình")
}

// MousePos trả vị trí chuột theo toạ độ click (device.Location – Windows: pixel thật).
// Overlay so với clientX/Y để đo độ lệch giữa toạ độ trong cửa sổ và toạ độ click.
func (a *App) MousePos() model.Point {
	x, y := device.Location()
	return model.Point{X: x, Y: y}
}

// ScreenBounds trả khung màn hình chính – frontend dùng để tính điểm neo khi chọn toàn màn hình.
func (a *App) ScreenBounds() model.Rect { return device.MainScreen() }
