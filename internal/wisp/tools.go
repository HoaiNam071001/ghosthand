package wisp

import (
	"bytes"
	"context"
	"encoding/base64"
	"image/png"

	"ghosthand/internal/web"
)

// Hàm cho MCP / giao diện (read_web_outline, chụp tab, danh sách tab) – như các hàm cùng tên của web.Chrome.

// dialogRoot – gốc outline khi chỉ đọc hộp thoại đang mở (cùng các dạng find scope dialog nhận).
const dialogRoot = "css=[role=dialog], [role=alertdialog], [aria-modal=true], dialog[open]"

// outlineAll – trần dòng khi đọc cả trang để lọc (trần maxNodes của cổng Wisp).
const outlineAll = 2000

// ReadOutline – cây rút gọn của tab; onlyDialog = chỉ trong hộp thoại; all = không cắt ở 300 dòng.
func (b *Browser) ReadOutline(ctx context.Context, tab string, onlyDialog, all bool) (web.Outline, error) {
	t, _, ok, err := b.tabFor(ctx, tab)
	if err != nil {
		return web.Outline{}, err
	}
	if !ok {
		return web.Outline{}, &web.BrowserError{Msg: "không thấy tab Wisp nào khớp “" + tab + "”"}
	}
	args := map[string]any{"tab": tabArg(t.ID), "maxNodes": outlineMax}
	if all {
		args["maxNodes"] = outlineAll
	}
	if onlyDialog {
		args["root"] = dialogRoot
	}
	var r outlineResult
	if err := b.call(ctx, "outline", args, &r); err != nil {
		if onlyDialog && codeOf(err) == "not_found" {
			return web.Outline{URL: t.URL, Title: t.Title, Tab: tabArg(t.ID), Items: []web.OutlineItem{}}, nil
		}
		return web.Outline{}, wispErr("đọc trang", err)
	}
	return toOutline(r, tabArg(t.ID)), nil
}

// Tabs – các tab đang mở của Wisp.
func (b *Browser) Tabs(ctx context.Context) ([]web.Tab, error) {
	var tabs []tabEntry
	if err := b.call(ctx, "tabs", map[string]any{}, &tabs); err != nil {
		return nil, wispErr("tabs", err)
	}
	out := make([]web.Tab, len(tabs))
	for i, t := range tabs {
		out[i] = web.Tab{ID: tabArg(t.ID), Title: t.Title, URL: t.URL}
	}
	return out, nil
}

// Screenshot – ảnh phần đang thấy của tab; CSSWidth = bề ngang khung nhìn (CSS px) để đổi toạ độ ảnh ↔ trang.
func (b *Browser) Screenshot(ctx context.Context, tab string) (web.TabShot, error) {
	t, _, ok, err := b.tabFor(ctx, tab)
	if err != nil {
		return web.TabShot{}, err
	}
	if !ok {
		return web.TabShot{}, &web.BrowserError{Msg: "không thấy tab Wisp nào khớp “" + tab + "”"}
	}
	var r struct {
		PNG string `json:"png"`
	}
	if err := b.call(ctx, "screenshot", map[string]any{"tab": tabArg(t.ID)}, &r); err != nil {
		return web.TabShot{}, wispErr("chụp tab", err)
	}
	raw, err := base64.StdEncoding.DecodeString(r.PNG)
	if err != nil {
		return web.TabShot{}, &web.BrowserError{Msg: "ảnh Wisp trả hỏng: " + err.Error()}
	}
	img, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		return web.TabShot{}, &web.BrowserError{Msg: "ảnh Wisp trả hỏng: " + err.Error()}
	}
	var o outlineResult
	_ = b.call(ctx, "outline", map[string]any{"tab": tabArg(t.ID), "maxNodes": 0}, &o)
	w := o.View.W
	if w == 0 {
		w = img.Bounds().Dx()
	}
	return web.TabShot{Image: img, Tab: tabArg(t.ID), URL: t.URL, CSSWidth: w}, nil
}
