package taskbadge

import "math"

// Icon 32×32 vẽ bằng toán (không file ảnh): hình tròn nền màu + nét trắng. Trả về BGRA đã nhân alpha, hàng trên trước
// (khớp DIB top-down). frame chỉ có nghĩa với Running (vòng xoay), 0..SpinFrames-1.
const (
	iconSize   = 32
	SpinFrames = 12
)

type rgb struct{ r, g, b float64 }

var (
	colRunning = rgb{37, 99, 235}
	colDone    = rgb{22, 163, 74}
	colFailed  = rgb{220, 38, 38}
)

// coverage – độ phủ 0..1 của điểm cách biên d (d < 0 = trong hình), răng cưa ~1px.
func coverage(d float64) float64 { return math.Max(0, math.Min(1, 0.5-d)) }

// segDist – khoảng cách từ (px,py) tới đoạn (ax,ay)-(bx,by).
func segDist(px, py, ax, ay, bx, by float64) float64 {
	dx, dy := bx-ax, by-ay
	t := math.Max(0, math.Min(1, ((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
	return math.Hypot(px-(ax+t*dx), py-(ay+t*dy))
}

// renderIcon vẽ dấu k. None không có icon (nil).
func renderIcon(k Kind, frame int) []byte {
	if k == None {
		return nil
	}
	bg := map[Kind]rgb{Running: colRunning, Done: colDone, Failed: colFailed}[k]
	const c = float64(iconSize) / 2
	buf := make([]byte, iconSize*iconSize*4)
	for y := 0; y < iconSize; y++ {
		for x := 0; x < iconSize; x++ {
			px, py := float64(x)+0.5, float64(y)+0.5
			disc := coverage(math.Hypot(px-c, py-c) - 15)
			if disc <= 0 {
				continue
			}
			ink := inkAt(k, frame, px, py)
			r, g, b := bg.r+(255-bg.r)*ink, bg.g+(255-bg.g)*ink, bg.b+(255-bg.b)*ink
			i := (y*iconSize + x) * 4
			buf[i], buf[i+1], buf[i+2], buf[i+3] = byte(b*disc), byte(g*disc), byte(r*disc), byte(255*disc)
		}
	}
	return buf
}

// inkAt – độ phủ nét trắng tại điểm.
func inkAt(k Kind, frame int, px, py float64) float64 {
	const c = float64(iconSize) / 2
	switch k {
	case Done: // dấu ✓
		d := math.Min(segDist(px, py, 9, 17, 14, 22), segDist(px, py, 14, 22, 23, 11))
		return coverage(d - 2.2)
	case Failed: // dấu !
		bar := segDist(px, py, c, 9, c, 18) - 2.3
		dot := math.Hypot(px-c, py-23.5) - 2.5
		return coverage(math.Min(bar, dot))
	default: // vòng xoay: cung 270°, đầu cung quay theo frame
		r := math.Hypot(px-c, py-c)
		ring := math.Abs(r-9) - 2
		a := math.Atan2(py-c, px-c) - 2*math.Pi*float64(frame)/SpinFrames
		a = math.Mod(a+4*math.Pi, 2*math.Pi) // 0..2π tính từ đầu cung
		if a > 1.5*math.Pi {
			return 0 // khe hở 90°
		}
		return coverage(ring)
	}
}
