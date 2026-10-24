package engine

import (
	"context"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

// click bị bỏ qua, Nếu đọc output giả của n1 để chọn nhánh, node thất bại giả đi cổng fail.
func TestSimulateFlow(t *testing.T) {
	sc := model.Script{Loops: 1, Start: "a", Steps: []model.Step{
		modeltest.Node("a", "n1", model.StepWait, nil),
		modeltest.Node("b", "n2", model.StepClick, nil),
		modeltest.Node("c", "n3", model.StepText, func(s *model.Step) { s.Text = "{{n1.output.ten}}" }),
	}, Edges: []model.Edge{modeltest.Edge("a", model.PortSuccess, "b"), modeltest.Edge("b", model.PortFail, "c")}}
	in := &devicetest.FakeInput{}
	e := newEngine(in, sc, nil)
	e.sim = &Simulate{Outcomes: map[string]string{"n2": "fail"}, Outputs: map[string]map[string]any{"n1": {"ten": "Lan"}}}
	var got []model.StepResult
	e.onNode = func(r model.StepResult) { got = append(got, r) }
	if err := e.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[1].Port != model.PortFail || got[1].Error == nil || got[0].Output["simulated"] != true || got[0].Output["ten"] != "Lan" {
		t.Fatalf("kết quả %+v", got)
	}
	if len(in.Lines()) != 0 {
		t.Errorf("chạy thử khô không được đụng chuột / phím: %q", in.Lines())
	}
}
