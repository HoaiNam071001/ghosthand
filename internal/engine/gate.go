package engine

import (
	"context"
	"sync"
	"time"

	"ghosthand/internal/model"
)

// Tạm dừng / chạy tiếp / debug (breakpoint, chạy từng node) và chờ có thể huỷ – mọi chờ trong engine đi qua đây.

// Pause / Resume: trả false nếu trạng thái không đổi. Có hiệu lực trước bước / lần click kế tiếp.
func (e *Engine) Pause() bool {
	if !e.gate.pause() {
		return false
	}
	e.update(true, func(*Progress) {})
	return true
}
func (e *Engine) Resume() bool {
	e.step.Store(false)
	if !e.gate.resume() {
		return false
	}
	e.update(true, func(p *Progress) { p.Break, p.PausedBy, p.ResumeAt = "", "", 0 })
	return true
}

// PausedTouch – Progress.PausedBy: người dùng đụng chuột lúc AI đang chạy (31b – device.WatchTouch).
const PausedTouch = "touch"

// PauseTouched tạm dừng vì người dùng đụng chuột; thanh mini / wait_run báo lý do, người dùng bấm Tiếp tục để chạy tiếp.
// Đang chờ node Hỏi người dùng thì bỏ qua – người dùng đụng chuột chính là để trả lời (56 D1).
func (e *Engine) PauseTouched() bool {
	e.mu.Lock()
	asking := e.prog.Ask != nil
	e.mu.Unlock()
	if asking || !e.gate.pause() {
		return false
	}
	e.update(true, func(p *Progress) { p.PausedBy = PausedTouch })
	return true
}

// TouchPaused – đang tạm dừng vì đụng chuột (chưa ai bấm Tiếp tục).
func (e *Engine) TouchPaused() bool {
	e.mu.Lock()
	by := e.prog.PausedBy
	e.mu.Unlock()
	return by == PausedTouch && e.gate.paused()
}

// SetResumeAt – lúc sẽ tự chạy tiếp sau khi đụng chuột (57 B4; chuột lại động thì lùi); thanh mini / wait_run đếm ngược.
func (e *Engine) SetResumeAt(t time.Time) {
	e.update(true, func(p *Progress) { p.ResumeAt = t.UnixMilli() })
}

// Paused – đang tạm dừng (nút, debug, đụng chuột).
func (e *Engine) Paused() bool { return e.gate.paused() }

// Step chạy node kế rồi dừng lại (debug, F10); đang chạy thì dừng trước node sau.
func (e *Engine) Step() bool {
	e.step.Store(true)
	e.gate.resume()
	e.update(true, func(p *Progress) { p.Break = "" })
	return true
}

// breakBefore – debug: tạm dừng trước node s nếu đang chạy từng node / s có breakpoint (wait sau đó chặn tới khi tiếp).
func (e *Engine) breakBefore(s model.Step, loop int) {
	why := ""
	switch {
	case !s.Enabled: // node tắt chỉ đi qua, không đáng dừng
		return
	case e.step.Load():
		why = "step"
	case e.debug && s.Breakpoint:
		why = "breakpoint"
	default:
		return
	}
	e.gate.pause()
	e.update(true, func(p *Progress) { p.Loop, p.Step, p.NodeID, p.Ref, p.Break = loop, e.order[s.ID], s.ID, s.Ref, why })
}

// sleep chờ ms mili giây hoặc tới khi ctx bị huỷ.
func Sleep(ctx context.Context, ms int) error {
	if ms <= 0 {
		return ctx.Err()
	}
	t := time.NewTimer(time.Duration(ms) * time.Millisecond)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

// pauseGate – cổng tạm dừng: wait() chặn khi đang tạm dừng, tới khi resume hoặc ctx bị huỷ.
// Ghi lại tổng thời gian tạm dừng để tính thời gian chạy thật.
type pauseGate struct {
	mu        sync.Mutex
	ch        chan struct{} // khác nil khi đang tạm dừng; đóng khi resume
	since     time.Time     // lúc bắt đầu lần tạm dừng hiện tại
	pausedFor time.Duration // tổng thời gian đã tạm dừng (không tính lần đang dừng)
}

func (g *pauseGate) pause() bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.ch != nil {
		return false
	}
	g.ch = make(chan struct{})
	g.since = time.Now()
	return true
}
func (g *pauseGate) resume() bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.ch == nil {
		return false
	}
	close(g.ch)
	g.ch = nil
	g.pausedFor += time.Since(g.since)
	return true
}
func (g *pauseGate) paused() bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.ch != nil
}
func (g *pauseGate) wait(ctx context.Context) error {
	g.mu.Lock()
	ch := g.ch
	g.mu.Unlock()
	if ch == nil {
		return ctx.Err()
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-ch:
		return nil
	}
}

// pausedTotal – tổng thời gian đã tạm dừng tính tới giờ (kể cả lần đang dừng).
func (g *pauseGate) pausedTotal() time.Duration {
	g.mu.Lock()
	defer g.mu.Unlock()
	d := g.pausedFor
	if g.ch != nil {
		d += time.Since(g.since)
	}
	return d
}

// activeSince – thời gian từ start, trừ các khoảng tạm dừng.
func (g *pauseGate) activeSince(start time.Time) time.Duration {
	g.mu.Lock()
	defer g.mu.Unlock()
	d := time.Since(start) - g.pausedFor
	if g.ch != nil {
		d -= time.Since(g.since)
	}
	return d
}
