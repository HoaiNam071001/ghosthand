package engine

import (
	"context"
	"os"
	"strings"
	"time"

	"ghosthand/internal/model"
)

// actionOutput – output của node chuột / phím / chờ / mở sau khi chạy xong (khớp Outputs trong model/steptypes.go,
// flow/view.ts outputsOf). s đã thay biến + numVars nên output là giá trị thật đã dùng.
func (e *Engine) actionOutput(s model.Step, wait int) map[string]any {
	switch s.Type {
	case model.StepClick, model.StepDouble, model.StepDrag:
		return e.withFocus(map[string]any{"x": e.last.X, "y": e.last.Y}) // chỗ chuột dừng
	case model.StepHold:
		return map[string]any{"x": e.last.X, "y": e.last.Y, "ms": s.HoldMs}
	case model.StepWait:
		return map[string]any{"ms": wait}
	case model.StepText:
		return e.withFocus(map[string]any{"text": s.Text})
	case model.StepKey:
		return e.withFocus(map[string]any{"keys": strings.Join(append(append([]string{}, s.Modifiers...), s.Keys...), "+")})
	case model.StepScroll:
		out := map[string]any{"direction": s.Direction, "amount": s.Amount}
		if e.hasLast { // không có điểm và chưa node chuột nào chạy: không biết chuột ở đâu – không có x, y
			out["x"], out["y"] = e.last.X, e.last.Y
		}
		return out
	case model.StepOpen:
		app := s.App
		if s.WebBrowser {
			app = "Chrome của app"
		}
		return map[string]any{"target": s.Target, "app": app}
	}
	return nil
}

// selfPID – cửa sổ của chính app (thanh mini luôn nổi trên cùng lúc chạy) không tính là cửa sổ đang ở trước / mới mở.
// Windows đã bỏ sẵn ở device.List; macOS còn liệt kê (AI chụp được cửa sổ Ghosthand).
var selfPID = os.Getpid()

// foreground – cửa sổ đang ở trước: cửa sổ không thu nhỏ đầu tiên theo thứ tự chồng (device.Windows.List), bỏ cửa sổ của app.
func foreground(ws []model.WindowInfo) (model.WindowInfo, bool) {
	for _, w := range ws {
		if !w.Minimized && w.PID != selfPID {
			return w, true
		}
	}
	return model.WindowInfo{}, false
}

// putWindow ghi window (tiêu đề) + windowApp của w vào out – AI / node sau kiểm tra thao tác có vào đúng app không.
func putWindow(out map[string]any, w model.WindowInfo) map[string]any {
	out["window"], out["windowApp"] = w.Title, w.App
	return out
}

// withFocus thêm cửa sổ đang ở trước sau thao tác; không đọc được danh sách cửa sổ (macOS chưa có) thì bỏ.
func (e *Engine) withFocus(out map[string]any) map[string]any {
	if ws, err := e.wins.List(); err == nil {
		if w, ok := foreground(ws); ok {
			putWindow(out, w)
		}
	}
	return out
}

// openStep mở rồi tự chờ DelayAfter (execNode không chờ thêm), trong lúc chờ dò cửa sổ mới hiện: thấy → window /
// windowApp của nó + newWindow = true; hết giờ không thấy (vd mở URL vào tab mới của Chrome đang mở) → cửa sổ đang ở
// trước + newWindow = false. Thấy sớm vẫn chờ đủ – giữ đúng thời gian người dùng đặt. Có node Tab trình duyệt làm với
// tab node này mở (TabFrom) thì cuối cùng ghi thêm tab đang hiện của trình duyệt ở trước (tabId, tabUrl… – browsertab.go).
func (e *Engine) openStep(ctx context.Context, s model.Step, wait int) (map[string]any, error) {
	before, listErr := e.wins.List()
	known := map[uint64]bool{}
	for _, w := range before {
		known[w.ID] = true
	}
	start := time.Now()
	if err := e.doStep(ctx, s); err != nil {
		return nil, err
	}
	out := e.actionOutput(s, wait)
	left := func() int { return wait - int(time.Since(start).Milliseconds()) }
	for listErr == nil {
		ws, err := e.wins.List()
		if err != nil {
			break
		}
		if w, ok := newWindow(ws, known); ok {
			putWindow(out, w)["newWindow"] = true
			break
		}
		if left() <= 0 {
			if w, ok := foreground(ws); ok {
				putWindow(out, w)
			}
			out["newWindow"] = false
			break
		}
		if err := Sleep(ctx, min(pollMs, left())); err != nil {
			return nil, err
		}
	}
	if err := Sleep(ctx, max(left(), 0)); err != nil {
		return nil, err
	}
	if e.opensTab(s.ID) {
		e.putOpenedTab(ctx, out)
	}
	return out, nil
}

// newWindow – cửa sổ trên cùng không thu nhỏ chưa có trong known.
func newWindow(ws []model.WindowInfo, known map[uint64]bool) (model.WindowInfo, bool) {
	for _, w := range ws {
		if !known[w.ID] && !w.Minimized && w.PID != selfPID {
			return w, true
		}
	}
	return model.WindowInfo{}, false
}
