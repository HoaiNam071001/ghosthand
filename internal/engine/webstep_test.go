package engine

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
	"ghosthand/internal/web"
)

// fakeBrowser trả lần lượt các kết quả tìm / thử hover (cuối lặp lại; không có hover = luôn ổn), ghi lại query,
// điểm hover + URL đã mở.
type fakeBrowser struct {
	finds   []web.Found
	n       int
	queries []web.Query
	hovers  []web.Hover
	hovered []string
	opened  []string
	focus   []bool // Focused lần lượt (cuối lặp lại; trống = luôn đúng)
	nFocus  int
	bg      []string // thao tác chạy nền đã gửi
	err     error
	outline web.Outline
}

func (b *fakeBrowser) PageOutline(context.Context, string) (web.Outline, error) {
	return b.outline, nil
}

func (b *fakeBrowser) BgClick(_ context.Context, x, y int, button string, count int) error {
	b.bg = append(b.bg, fmt.Sprintf("click %d,%d %s %d", x, y, button, count))
	return nil
}

func (b *fakeBrowser) BgWheel(_ context.Context, x, y int, dir string) error {
	b.bg = append(b.bg, fmt.Sprintf("wheel %d,%d %s", x, y, dir))
	return nil
}

func (b *fakeBrowser) BgType(_ context.Context, text string, clear, enter bool) error {
	b.bg = append(b.bg, fmt.Sprintf("type %q %v %v", text, clear, enter))
	return nil
}

func (b *fakeBrowser) Focused(context.Context) (bool, string, error) {
	b.nFocus++
	if len(b.focus) == 0 {
		return true, "", nil
	}
	if ok := b.focus[min(b.nFocus-1, len(b.focus)-1)]; !ok {
		return false, "button “Gửi”", nil
	}
	return true, "", nil
}

func (b *fakeBrowser) Hover(_ context.Context, x, y int, onTarget bool) (web.Hover, error) {
	b.hovered = append(b.hovered, fmt.Sprintf("%d,%d %v", x, y, onTarget))
	if len(b.hovers) == 0 {
		return web.Hover{OK: true}, nil
	}
	return b.hovers[min(len(b.hovered)-1, len(b.hovers)-1)], nil
}

func (b *fakeBrowser) Open(_ context.Context, url string) error {
	b.opened = append(b.opened, url)
	return b.err
}

func (b *fakeBrowser) Find(_ context.Context, q web.Query) (web.Found, error) {
	b.n++
	b.queries = append(b.queries, q)
	if b.err != nil {
		return web.Found{}, b.err
	}
	return b.finds[min(b.n-1, len(b.finds)-1)], nil
}

func (b *fakeBrowser) Close() {}

var missing = web.Found{Selector: -1, Tab: "file:///a.html"}

func found(sel int, r model.Rect) web.Found {
	return web.Found{OK: true, Selector: sel, Rect: r, Text: "Xem lịch sử", Tab: "file:///a.html"}
}

func webNode(typ string, mod func(*model.Step)) model.Step {
	return modeltest.Step(typ, func(s *model.Step) {
		s.Selectors, s.TimeoutMs, s.IntervalMs = []string{"text=Xem lịch sử", "", "css=#history"}, 50, 1
		if mod != nil {
			mod(s)
		}
	})
}

func runWeb(t *testing.T, b web.Browser, steps ...model.Step) (*devicetest.FakeInput, []model.StepResult, error) {
	t.Helper()
	in := &devicetest.FakeInput{}
	var res []model.StepResult
	e := New(in, scripttest.Linear(model.Script{Loops: 1, Steps: steps}), Options{Browser: b, OnNode: func(r model.StepResult) { res = append(res, r) }})
	e.intN = func(int) int { return 0 }
	e.pasteAuto, e.imeCheck = false, false // gõ phím như mọi máy, không đụng clipboard / tiến trình thật
	return in, res, e.Run(context.Background())
}

func TestWebClickWaitsThenClicks(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{missing, found(1, model.Rect{X: 100, Y: 200, W: 40, H: 20})}}
	in, res, err := runWeb(t, b, webNode(model.StepWebClick, func(s *model.Step) { s.Dx, s.Clicks = 3, 2 }))
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"move 123,210", "click left false", "move 123,210", "click left false"}; !reflect.DeepEqual(in.Lines(), want) {
		t.Errorf("có %q, muốn %q", in.Lines(), want)
	}
	q := b.queries[0]
	if !q.Scroll || q.CheckOnly || len(q.Selectors) != 2 || q.Selectors[1] != (model.Selector{By: model.SelCSS, Value: "#history"}) {
		t.Errorf("query: %+v", q)
	}
	out := res[0].Output
	if out["selector"] != "css=#history" || out["x"] != 120 || out["clickX"] != 123 || out["text"] != "Xem lịch sử" {
		t.Errorf("output: %v", out)
	}
}

// Hover chưa ổn (Dock che, số đo cũ…) → tìm lại rồi mới bấm; điểm bấm lệch ra ngoài phần tử thì không đòi đúng phần tử.
func TestWebClickRetriesUntilHoverOK(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})},
		hovers: []web.Hover{{Miss: "Dock che"}, {OK: true}}}
	in, _, err := runWeb(t, b, webNode(model.StepWebClick, func(s *model.Step) { s.Dy = 30 }))
	if err != nil {
		t.Fatal(err)
	}
	if b.n != 2 || !reflect.DeepEqual(b.hovered, []string{"120,240 false", "120,240 false"}) {
		t.Errorf("tìm %d lần, hover %q", b.n, b.hovered)
	}
	if want := []string{"move 120,240", "click left false"}; !reflect.DeepEqual(in.Lines(), want) {
		t.Errorf("có %q, muốn %q", in.Lines(), want)
	}
	// hover mãi không ổn → hết giờ báo lý do của hover
	b = &fakeBrowser{finds: []web.Found{found(0, model.Rect{W: 10, H: 10})}, hovers: []web.Hover{{Miss: "bị Dock che"}}}
	if _, _, err := runWeb(t, b, webNode(model.StepWebClick, nil)); err == nil || !strings.Contains(err.Error(), "chưa bấm được: bị Dock che") {
		t.Errorf("lỗi %v", err)
	}
	if b.hovered[0] != "5,5 true" {
		t.Errorf("điểm trong phần tử phải đòi đúng phần tử: %q", b.hovered[0])
	}
}

func TestWebWaitGone(t *testing.T) {
	loading := web.Found{Selector: -1, Loading: true} // tab mới mở chưa tải xong – chưa tính là mất
	b := &fakeBrowser{finds: []web.Found{loading, found(0, model.Rect{}), missing}}
	in, res, err := runWeb(t, b, webNode(model.StepWebWait, func(s *model.Step) { s.WebGone = true }))
	if err != nil {
		t.Fatal(err)
	}
	if b.n != 3 || !b.queries[0].CheckOnly || b.queries[0].Scroll || len(in.Lines()) != 0 {
		t.Errorf("tìm %d lần, query %+v, chuột %q", b.n, b.queries[0], in.Lines())
	}
	if out := ownOutput(res[0]); len(out) != 0 {
		t.Errorf("chờ mất không có output riêng: %v", out)
	}
}

func TestWebTimeoutMessages(t *testing.T) {
	cases := []struct {
		f    web.Found
		tab  string
		want string
	}{
		{missing, "", "không thấy phần tử “text=Xem lịch sử”, “css=#history”"},
		{web.Found{Selector: -1, NoTab: true}, "shop.vn", "không thấy tab nào có id hoặc URL / tiêu đề chứa “shop.vn”"},
		{web.Found{Selector: 0, Covered: "div#popup “Đồng ý cookie”"}, "", "bị div#popup “Đồng ý cookie” che"},
		{web.Found{Selector: -1, Hidden: 2}, "", "có 2 phần tử khớp"},
		{web.Found{Selector: 1, Moving: true}, "", "“css=#history” nhưng nó vẫn đang di chuyển"},
	}
	for _, c := range cases {
		b := &fakeBrowser{finds: []web.Found{c.f}}
		_, res, err := runWeb(t, b, webNode(model.StepWebClick, func(s *model.Step) { s.Tab = c.tab }))
		if err == nil || !strings.Contains(err.Error(), c.want) || res[0].Error.Code != model.ErrNotFound {
			t.Errorf("%+v: lỗi %v, code %v – cần chứa %q", c.f, err, res[0].Error, c.want)
		}
	}
}

func TestWebErrorCodes(t *testing.T) {
	cases := map[error]string{
		web.ErrNoBrowser:                    model.ErrBrowser,
		&web.QueryError{Msg: "SyntaxError"}: model.ErrInvalidInput,
	}
	for e, code := range cases {
		_, res, _ := runWeb(t, &fakeBrowser{err: e}, webNode(model.StepWebWait, nil))
		if res[0].Error == nil || res[0].Error.Code != code {
			t.Errorf("%v: %+v, cần %s", e, res[0].Error, code)
		}
	}
	// không có trình duyệt (Thử node) → code browser, không panic
	in := &devicetest.FakeInput{}
	var res []model.StepResult
	e := New(in, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{webNode(model.StepWebClick, nil)}}), Options{OnNode: func(r model.StepResult) { res = append(res, r) }})
	_ = e.Run(context.Background())
	if res[0].Error == nil || res[0].Error.Code != model.ErrBrowser {
		t.Errorf("không có trình duyệt: %+v", res[0].Error)
	}
}

// Biến trong selector được thay trước khi tìm; thay ra trống → invalid_input.
func TestWebSelectorVars(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{W: 10, H: 10})}}
	set := modeltest.Node("s1", "n1", model.StepSetVar, func(s *model.Step) { s.VarName, s.Value = "nut", "Gửi" })
	click := modeltest.Node("s2", "n2", model.StepWebClick, func(s *model.Step) {
		s.Selectors, s.TimeoutMs, s.IntervalMs = []string{"text={{vars.nut}}"}, 50, 1
	})
	if _, _, err := runWeb(t, b, set, click); err != nil {
		t.Fatal(err)
	}
	if got := b.queries[0].Selectors[0].Value; got != "Gửi" {
		t.Errorf("selector sau khi thay biến: %q", got)
	}
}

func TestOpenInWebBrowser(t *testing.T) {
	b := &fakeBrowser{}
	in, _, err := runWeb(t, b, modeltest.Step(model.StepOpen, func(s *model.Step) { s.Target, s.WebBrowser, s.App = "shop.vn/don", true, "Safari" }))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(b.opened, []string{"https://shop.vn/don"}) || len(in.Lines()) != 0 {
		t.Errorf("mở %q", b.opened)
	}
}

func (b *fakeBrowser) Keys(_ context.Context, tab string, keys, mods []string, sequence bool) (string, error) {
	b.bg = append(b.bg, fmt.Sprintf("keys %s %v %v %v", tab, mods, keys, sequence))
	return "https://shop.vn/", b.err
}
