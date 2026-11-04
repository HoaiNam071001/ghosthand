package engine

import (
	"context"
	"fmt"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Hộp thoại JS trên trang (bước 56 B1): webDialog "" → lỗi web_dialog ngay kèm chữ trong hộp (trang treo tới khi hộp
// đóng nên chờ tiếp vô ích); accept / dismiss → trình duyệt tự đóng rồi tìm tiếp, output dialogText.

// dialogErr – trang đang mở hộp thoại JS (StepError code web_dialog).
type dialogErr struct{ d web.Dialog }

func (e *dialogErr) Error() string {
	return fmt.Sprintf("trang đang mở hộp thoại %s: “%s” – đặt Hộp thoại JS (webDialog) accept / dismiss để node tự đóng", e.d.Type, e.d.Message)
}

// noteDialog – kết quả một lần Find: hộp chưa xử lý → lỗi; đã tự đóng → nhớ chữ cho output.
func (e *Engine) noteDialog(f web.Found) error {
	if f.Dialog != nil {
		return &dialogErr{*f.Dialog}
	}
	if f.Handled != nil {
		e.dialogText = f.Handled.Message
	}
	return nil
}

// webNode – node web có tìm phần tử: chạy theo loại, thêm dialogText khi đã tự đóng hộp thoại JS giữa chừng.
func (e *Engine) webNode(ctx context.Context, s model.Step) (map[string]any, error) {
	e.dialogText = ""
	var out map[string]any
	var err error
	switch s.Type {
	case model.StepWebWait:
		out, err = e.webWait(ctx, s)
	case model.StepWebClick:
		out, err = e.webClick(ctx, s)
	case model.StepWebType:
		out, err = e.webType(ctx, s)
	case model.StepWebRead:
		out, err = e.webRead(ctx, s)
	case model.StepWebScroll:
		out, err = e.webScroll(ctx, s)
	}
	if err == nil && e.dialogText != "" {
		if out == nil {
			out = map[string]any{}
		}
		out["dialogText"] = e.dialogText
	}
	return out, err
}
