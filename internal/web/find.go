package web

import (
	"context"
	_ "embed"
	"encoding/json"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
)

var (
	//go:embed common.js
	commonJS string
	//go:embed find.js
	findJS string
	//go:embed probe.js
	probeJS string
)

// pageJS – biểu thức gọi hàm fn (find.js / probe.js) với args JSON, có helper common.js đi trước.
func pageJS(fn string, args ...string) string {
	return "(() => {\n" + commonJS + "\nreturn (" + strings.TrimSpace(fn) + ")(" + strings.Join(args, ", ") + ");\n})()"
}

// findResult – kết quả find.js (toạ độ client, CSS px).
type findResult struct {
	Sel      int        `json:"sel"`
	Hidden   int        `json:"hidden"`
	Loading  bool       `json:"loading"`
	Geom     geom       `json:"geom"`
	Focus    bool       `json:"focus"`
	Visible  bool       `json:"visible"`
	X        float64    `json:"x"`
	Y        float64    `json:"y"`
	W        float64    `json:"w"`
	H        float64    `json:"h"`
	Text     string     `json:"text"`
	InView   bool       `json:"inView"`
	Covered  string     `json:"covered"`
	Count    int        `json:"count"`
	Value    string     `json:"value"`
	Counts   []SelCount `json:"counts"`
	NoDialog bool       `json:"noDialog"`
	Wheel    *wheelBox  `json:"wheel"`
}

// wheelBox – out.wheel của find.js: vùng đặt chuột (toạ độ client trang chính), hướng, quãng px.
type wheelBox struct {
	X, Y, W, H, Px float64
	Dir            string
}

// found – Found chưa có khung màn hình. Bị che / tâm ngoài viewport khi phải bấm → chưa coi là thấy.
func (r findResult) found(tab string, q Query) Found {
	f := Found{Selector: r.Sel, Hidden: r.Hidden, Tab: tab, Text: r.Text, Covered: r.Covered, Loading: r.Loading, OffView: r.Sel >= 0 && !r.InView,
		Count: r.Count, Value: r.Value, Counts: r.Counts, NoDialog: r.NoDialog}
	f.OK = r.Sel >= 0 && (q.CheckOnly || r.Covered == "" && (r.InView || !q.Scroll))
	return f
}

// aimable – đáng đo toạ độ màn hình: thấy để bấm, hoặc phải lăn chuột tới (find.js trả khung lăn).
func (r findResult) aimable(f Found) bool { return f.OK || r.Wheel != nil }

// cdpTimeout – mỗi lệnh CDP tối đa (trang treo / trình duyệt không trả lời thì báo lỗi, không treo engine).
const cdpTimeout = 5 * time.Second

// run chạy action trên tab tctx; dừng khi ctx (lần chạy) bị huỷ hoặc quá cdpTimeout.
func run[T any](ctx, tctx context.Context, what string, a chromedp.Action[T]) (T, error) {
	cctx, cancel := context.WithTimeout(tctx, cdpTimeout)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	defer stop()
	v, err := chromedp.Run(cctx, a)
	if err != nil && ctx.Err() != nil {
		return v, ctx.Err()
	}
	return v, browserErr(what, err)
}

func runFind(ctx, tctx context.Context, q Query) (findResult, error) {
	sels, err := json.Marshal(q.Selectors)
	if err != nil {
		return findResult{}, err
	}
	opts, err := json.Marshal(map[string]any{"scroll": q.Scroll, "read": q.Read, "attr": q.Attr, "viewport": q.Viewport,
		"scope": q.Scope, "nth": q.Occurrence, "wheel": q.Wheel})
	if err != nil {
		return findResult{}, err
	}
	js := pageJS(findJS, string(sels), string(opts))
	return evalJS[findResult](ctx, tctx, "tìm phần tử", js)
}
