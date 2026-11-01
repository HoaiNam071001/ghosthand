package device

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
)

func TestHardCorners(t *testing.T) {
	// A 1440×900 bên trái, B 1920×1080 bên phải, mép trên thẳng hàng.
	ds := []model.Rect{{X: 0, Y: 0, W: 1440, H: 900}, {X: 1440, Y: 0, W: 1920, H: 1080}}
	got := map[model.Point]bool{}
	for _, c := range HardCorners(ds) {
		got[c] = true
	}
	want := []model.Point{{X: 0, Y: 0}, {X: 0, Y: 899}, {X: 3359, Y: 0}, {X: 3359, Y: 1079}, {X: 1440, Y: 1079}}
	for _, p := range want {
		if !got[p] {
			t.Errorf("thiếu góc %v", p)
		}
	}
	// Góc tiếp giáp 2 màn: chuột đi xuyên qua được → không tính.
	for _, p := range []model.Point{{X: 1439, Y: 0}, {X: 1440, Y: 0}, {X: 1439, Y: 899}} {
		if got[p] {
			t.Errorf("góc tiếp giáp %v không được tính", p)
		}
	}
	if len(got) != len(want) {
		t.Errorf("có %d góc, muốn %d: %v", len(got), len(want), got)
	}
}

func TestInCorner(t *testing.T) {
	corners := HardCorners([]model.Rect{{X: 0, Y: 0, W: 1440, H: 900}})
	cases := []struct {
		x, y int
		want bool
	}{
		{0, 0, true}, {2, 2, true}, {1439, 0, true}, {0, 899, true}, {1437, 897, true},
		{3, 0, false}, {0, 3, false}, {720, 0, false}, {0, 450, false}, {720, 450, false},
	}
	for _, c := range cases {
		if got := inCorner(c.x, c.y, corners); got != c.want {
			t.Errorf("inCorner(%d, %d) = %v, muốn %v", c.x, c.y, got, c.want)
		}
	}
}

// fakeMouse – vị trí chuột giả, đổi được trong lúc watchCorners đang chạy.
type fakeMouse struct {
	mu   sync.Mutex
	x, y int
}

func (m *fakeMouse) set(x, y int) { m.mu.Lock(); m.x, m.y = x, y; m.mu.Unlock() }

func (m *fakeMouse) loc() (int, int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.x, m.y
}

func TestWatchCorners(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	mouse := &fakeMouse{x: 500, y: 500}
	tin := &TrackingInput{Input: &devicetest.FakeInput{}}
	hit := make(chan struct{}, 1)
	go WatchCorners(ctx, mouse.loc, HardCorners([]model.Rect{{X: 0, Y: 0, W: 1440, H: 900}}), tin, func() { hit <- struct{}{} })

	// Engine tự đưa chuột tới góc (điểm của kịch bản) → không dừng.
	tin.Move(0, 0)
	mouse.set(0, 1) // lệch 1 px do làm tròn
	select {
	case <-hit:
		t.Fatal("dừng nhầm khi engine đưa chuột vào góc")
	case <-time.After(3 * failsafeEvery):
	}

	// Người dùng rê chuột sang góc khác → dừng.
	mouse.set(1439, 899)
	select {
	case <-hit:
	case <-time.After(5 * failsafeEvery):
		t.Fatal("không dừng khi người dùng rê chuột vào góc")
	}
}

func TestWatchTouch(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	mouse := &fakeMouse{x: 500, y: 500}
	tin := &TrackingInput{Input: &devicetest.FakeInput{}}
	var paused atomic.Bool
	touched := make(chan struct{}, 4)
	go WatchTouch(ctx, mouse.loc, tin, paused.Load, func() { touched <- struct{}{} })
	time.Sleep(failsafeEvery / 2)
	quiet := func(why string) {
		t.Helper()
		select {
		case <-touched:
			t.Fatal(why)
		case <-time.After(3 * failsafeEvery):
		}
	}

	// Engine đi theo đường cong: vị trí đọc được trễ vài bước so với điểm ghi mới nhất vẫn là do engine.
	for i := range 5 {
		tin.MoveStep(500+i*10, 500)
	}
	mouse.set(531, 500)
	quiet("báo nhầm khi engine di chuột")

	// Người dùng kéo chuột đi chỗ khác → báo.
	mouse.set(800, 300)
	select {
	case <-touched:
	case <-time.After(5 * failsafeEvery):
		t.Fatal("không báo khi người dùng đụng chuột")
	}

	// Đang tạm dừng: người dùng dùng chuột thoải mái.
	paused.Store(true)
	mouse.set(100, 100)
	quiet("báo khi đang tạm dừng")
}

// Đụng chuột → tự chạy tiếp (57 B4): chuột động thì đếm lại, đứng yên đủ thì true; cancel (bấm Tiếp tục) thì false.
func TestWaitStill(t *testing.T) {
	mouse := &fakeMouse{x: 500, y: 500}
	var ats atomic.Int32
	go func() {
		time.Sleep(3 * failsafeEvery)
		mouse.set(600, 500)
	}()
	start := time.Now()
	if !WaitStill(context.Background(), mouse.loc, 6*failsafeEvery, func() bool { return false }, func(time.Time) { ats.Add(1) }) {
		t.Fatal("chuột đứng yên mà không xong")
	}
	if d := time.Since(start); d < 9*failsafeEvery || ats.Load() != 2 {
		t.Errorf("chuột động giữa chừng phải đếm lại: xong sau %v, at %d lần", d, ats.Load())
	}
	if WaitStill(context.Background(), mouse.loc, time.Hour, func() bool { return true }, func(time.Time) {}) {
		t.Error("đã bấm Tiếp tục mà vẫn báo xong")
	}
}
