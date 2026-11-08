package engine

import (
	"context"

	"ghosthand/internal/web"
)

// Sau click / gõ / phím web (bước 56 B2): chờ trang yên rồi ghi output navigated / url / popup – cổng nhánh và AI biết
// thao tác đã sang trang / mở tab mới chưa, node sau bắt đầu trên trang đã dựng xong. Đánh dấu / chờ lỗi (trình duyệt
// không trả lời) thì bỏ qua: thao tác đã làm, không biến thành lỗi node.

// webMark đánh dấu tab ngay trước thao tác (lastFind: tab vừa tìm thấy phần tử; không thì theo tab như webKey).
func (e *Engine) webMark(ctx context.Context, tab string, lastFind bool) (*web.Mark, error) {
	m, err := e.browser.Mark(ctx, tab, lastFind)
	if err != nil {
		return nil, ctx.Err()
	}
	return &m, nil
}

// webSettle chờ trang yên sau thao tác rồi thêm output (m nil = không đánh dấu được – không thêm).
func (e *Engine) webSettle(ctx context.Context, m *web.Mark, out map[string]any) error {
	if m == nil {
		return nil
	}
	eff, err := e.browser.Settle(ctx, *m)
	if err != nil {
		return ctx.Err()
	}
	out["navigated"], out["url"], out["popup"] = eff.Navigated, eff.URL, eff.Popup
	return nil
}
