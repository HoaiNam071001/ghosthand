package engine

import (
	"context"
	"image"
	"maps"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/vision"
)

func TestShootOnFail(t *testing.T) {
	e, _ := sendFlow(-1, nil)
	e.sc.Edges = e.sc.Edges[:1] // không thấy → dừng
	e.shots = map[string]image.Image{}
	var got []model.StepResult
	e.onNode = func(r model.StepResult) { got = append(got, r) }
	if err := e.Run(context.Background()); err == nil {
		t.Fatal("phải lỗi")
	}
	if len(got) != 1 || got[0].Shot != "1.png" || e.shots["1.png"] == nil || got[0].Loop != 1 {
		t.Errorf("kết quả %+v, ảnh %v", got, e.shots)
	}
	if img := vision.Shrink(image.NewRGBA(image.Rect(0, 0, 3200, 2000)), shotMaxW); img.Bounds().Dx() != 1600 || img.Bounds().Dy() != 1000 {
		t.Errorf("thu nhỏ: %v", img.Bounds())
	}
}

// shots: each – chụp sau mỗi node thành công, sau DelayAfter (không chờ hai lần); chỉ giữ maxEach ảnh mới nhất.
func TestShootEach(t *testing.T) {
	e, _ := sendFlow(0, nil)
	e.shots, e.eachShot, e.elems = map[string]image.Image{}, true, &devicetest.FakeElements{}
	e.sc.Steps[2].DelayAfter = 300
	var got []string
	e.onNode = func(r model.StepResult) { got = append(got, r.Shot) }
	start := time.Now()
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if d := time.Since(start); d < 280*time.Millisecond || d > 550*time.Millisecond {
		t.Errorf("chạy %v – DelayAfter 300 ms phải chờ đúng một lần", d)
	}
	want := []string{"each-1-n1.png", "each-2-n2.png", "each-3-n3.png"}
	if !slices.Equal(got, want) || len(e.shots) != 3 {
		t.Fatalf("ảnh %v (%d ảnh), muốn %v", got, len(e.shots), want)
	}

	for range maxEach + 3 { // node chạy lại nhiều lần; quá maxEach thì bỏ ảnh cũ nhất, tên không dùng lại
		r := model.StepResult{Status: model.StatusSuccess, Ref: "n9", Loop: 1}
		e.shootAfter(context.Background(), &r, 0)
	}
	if len(e.shots) != maxEach || e.shots["each-1-n1.png"] != nil || e.shots["each-18-n9.png"] == nil || e.shots["each-7-n9.png"] == nil {
		t.Errorf("còn %d ảnh: %v", len(e.shots), slices.Collect(maps.Keys(e.shots)))
	}
}

// 43 A3: chụp sau mỗi node → node có kèm phần tử mới / mất so với sau node trước (node đầu chỉ lấy mốc, không đổi thì không có).
func TestEachShotChanges(t *testing.T) {
	e, _ := sendFlow(0, nil)
	base := page(elemBox(0, 0, 80, 30))
	withDialog := append(slices.Clone(base), element.Node{Role: "dialog", Title: "Đã lưu", Box: elemBox(200, 200, 300, 100), Depth: 1})
	e.shots, e.eachShot = map[string]image.Image{}, true
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{base, base, withDialog}}
	var got []map[string]any
	e.onNode = func(r model.StepResult) { got = append(got, r.Changes) }
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[0] != nil || got[1] != nil || got[2] == nil {
		t.Fatalf("changes = %v", got)
	}
	if added, _ := got[2]["added"].([]any); len(added) != 1 {
		t.Errorf("added = %v", got[2])
	}
}

// Debug: breakpoint chỉ dừng khi debug bật; chạy từng node dừng trước mọi node; Tiếp tắt chạy từng node.
func TestDebugBreakpointAndStep(t *testing.T) {
	sc := model.Script{Loops: 1, Start: "a", Steps: []model.Step{
		modeltest.Node("a", "n1", model.StepText, func(s *model.Step) { s.Text = "a" }),
		modeltest.Node("b", "n2", model.StepText, func(s *model.Step) { s.Text = "b"; s.Breakpoint = true }),
		modeltest.Node("c", "n3", model.StepText, func(s *model.Step) { s.Text = "c" }),
	}, Edges: []model.Edge{modeltest.Edge("a", model.PortSuccess, "b"), modeltest.Edge("b", model.PortSuccess, "c")}}

	// không debug: chạy thẳng
	if err := newEngine(&devicetest.FakeInput{}, sc, nil).Run(context.Background()); err != nil {
		t.Fatal(err)
	}

	var mu sync.Mutex
	var breaks []string
	in := &devicetest.FakeInput{}
	e := newEngine(in, sc, func(p Progress) {
		if p.Break != "" {
			mu.Lock()
			breaks = append(breaks, p.Ref+":"+p.Break)
			mu.Unlock()
		}
	})
	e.debug = true
	done := make(chan error)
	go func() { done <- e.Run(context.Background()) }()
	waitFor := func(n int) {
		t.Helper()
		for i := 0; i < 100; i++ {
			mu.Lock()
			k := len(breaks)
			mu.Unlock()
			if k >= n && e.gate.paused() {
				return
			}
			time.Sleep(5 * time.Millisecond)
		}
		t.Fatalf("không dừng lần %d (%v)", n, breaks)
	}
	waitFor(1) // dừng trước n2 – n1 đã chạy
	if l := in.Lines(); len(l) != 1 || l[0] != "type a" {
		t.Errorf("trước breakpoint: %q", l)
	}
	e.Step() // chạy n2 rồi dừng trước n3
	waitFor(2)
	if l := in.Lines(); len(l) != 2 {
		t.Errorf("sau F10: %q", l)
	}
	e.Resume()
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if w := "n2:breakpoint n3:step"; strings.Join(breaks, " ") != w {
		t.Errorf("dừng ở %v, muốn %s", breaks, w)
	}
}
