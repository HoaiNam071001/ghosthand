package engine

import (
	"context"
	"fmt"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// resolveGameArea – node có searchArea "game": hỏi Wisp khung game hiện giờ (cửa sổ có thể đã bị dời) trước khi tìm.
// Lỗi nói cách sửa; searchArea trả khung này cho cả node (kể cả thử lại).
func (e *Engine) resolveGameArea(ctx context.Context, s model.Step) error {
	e.gameArea = nil
	if s.SearchArea != model.SearchGame {
		return nil
	}
	g, ok := e.browser.(web.GameFramer)
	if !ok {
		return fmt.Errorf("vùng tìm “khung game Wisp” cần trình duyệt Wisp – mở Wisp (bật Ghosthand) và chọn Wisp ở Cài đặt → Trình duyệt")
	}
	r, err := g.GameRect(ctx, "")
	if err != nil {
		return err
	}
	e.gameArea = &r
	return nil
}
