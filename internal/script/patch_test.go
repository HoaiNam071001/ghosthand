package script

import (
	"encoding/json"
	"testing"

	"ghosthand/internal/model"
)

func compactScript(t *testing.T, src string) model.Script {
	t.Helper()
	var c Compact
	if err := json.Unmarshal([]byte(src), &c); err != nil {
		t.Fatal(err)
	}
	sc, err := Expand(c)
	if err != nil {
		t.Fatal(err)
	}
	if sc, err = Checked(sc); err != nil {
		t.Fatal(err)
	}
	return sc
}

func TestExpandCompact(t *testing.T) {
	sc := compactScript(t, `{"name":"Mở nhạc","steps":[
		{"type":"open","target":"https://youtube.com"},
		{"ref":"n5","type":"wait","delayAfter":2000},
		{"type":"key","keys":["space"]}],
		"edges":[{"from":"n1","port":"success","to":"n5"},{"from":"s2","port":"success","to":"s3"}]}`)
	if sc.Name != "Mở nhạc" || sc.Loops != 1 || sc.Start != "s1" || len(sc.Steps) != 3 {
		t.Fatalf("kịch bản: %+v", sc)
	}
	if sc.Steps[0].Button != "left" || !sc.Steps[0].Enabled {
		t.Errorf("thiếu mặc định NewStep: %+v", sc.Steps[0])
	}
	if sc.Edges[0].From != "s1" || sc.Edges[0].To != "s2" {
		t.Errorf("cạnh trỏ theo ref phải đổi sang id: %+v", sc.Edges[0])
	}
}

func TestExpandEdgeIDs(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"wait"},{"type":"wait"},{"type":"wait"}],
		"edges":[{"from":"s1","port":"success","to":"s2"},{"id":"e1","from":"s2","port":"success","to":"s3"}]}`)
	if len(sc.Edges) != 2 || sc.Edges[0].ID == "e1" || sc.Edges[1].ID != "e1" {
		t.Errorf("id tự đặt không trùng id có sẵn: %+v", sc.Edges)
	}
}

func TestExpandAutoEdges(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"wait"},{"type":"wait"},{"type":"wait"}]}`)
	if len(sc.Edges) != 2 || sc.Edges[1].From != "s2" || sc.Edges[1].To != "s3" || sc.Edges[1].Port != model.PortSuccess {
		t.Errorf("không có edges thì nối theo thứ tự: %+v", sc.Edges)
	}
}

func TestApplyPatch(t *testing.T) {
	sc := compactScript(t, `{"steps":[
		{"type":"open","target":"https://a.com","delayAfter":3000},
		{"type":"type","text":"xin chào"},
		{"type":"key","keys":["enter"]}]}`)
	name := "Đã sửa"
	var p Patch
	if err := json.Unmarshal([]byte(`{"name":"Đã sửa",
		"steps":[{"ref":"n2","text":"{{bai_hat}}"},{"type":"wait","delayAfter":500}],
		"removeSteps":["s3"],
		"edges":[{"from":"n2","port":"success","to":"s4"}]}`), &p); err != nil {
		t.Fatal(err)
	}
	got, _, err := ApplyPatch(sc, p)
	if err != nil {
		t.Fatal(err)
	}
	if got, err = Checked(got); err != nil {
		t.Fatal(err)
	}
	if got.Name != name || len(got.Steps) != 3 {
		t.Fatalf("kịch bản: %+v", got)
	}
	if s := got.Steps[1]; s.ID != "s2" || s.Text != "{{bai_hat}}" || s.Type != model.StepText || !s.Enabled {
		t.Errorf("sửa theo ref chỉ đè trường gửi lên: %+v", s)
	}
	if s := got.Steps[2]; s.ID != "s4" || s.Ref != "n3" || s.DelayAfter != 500 {
		t.Errorf("node mới: id s4 (s3 vừa xoá vẫn tính từ số node), ref nhỏ nhất chưa dùng: %+v", s)
	}
	if sc.Steps[1].Text != "xin chào" {
		t.Error("ApplyPatch không được sửa kịch bản gốc")
	}
	want := map[string]string{"s1": "s2", "s2": "s4"}
	if len(got.Edges) != 2 {
		t.Fatalf("cạnh: %+v", got.Edges)
	}
	for _, e := range got.Edges {
		if want[e.From] != e.To {
			t.Errorf("cạnh %+v (cạnh s2→s3 phải bị xoá cùng node, cổng s2.success thay bằng cạnh mới)", e)
		}
	}
}

func TestApplyPatchErrors(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"wait"}]}`)
	if _, _, err := ApplyPatch(sc, Patch{RemoveSteps: []string{"n9"}}); err == nil {
		t.Error("xoá node không có phải báo lỗi")
	}
	if _, _, err := ApplyPatch(sc, Patch{RemoveEdges: []string{"e9"}}); err == nil {
		t.Error("xoá cạnh không có phải báo lỗi")
	}
	if _, _, err := ApplyPatch(sc, Patch{Steps: []json.RawMessage{json.RawMessage(`{"type":"bay"}`)}}); err == nil {
		t.Error("loại node lạ phải báo lỗi")
	}
}

// Đổi loại node (46 B2): dựng lại theo loại mới, giữ trường chung + trường loại mới cũng dùng, bỏ cạnh theo cổng không còn.
func TestApplyPatchRetype(t *testing.T) {
	sc := compactScript(t, `{"steps":[
		{"type":"click","name":"Bấm Lưu","points":[{"x":40,"y":50}],"clicks":3,"delayAfter":700},
		{"type":"if","cond":{"kind":"value","left":"a","op":"eq","right":"a"}},
		{"type":"wait"},{"type":"wait"}],
		"edges":[{"from":"n1","port":"success","to":"n2"},{"from":"n2","port":"true","to":"n3"},{"from":"n2","port":"false","to":"n4"}]}`)
	var p Patch
	if err := json.Unmarshal([]byte(`{"steps":[{"ref":"n1","type":"double"},{"ref":"n2","type":"wait","delayAfter":100}]}`), &p); err != nil {
		t.Fatal(err)
	}
	got, dropped, err := ApplyPatch(sc, p)
	if err != nil {
		t.Fatal(err)
	}
	if got, err = Checked(got); err != nil {
		t.Fatal(err)
	}
	d := got.Steps[0]
	if d.Type != model.StepDouble || d.ID != "s1" || d.Ref != "n1" || d.Name != "Bấm Lưu" || d.DelayAfter != 700 ||
		len(d.Points) != 1 || d.Points[0].X != 40 || d.Clicks == 3 {
		t.Errorf("click → double: %+v", d)
	}
	if w := got.Steps[1]; w.Type != model.StepWait || w.Cond != nil || w.DelayAfter != 100 {
		t.Errorf("if → wait phải bỏ điều kiện: %+v", w)
	}
	if len(dropped) != 2 || len(got.Edges) != 1 {
		t.Errorf("cạnh true / false của if phải bị bỏ: dropped %+v, còn %+v", dropped, got.Edges)
	}
}

func TestApplyPatchGroups(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"wait"},{"type":"wait"},{"type":"wait"}]}`)
	var p Patch
	if err := json.Unmarshal([]byte(`{"groups":[{"id":"g1","name":"Chờ","members":["n1","n2"],"color":"wait"}]}`), &p); err != nil {
		t.Fatal(err)
	}
	got, _, err := ApplyPatch(sc, p)
	if err != nil {
		t.Fatal(err)
	}
	if got, err = Checked(got); err != nil {
		t.Fatal(err)
	}
	if len(got.Groups) != 1 || got.Groups[0].Members[0] != got.Steps[0].ID || got.Groups[0].Color != "wait" {
		t.Fatalf("nhóm không đúng: %+v", got.Groups)
	}
}
