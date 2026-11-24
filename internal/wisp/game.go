package wisp

import (
	"context"
	"runtime"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// frameResult – kết quả lệnh frameRect của cổng Wisp: khung game (embed / canvas / cả cửa sổ engine Flash).
type frameResult struct {
	Tag        string      `json:"tag"`
	ScreenRect *screenRect `json:"screenRect"`
	Hidden     bool        `json:"hidden"` // cửa sổ game Flash thu nhỏ / ẩn – chụp màn hình không thấy game
}

// GameRect – khung game của tab trên màn hình theo toạ độ robotgo (web.GameFramer): vùng tìm "khung game Wisp".
func (b *Browser) GameRect(ctx context.Context, tab string) (model.Rect, error) {
	args := map[string]any{}
	if tab != "" {
		args["tab"] = tab
	}
	var r frameResult
	if err := b.call(ctx, "frameRect", args, &r); err != nil {
		return model.Rect{}, wispErr("frameRect", err)
	}
	return gameArea(r, runtime.GOOS == "windows")
}

// gameArea – frameRect → vùng màn hình. Windows: điểm DIP × tỉ lệ = pixel thật (như toFound).
func gameArea(r frameResult, physical bool) (model.Rect, error) {
	s := r.ScreenRect
	switch {
	case s == nil || s.W <= 0 || s.H <= 0:
		return model.Rect{}, &web.BrowserError{Msg: "Wisp không báo khung game (tab chưa có game / embed?)"}
	case r.Hidden:
		return model.Rect{}, &web.BrowserError{Msg: "cửa sổ game Wisp đang thu nhỏ / ẩn – mở lại cửa sổ rồi chạy"}
	case s.Offscreen:
		return model.Rect{}, &web.BrowserError{Msg: "tab game đang không xem – chọn tab game trong Wisp rồi chạy"}
	}
	k := 1.0
	if physical && s.Scale > 0 {
		k = s.Scale
	}
	return model.Rect{X: int(float64(s.X) * k), Y: int(float64(s.Y) * k), W: int(float64(s.W) * k), H: int(float64(s.H) * k)}, nil
}
