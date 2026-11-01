package engine

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	"ghosthand/internal/device"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

func elemBox(x, y, w, h int) model.Rect { return model.Rect{X: x, Y: y, W: w, H: h} }

// page – cây giả: cửa sổ + nút “Mua ngay” tại khung b.
func page(b model.Rect) []element.Node {
	return []element.Node{
		{Role: "window", Raw: "AXWindow", Title: "Shop", Box: elemBox(0, 0, 1000, 800)},
		{Role: "button", Raw: "AXButton", Title: "Mua ngay", Box: b, Depth: 1},
	}
}

func elementStep(t string, mod func(*model.Step)) model.Step {
	return modeltest.Step(t, func(s *model.Step) {
		s.FindBy, s.Selectors, s.ElementApp, s.TimeoutMs, s.IntervalMs = model.FindByElement, []string{`role=button[name="mua"]`}, "Chrome", 2000, 1
		if mod != nil {
			mod(s)
		}
	})
}

func elementRun(t *testing.T, elems *devicetest.FakeElements, steps ...model.Step) (*devicetest.FakeInput, *Engine, error) {
	t.Helper()
	in := &devicetest.FakeInput{}
	e := newEngine(in, scripttest.Linear(model.Script{Loops: 1, Steps: steps}), nil)
	e.elems = elems
	return in, e, e.Run(context.Background())
}

func TestWaitElementThenClick(t *testing.T) {
	elems := &devicetest.FakeElements{Frames: [][]element.Node{page(elemBox(0, 0, 0, 0))[:1], page(elemBox(100, 200, 80, 30))}}
	in, e, err := elementRun(t, elems, elementStep(model.StepWaitImage, nil), modeltest.Step(model.StepClickImage, nil))
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"move 140,215", "click left false"}; !reflect.DeepEqual(in.Lines(), want) {
		t.Errorf("có %q, muốn %q", in.Lines(), want)
	}
	out := e.results[e.sc.Steps[0].ID].Output
	if out["role"] != "button" || out["text"] != "Mua ngay" || out["w"] != 80 {
		t.Errorf("output %v", out)
	}
	if elems.Apps[0] != "Chrome" {
		t.Errorf("hỏi app %q", elems.Apps[0])
	}
}

// Click tự tìm: khung còn di chuyển thì chờ tới khi hai lần đọc liền nhau trùng nhau.
func TestClickElementWaitsUntilSettled(t *testing.T) {
	elems := &devicetest.FakeElements{Frames: [][]element.Node{
		page(elemBox(100, 300, 80, 30)), page(elemBox(100, 250, 80, 30)), page(elemBox(100, 200, 80, 30)), page(elemBox(100, 200, 80, 30)),
	}}
	click := elementStep(model.StepClickImage, func(s *model.Step) { s.ImageSource = model.ImageFromSearch })
	in, _, err := elementRun(t, elems, click)
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"move 140,215", "click left false"}; !reflect.DeepEqual(in.Lines(), want) {
		t.Errorf("có %q, muốn %q", in.Lines(), want)
	}
}

// Phần tử ngoài khung nhìn (khung kẹp ở mép, cao 1) → cuộn tới một lần rồi đo lại.
func TestWaitElementScrollsIntoView(t *testing.T) {
	elems := &devicetest.FakeElements{Frames: [][]element.Node{page(elemBox(100, 799, 80, 1)), page(elemBox(100, 400, 80, 30))}}
	if _, _, err := elementRun(t, elems, elementStep(model.StepWaitImage, nil)); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(elems.Scrolled, []int{1}) {
		t.Errorf("cuộn %v, muốn [1]", elems.Scrolled)
	}
}

func TestWaitElementErrors(t *testing.T) {
	cases := []struct {
		name string
		el   *devicetest.FakeElements
		step model.Step
		code string
		msg  string
	}{
		{"không có cửa sổ → chờ tới hết giờ", &devicetest.FakeElements{Err: device.ErrNoWindow}, elementStep(model.StepWaitImage, func(s *model.Step) { s.TimeoutMs = 5 }),
			model.ErrNotFound, "không có cửa sổ đang hiện"},
		{"chỗ thứ 2 không có", &devicetest.FakeElements{Frames: [][]element.Node{page(elemBox(1, 1, 50, 20))}}, elementStep(model.StepWaitImage, func(s *model.Step) { s.TimeoutMs, s.Occurrence = 5, 2 }),
			model.ErrNotFound, "chỉ thấy 1 chỗ (cần chỗ thứ 2)"},
		{"thiếu quyền → lỗi ngay", &devicetest.FakeElements{Err: device.ErrNoAccessibility}, elementStep(model.StepWaitImage, nil),
			model.ErrPermission, "Accessibility"},
		{"selector từ biến là css", &devicetest.FakeElements{}, elementStep(model.StepWaitImage, func(s *model.Step) { s.Selectors = []string{"css=.buy"} }),
			model.ErrInvalidInput, "chỉ tìm theo text="},
	}
	for _, c := range cases {
		e := newEngine(&devicetest.FakeInput{}, model.Script{}, nil)
		e.elems = c.el
		_, err := e.findImage(context.Background(), c.step)
		if err == nil || errCode(err) != c.code || !strings.Contains(err.Error(), c.msg) {
			t.Errorf("%s: %v (mã %s), muốn mã %s chứa %q", c.name, err, errCode(err), c.code, c.msg)
		}
	}
}

func TestElementCond(t *testing.T) {
	elems := &devicetest.FakeElements{Frames: [][]element.Node{page(elemBox(100, 799, 80, 1))}}
	e := newEngine(&devicetest.FakeInput{}, model.Script{}, nil)
	e.elems = elems
	c := model.Cond{Kind: model.CondAll, Conds: []model.Cond{
		{Kind: model.CondElement, Selectors: []string{"Mua ngay"}, ElementApp: "Chrome"},
		{Kind: model.CondElement, Selectors: []string{"aria=Đóng"}, ElementApp: "Chrome", Not: true},
	}}
	var parts []CondPart
	ok, known, err := e.evalCond(c, "k", nil, newSnapshot(nil, nil), &parts)
	if err != nil || !ok || !known {
		t.Fatalf("ok=%v known=%v err=%v", ok, known, err)
	}
	if len(elems.Apps) != 1 {
		t.Errorf("đọc cây %d lần trong một lần xét, muốn 1", len(elems.Apps))
	}
	if !strings.Contains(parts[0].Detail, "ngoài khung nhìn") || len(elems.Scrolled) != 0 {
		t.Errorf("chi tiết %q, cuộn %v (điều kiện không được cuộn)", parts[0].Detail, elems.Scrolled)
	}
}

func TestFindElementOnce(t *testing.T) {
	e := newEngine(&devicetest.FakeInput{}, model.Script{}, nil)
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{page(elemBox(100, 200, 80, 30))}}
	res, err := e.FindOnce(elementStep(model.StepWaitImage, func(s *model.Step) { s.Selectors = []string{"Thanh toán"} }))
	if err != nil || res.Found || !reflect.DeepEqual(res.Read, []string{"button “Mua ngay”"}) {
		t.Errorf("không thấy: %+v %v", res, err)
	}
	res, err = e.FindOnce(elementStep(model.StepWaitImage, nil))
	if err != nil || !res.Found || res.X != 100 || res.W != 80 {
		t.Errorf("thấy: %+v %v", res, err)
	}
}

// Nhãn đổi theo số tin chưa đọc: aria="Messenger" (đúng cả chuỗi) không thấy "Messenger, 1 unread" → fix bỏ nháy kép,
// cả ở Thử tìm, lỗi lúc chạy và Tìm tất cả.
func TestElementMissFix(t *testing.T) {
	nodes := []element.Node{
		{Role: "window", Title: "Facebook", Box: elemBox(0, 0, 1000, 800)},
		{Role: "combobox", Desc: "Messenger, 1 unread", Box: elemBox(900, 10, 40, 40), Depth: 1},
	}
	step := func(t string) model.Step {
		return elementStep(t, func(s *model.Step) { s.Selectors, s.TimeoutMs = []string{`aria="Messenger"`}, 5 })
	}
	e := newEngine(&devicetest.FakeInput{}, model.Script{}, nil)
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{nodes}}
	for _, typ := range []string{model.StepWaitImage, model.StepFindAll} {
		if res, err := e.FindOnce(step(typ)); err != nil || res.Found || res.Fix != "aria=Messenger" {
			t.Errorf("%s Thử tìm: %+v %v", typ, res, err)
		}
	}
	var se *notFoundErr
	if _, err := e.findImage(context.Background(), step(model.StepWaitImage)); !errors.As(err, &se) || se.detail["fix"] != "aria=Messenger" ||
		!strings.HasSuffix(err.Error(), "thử aria=Messenger") {
		t.Errorf("chờ: %v", err)
	}
	if _, err := e.findAll(context.Background(), step(model.StepFindAll)); !errors.As(err, &se) || se.detail["fix"] != "aria=Messenger" {
		t.Errorf("tìm tất cả: %v", err)
	}
}

// Đọc phần tử: không cuộn, không di chuột; ô nhập đọc ra giá trị, kể cả phần tử ngoài khung nhìn.
func TestElementRead(t *testing.T) {
	nodes := append(page(elemBox(100, 200, 80, 30)),
		element.Node{Role: "textbox", Raw: "AXTextField", Title: "Giá", Value: "1.242.000₫", Box: elemBox(100, 799, 200, 1), Depth: 1},
		element.Node{Role: "textbox", Raw: "AXTextField", Title: "Ghi chú", Box: elemBox(100, 300, 200, 30), Depth: 1})
	elems := &devicetest.FakeElements{Frames: [][]element.Node{nodes[:1], nodes}}
	read := modeltest.Step(model.StepElementRead, func(s *model.Step) { s.Selectors, s.IntervalMs = []string{"role=textbox"}, 1 })
	in, e, err := elementRun(t, elems, read)
	if err != nil {
		t.Fatal(err)
	}
	out := e.results[e.sc.Steps[0].ID].Output
	if out["text"] != "1.242.000₫" || out["count"] != 2 || out["role"] != "textbox" || out["score"] != nil {
		t.Errorf("output %v", out)
	}
	if len(in.Lines()) != 0 || len(elems.Scrolled) != 0 {
		t.Errorf("không được di chuột / cuộn: %v, %v", in.Lines(), elems.Scrolled)
	}
	// ô trống: text vẫn có (rỗng)
	elems = &devicetest.FakeElements{Frames: [][]element.Node{nodes}}
	read.Occurrence = 2
	_, e, err = elementRun(t, elems, read)
	if out := e.results[e.sc.Steps[0].ID].Output; err != nil || out["text"] != "" {
		t.Errorf("ô trống: %v %v", out, err)
	}
}
