// Package runborder – viền sáng quanh mép màn hình khi app đang điều khiển máy (58 D2): người ngồi máy nhìn là biết
// đang thao tác (đừng chạm), đang chờ, hay tạm dừng. Cửa sổ native riêng ngoài cửa sổ Wails (Wails v2 chỉ có một
// cửa sổ – đang là thanh mini): trong suốt, click xuyên qua, không lấy focus, không lọt vào ảnh chụp (D3).
package runborder

// Title – tên cửa sổ viền: device bỏ cửa sổ này khi chụp màn hình / xét "cửa sổ của app tại điểm" (chép nguyên chuỗi
// trong C của capture_darwin.go + selfguard_darwin.go).
const Title = "ghosthand-border"

// Độ dày viền (store.OverlaySettings.Border).
const (
	Off    = "off"
	Thin   = "thin" // mặc định
	Medium = "medium"
)

// Look – màu + kiểu viền theo việc đang làm.
type Look struct {
	R, G, B uint8
	Alpha   float64
	Pulse   bool // sáng mờ theo nhịp – đang thao tác
}

// LookFor – viền cho việc lần chạy đang làm (session.Doing*); false = không hiện (xong / lỗi / dừng). Màu theo bảng
// tối của design (accent #60A5FA, warn #FACC15) – nổi trên mọi nền.
func LookFor(doing string) (Look, bool) {
	switch doing {
	case "acting":
		return Look{R: 0x60, G: 0xA5, B: 0xFA, Alpha: 0.95, Pulse: true}, true
	case "waiting", "countdown":
		return Look{R: 0x60, G: 0xA5, B: 0xFA, Alpha: 0.4}, true
	case "paused":
		return Look{R: 0xFA, G: 0xCC, B: 0x15, Alpha: 0.9}, true
	}
	return Look{}, false
}

// Px – độ dày (point) theo cài đặt; 0 = tắt.
func Px(border string) int {
	switch border {
	case Off:
		return 0
	case Medium:
		return 8
	}
	return 4
}
