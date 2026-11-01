package device

import (
	"context"
	"sync"
	"time"

	"ghosthand/internal/model"
)

// Dừng khẩn cấp (bước 9, 17): người dùng rê chuột vào một góc "cứng" của bất kỳ màn hình nào thì dừng.
const (
	cornerSize    = 3                     // cách góc < cornerSize px theo cả 2 chiều = chạm góc
	engineMoveTol = 2                     // lệch ≤ tol px so với điểm engine vừa đưa tới = do engine
	failsafeEvery = 50 * time.Millisecond // chu kỳ đọc vị trí chuột
)

// HardCorners trả các góc màn hình mà chuột bị chặn lại – bỏ góc tiếp giáp màn khác (chuột đi xuyên
// qua được, tính vào sẽ dừng nhầm khi rê chuột giữa 2 màn).
func HardCorners(displays []model.Rect) []model.Point {
	inAny := func(x, y int) bool {
		for _, d := range displays {
			if x >= d.X && x < d.X+d.W && y >= d.Y && y < d.Y+d.H {
				return true
			}
		}
		return false
	}
	var out []model.Point
	for _, d := range displays {
		for _, c := range []struct{ x, y, dx, dy int }{
			{d.X, d.Y, -1, -1},
			{d.X + d.W - 1, d.Y, 1, -1},
			{d.X, d.Y + d.H - 1, -1, 1},
			{d.X + d.W - 1, d.Y + d.H - 1, 1, 1},
		} {
			if !inAny(c.x+c.dx, c.y) && !inAny(c.x, c.y+c.dy) && !inAny(c.x+c.dx, c.y+c.dy) {
				out = append(out, model.Point{X: c.x, Y: c.y})
			}
		}
	}
	return out
}

func inCorner(x, y int, corners []model.Point) bool {
	for _, c := range corners {
		if abs(x-c.X) < cornerSize && abs(y-c.Y) < cornerSize {
			return true
		}
	}
	return false
}

// TrackingInput bọc Input, ghi lại các điểm engine vừa đưa chuột tới – để kịch bản có điểm ở góc màn hình không tự
// kích hoạt dừng khẩn cấp, và để biết chuột đổi chỗ là do người dùng (WatchTouch).
type TrackingInput struct {
	Input
	mu     sync.Mutex
	recent [trackKeep]model.Point // vòng tròn các điểm gần nhất – đọc vị trí xen giữa lúc ghi điểm kế và lúc chuột tới
	n      int                    // số điểm đã ghi
}

// trackKeep – số điểm engine gần nhất còn nhớ (đi theo đường cong ~5 ms một bước, đọc vị trí mỗi failsafeEvery).
const trackKeep = 16

func (t *TrackingInput) record(x, y int) {
	t.mu.Lock()
	t.recent[t.n%trackKeep] = model.Point{X: x, Y: y}
	t.n++
	t.mu.Unlock()
}

func (t *TrackingInput) Move(x, y int) error {
	t.record(x, y)
	return t.Input.Move(x, y)
}

func (t *TrackingInput) MoveStep(x, y int) error {
	t.record(x, y)
	return t.Input.MoveStep(x, y)
}

func (t *TrackingInput) Drag(x, y int, button string) error {
	t.record(x, y)
	return t.Input.Drag(x, y, button)
}

// movedByEngine – (x, y) có phải một trong các điểm engine vừa đưa chuột tới không.
func (t *TrackingInput) movedByEngine(x, y int) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	for i := range min(t.n, trackKeep) {
		if p := t.recent[i]; abs(x-p.X) <= engineMoveTol && abs(y-p.Y) <= engineMoveTol {
			return true
		}
	}
	return false
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// WatchCorners đọc vị trí chuột định kỳ tới khi ctx bị huỷ; gọi onHit (một lần) khi chuột
// ở một trong các góc corners mà không phải do engine đưa tới.
func WatchCorners(ctx context.Context, location func() (int, int), corners []model.Point, t *TrackingInput, onHit func()) {
	tick := time.NewTicker(failsafeEvery)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		x, y := location()
		if inCorner(x, y, corners) && !t.movedByEngine(x, y) {
			onHit()
			return
		}
	}
}

// WatchTouch – lượt AI đang chạy (31b): chuột đổi chỗ tới điểm engine không đưa tới = người dùng đụng chuột → onTouch
// (mỗi lần đụng một lần). paused(): đang tạm dừng thì người dùng được dùng chuột – chỉ ghi lại vị trí.
func WatchTouch(ctx context.Context, location func() (int, int), t *TrackingInput, paused func() bool, onTouch func()) {
	tick := time.NewTicker(failsafeEvery)
	defer tick.Stop()
	px, py := location()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		x, y := location()
		moved := abs(x-px) > engineMoveTol || abs(y-py) > engineMoveTol
		px, py = x, y
		if moved && !paused() && !t.movedByEngine(x, y) {
			onTouch()
		}
	}
}

// WaitStill – chờ chuột đứng yên liền d (57 B4: đụng chuột → tự chạy tiếp): mỗi lần chuột đổi chỗ đếm lại, at(lúc sẽ
// xong) báo mỗi lần đếm lại. Trả false khi ctx huỷ hoặc cancel() true (người dùng đã bấm Tiếp tục / Dừng).
func WaitStill(ctx context.Context, location func() (int, int), d time.Duration, cancel func() bool, at func(time.Time)) bool {
	tick := time.NewTicker(failsafeEvery)
	defer tick.Stop()
	px, py := location()
	end := time.Now().Add(d)
	at(end)
	for {
		select {
		case <-ctx.Done():
			return false
		case <-tick.C:
		}
		if cancel() {
			return false
		}
		if x, y := location(); abs(x-px) > engineMoveTol || abs(y-py) > engineMoveTol {
			px, py = x, y
			end = time.Now().Add(d)
			at(end)
		} else if !time.Now().Before(end) {
			return true
		}
	}
}
