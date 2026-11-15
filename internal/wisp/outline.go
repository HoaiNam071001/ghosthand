package wisp

import (
	"context"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// outlineMax – số dòng tối đa như Chrome của app (web.maxOutline).
const outlineMax = 300

type outlineState struct {
	Disabled bool   `json:"disabled"`
	Focused  bool   `json:"focused"`
	Level    int    `json:"level"`
	Checked  string `json:"checked"`
	Expanded string `json:"expanded"`
	Selected bool   `json:"selected"`
	Secret   bool   `json:"secret"`
}

type outlineRow struct {
	Role     string       `json:"role"`
	Name     string       `json:"name"`
	Selector string       `json:"selector"`
	Depth    int          `json:"depth"`
	InView   bool         `json:"inView"`
	Rect     rect         `json:"rect"`
	Value    string       `json:"value"`
	State    outlineState `json:"state"`
}

type outlineResult struct {
	URL   string `json:"url"`
	Title string `json:"title"`
	View  struct {
		W       int `json:"w"`
		H       int `json:"h"`
		ScrollX int `json:"scrollX"`
		ScrollY int `json:"scrollY"`
	} `json:"view"`
	Items []outlineRow `json:"items"`
	Total int          `json:"total"`
}

// regions – vai trò là vùng bao các dòng sau (Region = true, như outline.js của Chrome của app).
var regions = map[string]bool{"navigation": true, "main": true, "form": true, "search": true, "dialog": true, "alertdialog": true,
	"tablist": true, "menu": true, "menubar": true, "listbox": true, "tree": true, "table": true, "banner": true,
	"contentinfo": true, "complementary": true, "region": true, "alert": true}

// toOutline – kết quả outline của Wisp → web.Outline (hàm thuần).
func toOutline(r outlineResult, tab string) web.Outline {
	o := web.Outline{URL: r.URL, Title: r.Title, ViewW: r.View.W, ViewH: r.View.H, ScrollX: r.View.ScrollX, ScrollY: r.View.ScrollY,
		Total: r.Total, Tab: tab, Items: make([]web.OutlineItem, 0, len(r.Items))}
	for _, it := range r.Items {
		if it.Role == "dialog" || it.Role == "alertdialog" {
			o.Dialogs++
		}
		o.Items = append(o.Items, web.OutlineItem{Role: it.Role, Name: it.Name, Selector: it.Selector, InView: it.InView,
			Rect: model.Rect{X: it.Rect.X, Y: it.Rect.Y, W: it.Rect.W, H: it.Rect.H}, Depth: it.Depth, Region: regions[it.Role],
			Level: it.State.Level, Value: it.Value, Secret: it.State.Secret, Checked: it.State.Checked, Expanded: it.State.Expanded,
			Selected: it.State.Selected, Disabled: it.State.Disabled, Focused: it.State.Focused})
	}
	return o
}

// PageOutline – cây rút gọn của tab (bộ lọc như Query.Tab).
func (b *Browser) PageOutline(ctx context.Context, tab string) (web.Outline, error) {
	t, _, ok, err := b.tabFor(ctx, tab)
	if err != nil {
		return web.Outline{}, err
	}
	if !ok {
		return web.Outline{}, &web.BrowserError{Msg: "không thấy tab Wisp nào khớp “" + tab + "”"}
	}
	var r outlineResult
	if err := b.call(ctx, "outline", map[string]any{"tab": tabArg(t.ID), "maxNodes": outlineMax}, &r); err != nil {
		return web.Outline{}, wispErr("đọc trang", err)
	}
	return toOutline(r, tabArg(t.ID)), nil
}
