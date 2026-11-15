package wisp

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Find – một lần tìm (không chờ) bằng lệnh find của Wisp. Sắp bấm (Scroll) mà phần tử ngoài khung nhìn thì cuộn tới
// (lệnh scroll tới ref) rồi tìm lại một lần để có khung + "bị che" đúng chỗ sẽ bấm.
func (b *Browser) Find(ctx context.Context, q web.Query) (web.Found, error) {
	t, _, ok, err := b.tabFor(ctx, q.Tab)
	if err != nil {
		return web.Found{}, err
	}
	if !ok {
		return web.Found{Selector: -1, NoTab: true}, nil
	}
	handled, d, err := b.gateDialog(ctx, t.ID, q.Dialog)
	if err != nil || d != nil {
		return web.Found{Selector: -1, Tab: t.URL, Dialog: d}, err
	}
	if q.Viewport {
		return b.viewport(ctx, t)
	}
	r, err := b.find(ctx, t.ID, q)
	if err != nil || r == nil {
		return web.Found{Selector: -1, Tab: t.URL, Loading: true}, err
	}
	i := pickElem(*r, q)
	if q.Scroll && i >= 0 && !r.Found[i].InView {
		if err := b.call(ctx, "scroll", map[string]any{"tab": tabArg(t.ID), "ref": r.Found[i].Ref}, nil); err == nil {
			if again, err := b.find(ctx, t.ID, q); err == nil && again != nil {
				r, i = again, pickElem(*again, q)
			}
		}
	}
	f := toFound(*r, i, q, t.URL, !q.Background, runtime.GOOS == "windows")
	if f.OK && q.Scroll && !q.CheckOnly { // sắp bấm: khung còn đổi (hiệu ứng, trang đang dàn lại) thì chưa bấm
		if r, i, f, err = b.steady(ctx, t, q, *r, i, f); err != nil {
			return f, err
		}
	}
	f.Loading, f.Handled = t.Loading, handled
	if i < 0 {
		return f, nil
	}
	b.mu.Lock()
	b.last, b.lastTab = r.Found[i], t.ID
	b.mu.Unlock()
	if q.Read != "" && f.OK {
		f.Value, err = b.read(ctx, t.ID, r.Found[i].Ref, q.Read, q.Attr)
	}
	return f, err
}

// steadyGap – khoảng giữa hai lần đọc khung khi sắp bấm.
const steadyGap = 60 * time.Millisecond

// steady – đọc lại sau steadyGap; khung khác lần trước → Moving (OK = false, engine tìm lại tới hết giờ).
func (b *Browser) steady(ctx context.Context, t tabEntry, q web.Query, r findResult, i int, f web.Found) (*findResult, int, web.Found, error) {
	if err := sleepCtx(ctx, steadyGap); err != nil {
		return &r, i, f, err
	}
	again, err := b.find(ctx, t.ID, q)
	if err != nil || again == nil {
		return &r, i, f, err
	}
	j := pickElem(*again, q)
	g := toFound(*again, j, q, t.URL, !q.Background, runtime.GOOS == "windows")
	if g.OK && !sameBox(r.Found[i], again.Found[j]) {
		g.OK, g.Moving = false, true
	}
	return again, j, g, nil
}

// find gọi lệnh find (mọi phần tử đang hiện, không tính selector bền). nil, nil = trang chưa trả lời (đang tải /
// chuyển trang) – coi như chưa thấy, engine tìm lại.
func (b *Browser) find(ctx context.Context, tab int, q web.Query) (*findResult, error) {
	args := map[string]any{"tab": tabArg(tab), "selectors": selectorLines(q.Selectors), "all": true, "brief": true}
	if q.Scope != "" {
		args["scope"] = q.Scope
	}
	var r findResult
	err := b.call(ctx, "find", args, &r)
	switch codeOf(err) {
	case "":
		if err != nil {
			return nil, wispErr("tìm", err)
		}
		return &r, nil
	case "timeout":
		return nil, nil
	case "no_tab":
		return &findResult{SelectorIndex: -1}, nil
	}
	return nil, wispErr("tìm", err)
}

// gateDialog – hộp thoại JS đang mở trên tab: mode "" → trả hộp để engine báo; accept / dismiss → trả lời rồi tìm tiếp.
func (b *Browser) gateDialog(ctx context.Context, tab int, mode string) (handled, open *web.Dialog, err error) {
	b.mu.Lock()
	d := b.dialogs[tab]
	b.mu.Unlock()
	if d == nil {
		return nil, nil, nil
	}
	if mode == "" {
		return nil, d, nil
	}
	accept := mode == model.WebDialogAccept
	if err := b.call(ctx, "dialog", map[string]any{"tab": tabArg(tab), "accept": accept}, nil); err != nil && codeOf(err) != "not_found" {
		return nil, nil, wispErr("trả lời hộp thoại", err)
	}
	b.mu.Lock()
	delete(b.dialogs, tab)
	b.mu.Unlock()
	return d, nil, nil
}

// viewport – khung nhìn của trang (webScroll không có selector lăn giữa trang).
func (b *Browser) viewport(ctx context.Context, t tabEntry) (web.Found, error) {
	var o struct {
		View struct {
			W int `json:"w"`
			H int `json:"h"`
		} `json:"view"`
	}
	if err := b.call(ctx, "outline", map[string]any{"tab": tabArg(t.ID), "maxNodes": 0}, &o); err != nil {
		if codeOf(err) == "timeout" {
			return web.Found{Selector: -1, Tab: t.URL, Loading: true}, nil
		}
		return web.Found{}, wispErr("đọc khung nhìn", err)
	}
	b.mu.Lock()
	b.last, b.lastTab = elem{}, t.ID
	b.mu.Unlock()
	return web.Found{OK: true, Selector: -1, Tab: t.URL, Rect: model.Rect{W: o.View.W, H: o.View.H}, Count: 1}, nil
}

// read – webRead: text | value | attr (thuộc tính name).
func (b *Browser) read(ctx context.Context, tab int, ref, what, attr string) (string, error) {
	w := what
	if what == "attr" {
		w = "attrs"
	}
	var r struct {
		Value any `json:"value"`
	}
	if err := b.call(ctx, "read", map[string]any{"tab": tabArg(tab), "ref": ref, "what": w}, &r); err != nil {
		return "", wispErr("đọc phần tử", err)
	}
	if what == "attr" {
		m, _ := r.Value.(map[string]any)
		if v, ok := m[attr]; ok {
			return fmt.Sprint(v), nil
		}
		return "", nil
	}
	s, _ := r.Value.(string)
	return s, nil
}
