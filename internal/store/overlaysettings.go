package store

import "fmt"

// Cạnh màn hình đặt thanh công cụ của overlay (chọn vùng / xem trước).
const (
	BarTop    = "top"
	BarBottom = "bottom"
	BarLeft   = "left"
	BarRight  = "right"
)

// OverlaySettings – cài đặt overlay (bước 49). Toolbar trống = BarTop.
type OverlaySettings struct {
	Toolbar string `json:"toolbar,omitempty"`
}

// BarSide trả cạnh đặt thanh; giá trị trống / lạ → trên.
func (o OverlaySettings) BarSide() string {
	switch o.Toolbar {
	case BarBottom, BarLeft, BarRight:
		return o.Toolbar
	}
	return BarTop
}

// SetOverlay lưu cài đặt overlay; cạnh lạ là lỗi.
func SetOverlay(o OverlaySettings) error {
	if o.Toolbar != "" && o.Toolbar != o.BarSide() {
		return fmt.Errorf("cạnh thanh công cụ không hợp lệ: %s", o.Toolbar)
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s := loadSettings(dir)
	s.Overlay = o
	return saveSettings(dir, s)
}
