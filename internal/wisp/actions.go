package wisp

import (
	"context"

	"ghosthand/internal/web"
)

// Thao tác trên phần tử của lần Find gần nhất – lệnh của Wisp (sự kiện thật trong trình duyệt). (x, y) là toạ độ trong
// trang (CSS px) như Found.Rect khi chạy nền → đổi thành độ lệch trong phần tử để Wisp tự cuộn + kiểm bị che.

// lastElem – phần tử + tab của lần Find gần nhất.
func (b *Browser) lastElem() (elem, int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.lastTab == 0 {
		return elem{}, 0, &web.BrowserError{Msg: "chưa tìm phần tử nào trên Wisp"}
	}
	return b.last, b.lastTab, nil
}

// Hover – Wisp không dùng chuột thật: không có gì để thử (engine chạy như chạy nền nên không gọi tới).
func (b *Browser) Hover(context.Context, int, int, bool) (web.Hover, error) {
	return web.Hover{OK: true}, nil
}

// Focused – ô đang nhận phím có phải phần tử vừa bấm không.
func (b *Browser) Focused(ctx context.Context) (bool, string, error) {
	e, tab, err := b.lastElem()
	if err != nil {
		return false, "", err
	}
	var r struct {
		OK     bool   `json:"ok"`
		Ref    string `json:"ref"`
		Active string `json:"active"`
	}
	if err := b.call(ctx, "focused", map[string]any{"tab": tabArg(tab), "ref": e.Ref}, &r); err != nil {
		return false, "", wispErr("xem ô đang nhận phím", err)
	}
	if r.OK && r.Ref != "" { // trang thay ô khi bấm (Vue / React) – gõ vào ô mới
		b.mu.Lock()
		b.last.Ref = r.Ref
		b.mu.Unlock()
	}
	return r.OK, r.Active, nil
}

// BgClick – bấm tại (x, y) trong phần tử của lần Find gần nhất; count = lần bấm thứ mấy (2 = double-click).
func (b *Browser) BgClick(ctx context.Context, x, y int, button string, count int) error {
	e, tab, err := b.lastElem()
	if err != nil {
		return err
	}
	if button == "" {
		button = "left"
	}
	args := map[string]any{"tab": tabArg(tab), "ref": e.Ref, "button": button, "count": min(max(count, 1), 3),
		"offset": map[string]int{"x": x - e.Rect.X, "y": y - e.Rect.Y}}
	if e.Ref == "" { // khung nhìn (Query.Viewport) – không có phần tử để bấm
		return &web.BrowserError{Msg: "không có phần tử để bấm"}
	}
	if err := b.call(ctx, "click", args, nil); err != nil {
		return wispErr("bấm", err)
	}
	return nil
}

// wheelPx – một nấc lăn chuột (như device.scrollNotch).
const wheelPx = 100

// BgWheel – lăn một nấc tại phần tử của lần Find gần nhất (khung nhìn: giữa trang).
func (b *Browser) BgWheel(ctx context.Context, _, _ int, dir string) error {
	e, tab, err := b.lastElem()
	if err != nil {
		return err
	}
	args := map[string]any{"tab": tabArg(tab), "dir": dir, "amount": wheelPx}
	if e.Ref != "" {
		args["ref"] = e.Ref
	}
	if err := b.call(ctx, "scroll", args, nil); err != nil {
		return wispErr("cuộn", err)
	}
	return nil
}

// BgType – gõ vào ô đang nhận phím (đã bấm vào + kiểm Focused): xoá chữ cũ, chèn text, Enter.
func (b *Browser) BgType(ctx context.Context, text string, clear, enter bool) error {
	_, tab, err := b.lastElem()
	if err != nil {
		return err
	}
	args := map[string]any{"tab": tabArg(tab), "text": text, "clear": clear, "enter": enter}
	if err := b.call(ctx, "type", args, nil); err != nil {
		return wispErr("gõ", err)
	}
	return nil
}

// Keys – node webKey: bấm phím vào tab (bộ lọc như Query.Tab), trả URL tab. Wisp bấm lần lượt từng phím, mỗi phím
// kèm mods – tổ hợp (sequence = false) thường chỉ có một phím chính nên như nhau.
func (b *Browser) Keys(ctx context.Context, tab string, keys, mods []string, _ bool) (string, error) {
	t, _, ok, err := b.tabFor(ctx, tab)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", &web.BrowserError{Msg: "không thấy tab Wisp nào có id hoặc URL / tiêu đề chứa “" + tab + "”"}
	}
	args := map[string]any{"tab": tabArg(t.ID), "keys": keys}
	if len(mods) > 0 {
		args["mods"] = mods
	}
	if err := b.call(ctx, "keys", args, nil); err != nil {
		return "", wispErr("bấm phím", err)
	}
	return t.URL, nil
}
