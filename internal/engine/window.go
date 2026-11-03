package engine

import (
	"cmp"
	"context"
	"fmt"
	"time"

	"ghosthand/internal/model"
)

// Node Cửa sổ (bước 26): tìm cửa sổ khớp WinApp + WinTitle (model.MatchWindow – trên cùng trước), chờ tới TimeoutMs
// theo nhịp pollMs, rồi focus / đặt khung / thu nhỏ… qua device.Windows. Output khung theo quy ước chỗ thấy
// (x, y = tâm) để node Chụp màn hình / Click theo ảnh lấy khung cửa sổ qua imageFrom.

// pollMs – nhịp đọc lại danh sách cửa sổ / app khi chờ.
const pollMs = 200

func (e *Engine) windowStep(ctx context.Context, s model.Step) (map[string]any, error) {
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	if s.WinOp == model.WinClose && !e.allowDanger {
		return nil, dangerErr("đóng cửa sổ")
	}
	if s.WinOp == model.WinWaitClose {
		return map[string]any{}, e.waitWindowGone(ctx, s)
	}
	w, err := e.waitWindow(ctx, s)
	if err != nil {
		return nil, err
	}
	switch s.WinOp {
	case model.WinFocus:
		err = e.wins.Focus(w.ID)
	case model.WinSetBounds:
		var r model.Rect
		if r, err = e.windowTarget(s, w); err == nil {
			if err = e.wins.SetBounds(w.ID, r); err == nil {
				return e.windowOutput(e.settleBounds(ctx, w, r)), nil
			}
		}
	case model.WinMin, model.WinMax, model.WinRestoreOp:
		err = e.wins.SetState(w.ID, s.WinOp)
	case model.WinClose:
		if err = e.wins.Close(w.ID); err == nil {
			return e.windowOutput(w), nil // khung lúc trước khi đóng
		}
	}
	if err != nil {
		return nil, err
	}
	if s.WinOp != model.WinRead && s.WinOp != model.WinWaitOpen {
		w = e.reread(w) // khung / trạng thái sau thao tác (app cỡ cố định: cỡ thật, không phải cỡ đã xin)
	}
	return e.windowOutput(w), nil
}

// findWindow – cửa sổ khớp node lúc này (ok = false: chưa có).
func (e *Engine) findWindow(s model.Step) (model.WindowInfo, bool, error) {
	wins, err := e.wins.List()
	if err != nil {
		return model.WindowInfo{}, false, err
	}
	i, err := model.MatchWindow(wins, s.WinApp, s.WinTitle, s.WinMatch)
	if err != nil {
		return model.WindowInfo{}, false, &invalidErr{err.Error()}
	}
	if i < 0 {
		return model.WindowInfo{}, false, nil
	}
	return wins[i], true, nil
}

// pollUntil gọi done mỗi pollMs tới khi done trả true hoặc hết TimeoutMs (lỗi theo late); kind = Wait.Kind của tiến
// độ (window | app). Dùng chung node Cửa sổ / Ứng dụng.
func (e *Engine) pollUntil(ctx context.Context, s model.Step, kind string, done func() (bool, error), late func() error) error {
	start := time.Now()
	defer e.update(true, func(p *Progress) { p.Wait = nil })
	for first := true; ; first = false {
		if err := e.gate.wait(ctx); err != nil {
			return err
		}
		ok, err := done()
		if err != nil || ok {
			return err
		}
		elapsed := time.Since(start)
		if elapsed >= time.Duration(s.TimeoutMs)*time.Millisecond {
			return late()
		}
		e.update(first, func(p *Progress) {
			p.Wait = &WaitProgress{Kind: kind, ElapsedMs: elapsed.Milliseconds(), TimeoutMs: int64(s.TimeoutMs), What: cmp.Or(s.WinTitle, s.WinApp, s.Target)}
		})
		if err := Sleep(ctx, pollMs); err != nil {
			return err
		}
	}
}

// waitWindow chờ tới khi có cửa sổ khớp. Hết giờ: chờ mở → timeout, thao tác khác → not_found.
func (e *Engine) waitWindow(ctx context.Context, s model.Step) (model.WindowInfo, error) {
	var w model.WindowInfo
	err := e.pollUntil(ctx, s, "window", func() (bool, error) {
		var ok bool
		var err error
		w, ok, err = e.findWindow(s)
		return ok, err
	}, func() error {
		msg := fmt.Sprintf("không thấy cửa sổ %s sau %s", windowName(s), fmtSeconds(s.TimeoutMs))
		wins, _ := e.wins.List() // đọc lỗi → không có ứng viên, vẫn báo lỗi chính
		if s.WinOp == model.WinWaitOpen {
			return &timeoutErr{msg: msg, detail: windowMiss(s, wins)}
		}
		return &notFoundErr{msg: msg, detail: windowMiss(s, wins)}
	})
	return w, err
}

func (e *Engine) waitWindowGone(ctx context.Context, s model.Step) error {
	return e.pollUntil(ctx, s, "window", func() (bool, error) {
		_, ok, err := e.findWindow(s)
		return !ok, err
	}, func() error {
		return &timeoutErr{msg: fmt.Sprintf("cửa sổ %s vẫn mở sau %s", windowName(s), fmtSeconds(s.TimeoutMs))}
	})
}

// boundsSettleMs – chờ tối đa sau setBounds: Chrome macOS nhận lệnh AX ngay nhưng ~1 s sau mới đổi khung.
const boundsSettleMs = 2000

// settleBounds – đọc lại tới khi khung khớp đích (±2 px), để output và node sau (chụp, click theo toạ độ) thấy khung
// mới. App kẹp cỡ (cỡ tối thiểu / cố định) không bao giờ khớp → hết boundsSettleMs trả lần đọc cuối (cỡ thật).
func (e *Engine) settleBounds(ctx context.Context, w model.WindowInfo, want model.Rect) model.WindowInfo {
	end := time.Now().Add(boundsSettleMs * time.Millisecond) // mỗi lần đọc danh sách cửa sổ cũng tốn thời gian
	for {
		cur := e.reread(w)
		if nearRect(cur.Box, want) || time.Now().After(end) || Sleep(ctx, pollMs/2) != nil {
			return cur
		}
	}
}

func nearRect(a, b model.Rect) bool {
	d := func(x, y int) bool { return x-y <= 2 && y-x <= 2 }
	return d(a.X, b.X) && d(a.Y, b.Y) && d(a.W, b.W) && d(a.H, b.H)
}

// reread – thông tin mới của cửa sổ w (theo id); không đọc được thì giữ w.
func (e *Engine) reread(w model.WindowInfo) model.WindowInfo {
	wins, err := e.wins.List()
	if err == nil {
		for _, x := range wins {
			if x.ID == w.ID {
				return x
			}
		}
	}
	return w
}

// windowTarget – khung đích của setBounds: preset trong vùng làm việc của màn Display (0 = màn chứa cửa sổ).
func (e *Engine) windowTarget(s model.Step, w model.WindowInfo) (model.Rect, error) {
	var want model.Rect
	if s.WinRect != nil {
		want = *s.WinRect
	}
	if s.WinPreset == model.PresetRect {
		if want.W <= 0 || want.H <= 0 {
			return want, &invalidErr{"chưa nhập cỡ cửa sổ"}
		}
		return want, nil
	}
	screen := w.Box
	if s.Display > 0 {
		if s.Display > len(e.displays) {
			return want, &invalidErr{fmt.Sprintf("không có màn hình %d (máy có %d màn)", s.Display, len(e.displays))}
		}
		screen = e.displays[s.Display-1]
	}
	return model.WindowPreset(s.WinPreset, e.wins.WorkArea(screen), want), nil
}

// windowOutput – output của node: khung theo quy ước chỗ thấy (x, y = tâm) + góc trên trái left, top.
func (e *Engine) windowOutput(w model.WindowInfo) map[string]any {
	b := w.Box
	c := model.Point{X: b.X + b.W/2, Y: b.Y + b.H/2}
	display := 0 // 0 = không thuộc màn nào (thu nhỏ – khung rỗng)
	for i, d := range e.displays {
		if c.X >= d.X && c.X < d.X+d.W && c.Y >= d.Y && c.Y < d.Y+d.H {
			display = i + 1
			break
		}
	}
	return map[string]any{
		"title": w.Title, "app": w.App, "pid": w.PID, "x": c.X, "y": c.Y, "w": b.W, "h": b.H, "left": b.X, "top": b.Y,
		"display": display, "minimized": w.Minimized,
	}
}

// windowName – "Zalo · “Tin nhắn”" cho lời báo.
func windowName(s model.Step) string {
	switch {
	case s.WinApp != "" && s.WinTitle != "":
		return fmt.Sprintf("%s · “%s”", s.WinApp, s.WinTitle)
	case s.WinApp != "":
		return s.WinApp
	}
	return fmt.Sprintf("“%s”", s.WinTitle)
}
