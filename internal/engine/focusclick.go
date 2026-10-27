package engine

import (
	"context"
	"os"

	"ghosthand/internal/model"
)

// focusSettleMs – chờ app nhận focus xong rồi mới click (đổi app trước mặt mất vài chục ms).
const focusSettleMs = 150

// focusUnderCursor đưa cửa sổ nằm trên cùng tại điểm chuột (e.last) lên trước nếu nó chưa ở trước. Không làm thì cú
// click đầu vào cửa sổ chưa focus (vd trình duyệt vừa mở, AI chụp màn hình rồi click tiếp) chỉ tốn vào việc kích hoạt
// app, trang không nhận. Không đọc được danh sách cửa sổ / không thấy cửa sổ nào ở điểm đó → bỏ qua, click như cũ.
func (e *Engine) focusUnderCursor(ctx context.Context) error {
	if !e.focusClick || !e.hasLast {
		return nil
	}
	ws, err := e.wins.List()
	if err != nil {
		return nil
	}
	target, ok := windowToFocus(ws, e.last, os.Getpid())
	if !ok {
		return nil
	}
	if err := e.wins.Focus(target.ID); err != nil {
		return nil // cửa sổ vừa đóng – vẫn click, kết quả do node sau kiểm tra
	}
	return Sleep(ctx, focusSettleMs)
}

// windowToFocus – cửa sổ cần đưa lên trước để click vào p trúng nó: cửa sổ trên cùng chứa p, khi nó chưa phải cửa sổ
// ở trước. Bỏ qua cửa sổ của chính app (selfPID – overlay / mini bar không phải đích click).
func windowToFocus(ws []model.WindowInfo, p model.Point, selfPID int) (model.WindowInfo, bool) {
	var front *model.WindowInfo
	for i := range ws {
		w := ws[i]
		if w.Minimized || w.PID == selfPID {
			continue
		}
		if front == nil {
			front = &ws[i]
		}
		b := w.Box
		if p.X >= b.X && p.X < b.X+b.W && p.Y >= b.Y && p.Y < b.Y+b.H {
			if front.ID == w.ID {
				return model.WindowInfo{}, false
			}
			return w, true
		}
	}
	return model.WindowInfo{}, false
}
