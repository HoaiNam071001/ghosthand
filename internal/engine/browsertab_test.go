package engine

import (
	"context"
	"reflect"
	"slices"
	"testing"
	"time"

	"ghosthand/internal/browser"
	"ghosthand/internal/browser/browsertest"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

func tabStep(op string, f func(s *model.Step)) model.Step {
	return modeltest.Step(model.StepBrowserTab, func(s *model.Step) {
		s.TabOp, s.TimeoutMs = op, 600
		if f != nil {
			f(s)
		}
	})
}

// tabEngine – Chrome ở trước: cửa sổ 1 (Gmail, Sân thử đang hiện, Bảng giá), cửa sổ 2 (YouTube); Edge (Tin tức).
func tabEngine() (*Engine, *browsertest.Fake) {
	f := &browsertest.Fake{List: []model.TabInfo{
		{Browser: "chrome", ID: 1, Window: 1, Index: 1, Title: "Hộp thư – Gmail", URL: "https://mail.google.com/"},
		{Browser: "chrome", ID: 2, Window: 1, Index: 2, Title: "Sân thử", URL: "http://127.0.0.1:8000/index.html", Active: true},
		{Browser: "chrome", ID: 3, Window: 1, Index: 3, Title: "Bảng giá", URL: "http://127.0.0.1:8000/price-list.html"},
		{Browser: "chrome", ID: 4, Window: 2, Index: 1, Title: "YouTube", URL: "https://www.youtube.com/", Active: true},
		{Browser: "edge", ID: 9, Window: 7, Index: 1, Title: "Tin tức", URL: "https://vnexpress.net/", Active: true},
	}}
	e := New(&devicetest.FakeInput{}, model.Script{}, Options{})
	e.tabs = f
	e.wins = &devicetest.FakeWindows{Work: model.Rect{W: 1920, H: 1080}} // khung đặt theo vùng làm việc – không phụ thuộc màn máy test
	return e, f
}

func TestBrowserTabRead(t *testing.T) {
	e, _ := tabEngine()
	cases := []struct {
		name string
		mod  func(s *model.Step)
		id   any
	}{
		{"tab đang hiện của cửa sổ trên cùng", nil, int64(2)},
		{"chứa, không dấu", func(s *model.Step) { s.Tab = "bang gia" }, int64(3)},
		{"theo URL", func(s *model.Step) { s.Tab = "youtube.com" }, int64(4)},
		{"regex", func(s *model.Step) { s.Tab, s.TabMatch = `^Hộp thư`, model.MatchRegex }, int64(1)},
		{"chỉ Edge", func(s *model.Step) { s.Browser = model.BrowserEdge }, int64(9)},
	}
	for _, c := range cases {
		res, _ := e.execNode(t.Context(), tabStep(model.TabRead, c.mod), 1)
		if res.Status != model.StatusSuccess || res.Output["tabId"] != c.id {
			t.Errorf("%s: %s %v, muốn tab %v", c.name, res.Status, res.Output, c.id)
		}
	}
	res, _ := e.execNode(t.Context(), tabStep(model.TabRead, nil), 1)
	if o := res.Output; o["url"] != "http://127.0.0.1:8000/index.html" || o["title"] != "Sân thử" || o["browser"] != "chrome" || o["index"] != 2 {
		t.Errorf("output: %v", o)
	}
}

func TestBrowserTabList(t *testing.T) {
	e, _ := tabEngine()
	res, _ := e.execNode(t.Context(), tabStep(model.TabList, func(s *model.Step) { s.Tab = "127.0.0.1" }), 1)
	items, _ := res.Output["items"].([]any)
	if res.Output["count"] != 2 || len(items) != 2 || items[0].(map[string]any)["title"] != "Sân thử" || items[0].(map[string]any)["active"] != true {
		t.Errorf("list: %v", res.Output)
	}
	if res, _ := e.execNode(t.Context(), tabStep(model.TabList, nil), 1); res.Output["count"] != 5 {
		t.Errorf("list trống = mọi tab: %v", res.Output["count"])
	}
}

func TestBrowserTabActions(t *testing.T) {
	cases := []struct {
		op    string
		calls []string
		left  int // số tab còn lại
	}{
		{model.TabSwitch, []string{"activate 3"}, 5},
		{model.TabClose, []string{"close 3"}, 4},
		{model.TabCloseOthers, []string{"close 1", "close 2"}, 3},
		{model.TabReload, []string{"reload 3"}, 5},
		{model.TabBack, []string{"back 3"}, 5},
	}
	for _, c := range cases {
		e, f := tabEngine()
		res, _ := e.execNode(t.Context(), tabStep(c.op, func(s *model.Step) { s.Tab = "Bảng giá" }), 1)
		if res.Status != model.StatusSuccess || !reflect.DeepEqual(f.Calls, c.calls) || len(f.List) != c.left {
			t.Errorf("%s: %s, gọi %q, còn %d tab", c.op, res.Status, f.Calls, len(f.List))
		}
		if c.op == model.TabCloseOthers && res.Output["closed"] != 2 {
			t.Errorf("closeOthers: closed %v", res.Output["closed"])
		}
	}
}

func TestBrowserTabNew(t *testing.T) {
	e, f := tabEngine()
	res, _ := e.execNode(t.Context(), tabStep(model.TabNew, func(s *model.Step) { s.URL = "example.com/a" }), 1)
	if res.Status != model.StatusSuccess || !slices.Equal(f.Calls, []string{"new https://example.com/a"}) || res.Output["window"] != int64(1) {
		t.Errorf("new: %s %v, gọi %q", res.Status, res.Output, f.Calls)
	}
	e, f = tabEngine()
	f.List = nil
	res, _ = e.execNode(t.Context(), tabStep(model.TabNew, nil), 1)
	if res.Status != model.StatusFail || res.Error.Code != model.ErrBrowser {
		t.Errorf("chưa mở trình duyệt: %s %+v", res.Status, res.Error)
	}
}

func TestBrowserTabNotFoundAndErrors(t *testing.T) {
	e, _ := tabEngine()
	res, _ := e.execNode(t.Context(), tabStep(model.TabClose, func(s *model.Step) { s.Tab = "facebook" }), 1)
	if res.Status != model.StatusFail || res.Error.Code != model.ErrNotFound || res.Error.Detail["tabCount"] != 5 {
		t.Errorf("không thấy tab: %+v", res.Error)
	}
	res, _ = e.execNode(t.Context(), tabStep(model.TabWaitOpen, func(s *model.Step) { s.Tab = "facebook" }), 1)
	if res.Error == nil || res.Error.Code != model.ErrTimeout {
		t.Errorf("chờ mở hết giờ: %+v", res.Error)
	}
	e, f := tabEngine()
	f.Err = browser.ErrNoAutomation
	res, _ = e.execNode(t.Context(), tabStep(model.TabRead, nil), 1)
	if res.Error == nil || res.Error.Code != model.ErrPermission {
		t.Errorf("chưa cho quyền Automation: %+v", res.Error)
	}
}

func TestBrowserTabWait(t *testing.T) {
	e, f := tabEngine()
	n := 0
	f.OnList = func(f *browsertest.Fake) {
		if n++; n == 3 {
			f.List = append(f.List, model.TabInfo{Browser: "chrome", ID: 20, Window: 1, Index: 4, Title: "Facebook", URL: "https://facebook.com/"})
		}
	}
	res, _ := e.execNode(t.Context(), tabStep(model.TabWaitOpen, func(s *model.Step) { s.Tab, s.TimeoutMs = "facebook", 3000 }), 1)
	if res.Status != model.StatusSuccess || res.Output["tabId"] != int64(20) {
		t.Errorf("chờ mở: %s %v", res.Status, res.Output)
	}
	go func() {
		time.Sleep(300 * time.Millisecond)
		f.Close(context.Background(), model.TabInfo{ID: 20})
	}()
	res, _ = e.execNode(t.Context(), tabStep(model.TabWaitClose, func(s *model.Step) { s.Tab, s.TimeoutMs = "facebook", 3000 }), 1)
	if res.Status != model.StatusSuccess {
		t.Errorf("chờ đóng: %s %+v", res.Status, res.Error)
	}
}

// Node Mở ghi tab vừa mở; node Tab đóng đúng tab đó dù tab khác đang hiện / trùng URL.
func TestBrowserTabFromOpen(t *testing.T) {
	sc := scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{
		modeltest.Node("o", "n1", model.StepOpen, func(s *model.Step) { s.Target = "http://127.0.0.1:8000/index.html" }),
		modeltest.Node("sw", "n2", model.StepBrowserTab, func(s *model.Step) { s.TabOp, s.Tab = model.TabSwitch, "YouTube" }),
		modeltest.Node("c", "n3", model.StepBrowserTab, func(s *model.Step) { s.TabOp, s.TabFrom = model.TabClose, "o" }),
	}})
	e, f := tabEngine()
	e.sc = sc
	e.open = func(target, _ string) error {
		_, err := f.NewTab(context.Background(), "", target) // tab mới id 1001 trong cửa sổ 1, cùng URL tab 2
		return err
	}
	if err := e.Run(t.Context()); err != nil {
		t.Fatal(err)
	}
	if o := e.results["o"].Output; o["tabId"] != int64(1001) || o["tabUrl"] != "http://127.0.0.1:8000/index.html" {
		t.Errorf("output node Mở: %v", o)
	}
	if want := []string{"new http://127.0.0.1:8000/index.html", "activate 4", "close 1001"}; !reflect.DeepEqual(f.Calls, want) {
		t.Errorf("gọi %q, muốn %q", f.Calls, want)
	}
	// node Mở chưa chạy → invalid_input, không đóng tab nào
	e, f = tabEngine()
	e.sc = sc
	e.byID = map[string]model.Step{"o": sc.Steps[0]}
	res, _ := e.execNode(t.Context(), sc.Steps[2], 1)
	if res.Error == nil || res.Error.Code != model.ErrInvalidInput || len(f.Calls) != 0 {
		t.Errorf("node Mở chưa chạy: %+v, gọi %q", res.Error, f.Calls)
	}
}
