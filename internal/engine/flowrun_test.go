package engine

import (
	"context"
	"image"
	"reflect"
	"strings"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script"
	"ghosthand/internal/vision"
)

var (
	noText  = []vision.TextLine{line("Đang tải", 0, 0, 80, 20)}
	sendBtn = []vision.TextLine{line("Gửi", 100, 100, 40, 20)}
)

// ocrAfter – bộ đọc chữ giả: thấy nút "Gửi" khi ready() đúng (vd sau N lần cuộn), không thì chỉ thấy "Đang tải".
type ocrAfter func() bool

func (f ocrAfter) ReadText(image.Image) ([]vision.TextLine, error) {
	if f() {
		return sendBtn, nil
	}
	return noText, nil
}

// Flow: chờ chữ "Gửi" (w) → click chỗ thấy (c) → gõ (t); không thấy → cuộn (s) → chờ lại.
// Nút hiện sau `scrolls` lần cuộn (-1 = không bao giờ); ready (nếu có) thay điều kiện đó.
func sendFlow(scrolls int, ready func() bool) (*Engine, *devicetest.FakeInput) {
	sc := model.Script{Loops: 1, Region: &model.Rect{X: 100, Y: 50, W: 400, H: 300}, Start: "w",
		Steps: []model.Step{
			modeltest.Node("w", "n1", model.StepWaitImage, func(s *model.Step) { s.FindBy, s.FindText, s.TimeoutMs, s.IntervalMs = model.FindByText, "Gửi", 1, 1 }),
			modeltest.Node("c", "n2", model.StepClickImage, func(s *model.Step) { s.ImageFrom = "w" }),
			modeltest.Node("t", "n3", model.StepText, func(s *model.Step) { s.Text = "ở {{n1.output.x}},{{n1.output.y}}" }),
			modeltest.Node("s", "n4", model.StepScroll, func(s *model.Step) { s.Amount = 1 }),
		},
		Edges: []model.Edge{modeltest.Edge("w", model.PortSuccess, "c"), modeltest.Edge("w", model.PortFail, "s"), modeltest.Edge("s", model.PortSuccess, "w"), modeltest.Edge("c", model.PortSuccess, "t")},
	}
	in := &devicetest.FakeInput{}
	if ready == nil {
		ready = func() bool {
			n := 0
			for _, l := range in.Lines() {
				if strings.HasPrefix(l, "scroll") {
					n++
				}
			}
			return scrolls >= 0 && n >= scrolls
		}
	}
	e := newEngine(in, sc, nil)
	e.scr, e.ocr = &fakeScreen{frames: []image.Image{image.NewRGBA(image.Rect(0, 0, 400, 300))}}, ocrAfter(ready)
	return e, in
}

func TestFlowFailPortLoopsBack(t *testing.T) {
	e, in := sendFlow(2, nil)
	var got []string
	e.onNode = func(r model.StepResult) { got = append(got, r.Ref+":"+r.Status+">"+r.Port) }
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	// chữ "Gửi" ở px (100, 100) 40×20 → tâm 100 + 120, 50 + 110
	want := []string{"scroll down", "scroll down", "move 220,160", "click left false", "type ở", "type  ", "type 2", "type 2", "type 0", "type ,", "type 1", "type 6", "type 0"}
	if !reflect.DeepEqual(in.Lines(), want) {
		t.Errorf("lệnh %q\nmuốn %q", in.Lines(), want)
	}
	if w := []string{"n1:fail>fail", "n4:success>success", "n1:fail>fail", "n4:success>success", "n1:success>success", "n2:success>success", "n3:success>success"}; !reflect.DeepEqual(got, w) {
		t.Errorf("kết quả %q", got)
	}
	if r := e.results["w"]; r.Output["x"] != 220 || r.Output["text"] != "Gửi" {
		t.Errorf("output chờ chữ: %+v", r.Output)
	}
}

func TestFlowFailUnconnectedStops(t *testing.T) {
	e, in := sendFlow(-1, nil)
	e.sc.Edges = e.sc.Edges[:1] // bỏ cạnh fail
	err := e.Run(context.Background())
	if err == nil || !strings.Contains(err.Error(), "n1: không thấy chữ") || e.failed != "w" || len(in.Lines()) != 0 {
		t.Fatalf("lỗi %v, failed %q, lệnh %q", err, e.failed, in.Lines())
	}
	if r := e.results["w"]; r.Error == nil || r.Error.Code != model.ErrNotFound {
		t.Errorf("mã lỗi: %+v", r.Error)
	}
}

// Chạy riêng một node (20 F7 – RunNode cho AI): node chạy đúng một lần, không đi tiếp cạnh ra; thất bại thì báo lỗi.
func TestRunOnlyNode(t *testing.T) {
	e, in := sendFlow(0, nil)
	e.sc = script.RunFrom(e.sc, "s", true)
	var got []string
	e.onNode = func(r model.StepResult) { got = append(got, r.Ref+">"+r.Port) }
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got, []string{"n4>success"}) || !reflect.DeepEqual(in.Lines(), []string{"scroll down"}) {
		t.Errorf("node %q, lệnh %q", got, in.Lines())
	}

	e, _ = sendFlow(-1, nil)
	e.sc = script.RunFrom(e.sc, "w", true) // cạnh fail → cuộn bị bỏ: không thấy là lỗi
	if err := e.Run(context.Background()); err == nil || e.failed != "w" {
		t.Fatalf("lỗi %v, failed %q", err, e.failed)
	}
}

func TestFlowRetry(t *testing.T) {
	tries := 0 // thấy ở lần thử thứ 3 (mỗi lần thử: chờ đọc nhiều lần tới hết giờ)
	e, _ := sendFlow(0, func() bool { return tries >= 3 })
	e.onProgress = func(p Progress) {
		if p.NodeID == "w" {
			tries = p.Retry + 1
		}
	}
	e.sc.Edges = e.sc.Edges[:1]
	e.sc.Steps[0].Retry = &model.Retry{Count: 2}
	e.sc.Steps[1].Enabled = false // click tắt → bỏ qua, đi tiếp
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	r := e.results["w"]
	if r.Attempts != 3 || r.Status != model.StatusSuccess || len(r.Logs) != 2 || !strings.Contains(r.Logs[0].Msg, "lần 1 / 3") {
		t.Errorf("thử lại: %+v", r)
	}
	if e.results["c"].Status != model.StatusSkipped {
		t.Errorf("node tắt: %+v", e.results["c"])
	}
}

func TestFlowVarFromNodeNotRun(t *testing.T) {
	sc := model.Script{Loops: 1, Start: "a", Steps: []model.Step{
		modeltest.Node("a", "n1", model.StepText, func(s *model.Step) { s.Text = "{{n2.output.text}}" }),
		modeltest.Node("b", "n2", model.StepText, func(s *model.Step) { s.Text = "x" }),
	}, Edges: []model.Edge{modeltest.Edge("a", model.PortSuccess, "b")}}
	e := newEngine(&devicetest.FakeInput{}, sc, nil)
	err := e.Run(context.Background())
	if err == nil || !strings.Contains(err.Error(), "n2 chưa chạy") || e.results["a"].Error.Code != model.ErrInvalidInput {
		t.Fatalf("lỗi %v", err)
	}
}

func TestFlowClickFromFailedNode(t *testing.T) {
	// chờ chữ thất bại → đi cổng fail sang click lấy chỗ thấy của chính node đó → không có chỗ thấy → dừng
	e, in := sendFlow(-1, nil)
	e.sc.Edges = []model.Edge{modeltest.Edge("w", model.PortFail, "c")}
	err := e.Run(context.Background())
	if err == nil || !strings.Contains(err.Error(), "n2: node n1 chưa tìm thấy") || len(in.Lines()) != 0 {
		t.Fatalf("lỗi %v, lệnh %q", err, in.Lines())
	}
}

func TestFlowInfiniteLoopLimit(t *testing.T) {
	sc := model.Script{Loops: 1, Start: "a", Steps: []model.Step{
		modeltest.Node("a", "n1", model.StepWait, nil), modeltest.Node("b", "n2", model.StepWait, nil),
	}, Edges: []model.Edge{modeltest.Edge("a", model.PortSuccess, "b"), modeltest.Edge("b", model.PortSuccess, "a")}}
	sc.Steps[0].DelayAfter, sc.Steps[1].DelayAfter = 0, 0
	err := newEngine(&devicetest.FakeInput{}, sc, nil).Run(context.Background())
	if err == nil || !strings.Contains(err.Error(), "lặp vô hạn") || !strings.Contains(err.Error(), "n1 → n2") {
		t.Fatalf("lỗi %v", err)
	}
}

func TestFlowPinnedNodeNotRun(t *testing.T) {
	sc := model.Script{Loops: 1, Start: "a", Steps: []model.Step{
		modeltest.Node("a", "n1", model.StepText, func(s *model.Step) { s.Text = "gõ" }),
		modeltest.Node("b", "n2", model.StepText, func(s *model.Step) { s.Text = "{{n1.output.ten}}" }),
	}, Edges: []model.Edge{modeltest.Edge("a", model.PortSuccess, "b")}}
	in := &devicetest.FakeInput{}
	e := newEngine(in, sc, nil)
	e.pins = map[string]model.StepResult{"a": {NodeID: "a", Status: model.StatusSuccess, Port: model.PortSuccess, Output: map[string]any{"ten": "Lan"}}}
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if r := e.results["a"]; r.Status != model.StatusSuccess || r.Output["ten"] != "Lan" || !strings.Contains(r.Logs[0].Msg, "ghim") {
		t.Errorf("node ghim: %+v", r)
	}
	if got := strings.ReplaceAll(strings.Join(in.Lines(), "|"), "type ", ""); got != "L|a|n" {
		t.Errorf("lệnh %q – node a không được chạy, node b gõ biến đã ghim", got)
	}
}
