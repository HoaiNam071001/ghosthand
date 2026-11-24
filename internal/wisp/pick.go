package wisp

import (
	"context"
	"encoding/json"
	"errors"

	"ghosthand/internal/web"
)

// Chọn element trên Wisp (bước 65): người dùng rê + bấm phần tử trong trình duyệt, Wisp đẩy sự kiện `pick`.

// PickEvent – dữ liệu sự kiện `pick`. Action: click | type | waitFor | read.
type PickEvent struct {
	Tab       int      `json:"tab"`
	URL       string   `json:"url"`
	Action    string   `json:"action"`
	Selector  string   `json:"selector"`  // cái người dùng chọn / sửa
	Selectors []string `json:"selectors"` // các ứng viên bền
	Count     int      `json:"count"`     // số phần tử khớp lúc bấm (> 1: chưa chắc chắn)
	Role      string   `json:"role"`
	Name      string   `json:"name"`
	Text      string   `json:"text"`
	Value     string   `json:"value"`
	Input     string   `json:"input"` // chỉ có khi Action = type
}

// OnPick đặt hàm nhận sự kiện chọn (gọi từ goroutine đọc – đừng chặn lâu). Đặt trước khi nối: chỉ khi có hàm
// này kết nối mới đăng ký sự kiện `pick`.
func (b *Browser) OnPick(fn func(PickEvent)) {
	b.mu.Lock()
	b.onPick = fn
	b.mu.Unlock()
}

// Pick bật / tắt chế độ chọn trên tab đang dùng. Wisp cũ chưa có lệnh `pick` → báo cập nhật.
func (b *Browser) Pick(ctx context.Context, on bool) error {
	// kết nối đã rớt / người dùng ngắt chip: bấm lại nút là ý định mới → bỏ kết nối cũ để nối lại
	b.mu.Lock()
	stale := b.conn != nil && b.conn.Err() != nil
	b.mu.Unlock()
	if stale {
		b.Close()
	}
	err := b.call(ctx, "pick", map[string]any{"on": on}, nil)
	var ce *CmdError
	if errors.As(err, &ce) && ce.Code == "bad_args" {
		return &web.BrowserError{Msg: "Wisp bản này chưa có chế độ chọn phần tử – cập nhật Wisp"}
	}
	if err != nil {
		return wispErr("chọn phần tử", err)
	}
	return nil
}

// PickDone – Wisp hiện toast báo đã thêm (lỗi bỏ qua: chỉ là thông báo).
func (b *Browser) PickDone(ctx context.Context, msg string) {
	_ = b.call(ctx, "pickDone", map[string]any{"message": msg}, nil)
}

// firePick giải sự kiện `pick` rồi gọi OnPick (ngoài khoá).
func (b *Browser) firePick(data json.RawMessage) {
	var ev PickEvent
	if json.Unmarshal(data, &ev) != nil {
		return
	}
	b.mu.Lock()
	fn := b.onPick
	b.mu.Unlock()
	if fn != nil {
		fn(ev)
	}
}
