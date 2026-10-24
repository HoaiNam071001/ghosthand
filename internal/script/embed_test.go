package script

import (
	"testing"

	"ghosthand/internal/model"
)

func embedFixture() (parent, child model.Script) {
	parent = model.Script{
		Steps: []model.Step{
			{ID: "a", Ref: "n1", Type: model.StepClick, Pos: &model.Pos{X: 100, Y: 50}},
			{ID: "b", Ref: "n2", Type: model.StepClick, Pos: &model.Pos{X: 100, Y: 300}},
		},
		Start:  "a",
		Edges:  []model.Edge{{ID: "e1", From: "a", Port: model.PortSuccess, To: "b"}},
		Inputs: []model.ScriptInput{{Key: "ten", Type: model.InputText, Label: "Tên"}},
	}
	child = model.Script{
		Name:   "Đăng nhập",
		Region: &model.Rect{X: 100, Y: 100, W: 400, H: 200},
		Steps: []model.Step{
			{ID: "a", Ref: "n1", Type: model.StepClick, Pos: &model.Pos{X: 10, Y: 10},
				Points: []model.Point{{X: 50, Y: 20}, {X: 10, Y: 10, Ax: AnchorEnd, Ay: AnchorEnd}}},
			{ID: "x", Ref: "n2", Type: model.StepText, Text: "{{n1.output.x}} {{ten}} {{vars.v}}", Pos: &model.Pos{X: 10, Y: 200}},
			{ID: "z", Ref: "n3", Type: model.StepEnd, EndStatus: model.EndSuccess},
		},
		Start: "a",
		Edges: []model.Edge{
			{ID: "e1", From: "a", Port: model.PortSuccess, To: "x"},
			{ID: "e2", From: "x", Port: model.PortSuccess, To: "z"},
		},
		Inputs: []model.ScriptInput{
			{Key: "ten", Type: model.InputNumber, Label: "Tên", Targets: []model.InputTarget{{StepID: "x", Field: "text"}}},
		},
	}
	return
}

func TestEmbed(t *testing.T) {
	parent, child := embedFixture()
	res, err := Embed(parent, child, model.Rect{W: 1000, H: 800}, "dang-nhap.json")
	if err != nil {
		t.Fatal(err)
	}
	sc := res.Script
	if len(parent.Steps) != 2 || len(parent.Edges) != 1 {
		t.Fatal("sửa đầu vào")
	}
	if len(sc.Steps) != 4 || res.Nodes != 2 || res.DroppedEnds != 1 {
		t.Fatalf("node: %d, nhúng %d, bỏ end %d", len(sc.Steps), res.Nodes, res.DroppedEnds)
	}
	if sc.Start != "a" {
		t.Errorf("start phải giữ: %s", sc.Start)
	}
	n1, n2 := sc.Steps[2], sc.Steps[3]
	if n1.ID == "a" || n1.Ref == "n1" || n2.Ref == "n2" || n2.Ref == n1.Ref {
		t.Errorf("id / ref phải đổi: %+v %+v", n1, n2)
	}
	if want := "{{" + n1.Ref + ".output.x}} {{ten_2}} {{vars.v}}"; n2.Text != want {
		t.Errorf("biến: %q, muốn %q", n2.Text, want)
	}
	// vùng cha = toàn màn (0,0): điểm (50,20) trong vùng child → (150,120); neo end giữ khoảng tới cạnh phải / dưới
	if p := n1.Points[0]; p.X != 150 || p.Y != 120 {
		t.Errorf("start: %+v", p)
	}
	if p := n1.Points[1]; p.X != 1000-(500-10-0) || p.Y != 800-(300-10) {
		t.Errorf("end: %+v", p)
	}
	if len(sc.Edges) != 2 || sc.Edges[1].From != n1.ID || sc.Edges[1].To != n2.ID {
		t.Errorf("cạnh: %+v", sc.Edges)
	}
	if n1.Pos.X != 100 || n1.Pos.Y != 300+embedGapY {
		t.Errorf("vị trí: %+v", n1.Pos)
	}
	if g := sc.Groups[0]; g.From != "dang-nhap.json" || len(g.Members) != 2 || g.Name != "Đăng nhập" {
		t.Errorf("nhóm: %+v", g)
	}
	if res.RenamedInput["ten"] != "ten_2" || len(sc.Inputs) != 2 || sc.Inputs[1].Targets[0].StepID != n2.ID {
		t.Errorf("input: %+v %+v", res.RenamedInput, sc.Inputs)
	}
	idx := map[string]int{}
	for i, s := range sc.Steps {
		idx[s.ID] = i
	}
	if err := validateGroups(sc.Groups, idx); err != nil {
		t.Error(err)
	}
}

func TestEmbedSameInputMerges(t *testing.T) {
	parent, child := embedFixture()
	child.Inputs[0].Type = model.InputText
	res, err := Embed(parent, child, model.Rect{W: 1000, H: 800}, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Script.Inputs) != 1 || len(res.Script.Inputs[0].Targets) != 1 || res.RenamedInput != nil {
		t.Errorf("gộp input: %+v", res.Script.Inputs)
	}
}

func TestEmbedEmpty(t *testing.T) {
	parent, _ := embedFixture()
	if _, err := Embed(parent, model.Script{}, model.Rect{}, ""); err == nil {
		t.Fatal("kịch bản rỗng phải báo lỗi")
	}
}

func TestReanchorRatio(t *testing.T) {
	p := reanchorPoint(model.Point{X: 5000, Y: 2500, Ax: AnchorRatio, Ay: AnchorRatio}, model.Rect{W: 400, H: 200}, model.Rect{X: 100, Y: 100, W: 800, H: 400})
	// (200,50) trên màn hình → vùng lớn: (100/800, -50/400) → 1250, -1250
	if p.X != 1250 || p.Y != -1250 {
		t.Errorf("%+v", p)
	}
}
