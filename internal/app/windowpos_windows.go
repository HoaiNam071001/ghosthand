//go:build windows

package app

import (
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
)

// windowPos – vị trí cửa sổ cùng hệ với runtime.WindowSetPosition. Wails Windows: GetPosition trả toạ độ tuyệt đối
// (GetWindowRect) nhưng SetPosition cộng thêm gốc vùng làm việc của màn chứa cửa sổ → trừ gốc đó ra. Không trừ thì
// màn không bắt đầu ở 0,0 (màn chính đặt bên phải màn phụ) đẩy cửa sổ ra ngoài mọi màn khi về màn chính.
func (a *App) windowPos() (int, int) {
	x, y := runtime.WindowGetPosition(a.ctx)
	w, h := runtime.WindowGetSize(a.ctx)
	wa := device.SystemWindows{}.WorkArea(model.Rect{X: x, Y: y, W: w, H: h}) // cùng màn Wails chọn (nhiều diện tích nhất)
	return x - wa.X, y - wa.Y
}
