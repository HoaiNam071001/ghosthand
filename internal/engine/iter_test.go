package engine

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

// Mỗi lần chạy node ghi input đã thay biến + lượt của node lặp bao nó (bước 60 V0).
func TestResultInputAndIter(t *testing.T) {
	sc := forEachScript(func(s *model.Step) { s.Value = "táo\ncam" }, "{{n1.output.item}}!")
	e, _ := ctlEngine(sc, nil)
	var got []string
	e.onNode = func(r model.StepResult) {
		it := "-"
		if r.Iter != nil {
			it = fmt.Sprintf("%s#%d", r.Iter.NodeID, r.Iter.Index)
		}
		got = append(got, fmt.Sprintf("%s %s %v", r.Ref, it, r.Input["text"]))
	}
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := "n1 f#1 <nil>|n2 f#1 táo!|n1 f#2 <nil>|n2 f#2 cam!|n1 - <nil>|n3 - |xong 2"
	if s := strings.Join(got, "|"); s != want {
		t.Errorf("có %q\nmuốn %q", s, want)
	}
}

// Vòng lồng: lượt Đếm bên ngoài, Lặp qua danh sách bên trong – node thân vòng trong ghi lượt vòng trong;
// vòng trong hết thì node sau ghi lượt vòng ngoài. Chuỗi dài cắt bớt, bí mật bị che.
func TestIterNestedAndInputClip(t *testing.T) {
	sc := model.Script{Start: "c", Steps: []model.Step{
		modeltest.Node("c", "n1", model.StepCounter, func(s *model.Step) { s.Max = 2 }),
		modeltest.Node("f", "n2", model.StepForEach, func(s *model.Step) { s.Value = "a" }),
		modeltest.Node("t", "n3", model.StepText, func(s *model.Step) { s.Text = "{{n2.output.item}}" + strings.Repeat("x", 300) }),
		modeltest.Node("d", "n4", model.StepText, func(s *model.Step) { s.Text = "{{n1.output.count}}" }),
	}, Edges: []model.Edge{modeltest.Edge("c", model.PortNext, "f"), modeltest.Edge("f", model.PortItem, "t"), modeltest.Edge("t", model.PortSuccess, "f"),
		modeltest.Edge("f", model.PortDone, "d"), modeltest.Edge("d", model.PortSuccess, "c")}}
	e, _ := ctlEngine(sc, nil)
	var got []string
	var long string
	e.onNode = func(r model.StepResult) {
		it := "-"
		if r.Iter != nil {
			it = fmt.Sprintf("%s#%d", r.Iter.NodeID, r.Iter.Index)
		}
		got = append(got, r.Ref+" "+it)
		if r.Ref == "n3" {
			long, _ = r.Input["text"].(string)
		}
	}
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := "n1 c#1|n2 f#1|n3 f#1|n2 c#1|n4 c#1|n1 c#2|n2 f#1|n3 f#1|n2 c#2|n4 c#2|n1 -"
	if s := strings.Join(got, "|"); s != want {
		t.Errorf("có %q\nmuốn %q", s, want)
	}
	if r := []rune(long); len(r) != maxInputRunes+1 || !strings.HasPrefix(long, "ax") || !strings.HasSuffix(long, "…") {
		t.Errorf("input dài phải cắt còn %d ký tự + …, có %d", maxInputRunes, len(r))
	}
}

func TestInputMasksSecret(t *testing.T) {
	sc := model.Script{Start: "t", Steps: []model.Step{modeltest.Node("t", "n1", model.StepText, func(s *model.Step) { s.Text = "pw={{secret.pw}}" })}}
	e, _ := ctlEngine(sc, nil)
	e.rv.secrets = map[string]string{"pw": "hunter2"}
	e.mask = newMasker(e.rv.secrets)
	var in any
	e.onNode = func(r model.StepResult) { in = r.Input["text"] }
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if s, _ := in.(string); strings.Contains(s, "hunter2") || !strings.HasPrefix(s, "pw=") {
		t.Errorf("input phải che bí mật, có %q", s)
	}
}
