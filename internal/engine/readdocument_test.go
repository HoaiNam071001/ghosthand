package engine

import (
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

func readDocRun(t *testing.T, nodes []element.Node, patch func(*model.Step)) (map[string]any, error) {
	t.Helper()
	s := modeltest.Step(model.StepReadDocument, func(s *model.Step) {
		s.TimeoutMs, s.IntervalMs = 20, 1
		patch(s)
	})
	e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{nodes}}
	err := e.Run(t.Context())
	return e.results[e.sc.Steps[0].ID].Output, err
}

func docNodes() []element.Node {
	b := elemBox(0, 0, 400, 300)
	return []element.Node{
		{Role: "window", Title: "Ghi chú", Box: b},
		{Role: "searchbox", Value: "tìm", Box: elemBox(0, 0, 100, 20), Depth: 1},
		{Role: "textbox", Desc: "nội dung", Value: "dòng một\r\ndòng hai\ndòng ba", Selected: "dòng hai", Box: b, Depth: 1},
	}
}

func TestReadDocumentAuto(t *testing.T) {
	out, err := readDocRun(t, docNodes(), func(*model.Step) {})
	if err != nil {
		t.Fatal(err)
	}
	if out["text"] != "dòng một\ndòng hai\ndòng ba" || out["lines"] != 3 || out["length"] != 25 {
		t.Errorf("output %v", out)
	}
}

func TestReadDocumentSelectionAndSelector(t *testing.T) {
	out, err := readDocRun(t, docNodes(), func(s *model.Step) { s.SelectionOnly = true })
	if err != nil || out["text"] != "dòng hai" {
		t.Fatalf("%v %v", out, err)
	}
	out, err = readDocRun(t, docNodes(), func(s *model.Step) { s.Selectors = []string{`role=textbox[name="nội dung"]`} })
	if err != nil || out["lines"] != 3 {
		t.Fatalf("%v %v", out, err)
	}
}

func TestReadDocumentNotFound(t *testing.T) {
	nodes := docNodes()[:1]
	if _, err := readDocRun(t, nodes, func(*model.Step) {}); err == nil {
		t.Error("không có ô soạn thảo phải fail")
	}
	n := docNodes()
	n[2].Selected = ""
	if _, err := readDocRun(t, n, func(s *model.Step) { s.SelectionOnly = true }); err == nil {
		t.Error("chưa chọn gì phải fail")
	}
}

// Windows: Word / Notepad không có chữ trong cây – hỏi DocTexts (TextPattern) cho các ứng viên, lấy ô có chữ đầu tiên.
func TestReadDocumentAsksOS(t *testing.T) {
	nodes := []element.Node{
		{Role: "window", Box: elemBox(0, 0, 800, 600)},
		{Role: "document", Box: elemBox(0, 0, 800, 600), Depth: 1},
		{Role: "textbox", Box: elemBox(0, 0, 100, 20), Depth: 2},
	}
	s := modeltest.Step(model.StepReadDocument, func(s *model.Step) { s.TimeoutMs, s.IntervalMs = 20, 1 })
	e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{nodes}, DocText: map[int]string{2: "ô nhỏ", 1: "thân\r\nbài"}}
	if err := e.Run(t.Context()); err != nil {
		t.Fatal(err)
	}
	if out := e.results[e.sc.Steps[0].ID].Output; out["text"] != "thân\nbài" || out["lines"] != 2 {
		t.Errorf("phải lấy document lớn hơn: %v", out)
	}
}
