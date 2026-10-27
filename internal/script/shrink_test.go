package script_test

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/samples"
	"ghosthand/internal/script"
)

// Shrink → Expand dựng lại đúng kịch bản (trừ pos, id cạnh) trên mọi Mẫu thử – trường mới quên xử lý sẽ đỏ ở đây.
func TestShrinkRoundTrip(t *testing.T) {
	list, err := samples.List()
	if err != nil {
		t.Fatal(err)
	}
	for _, info := range list {
		sc, err := samples.Open(info.ID, "file:///sandbox/")
		if err != nil {
			t.Fatal(err)
		}
		sh, err := script.Shrink(sc)
		if err != nil {
			t.Fatal(info.ID, err)
		}
		b, _ := json.Marshal(sh)
		var c script.Compact
		if err := json.Unmarshal(b, &c); err != nil {
			t.Fatal(info.ID, err)
		}
		back, err := script.Expand(c)
		if err == nil {
			back, err = script.Checked(back)
		}
		if err != nil {
			t.Fatal(info.ID, err)
		}
		if a, b := normalize(sc), normalize(back); a != b {
			t.Errorf("%s: khác sau Shrink → Expand\n%s\n%s", info.ID, a, b)
		}
	}
}

// normalize – bỏ pos, id cạnh, sắp node theo id, cạnh theo (from, port) để so.
func normalize(sc model.Script) string {
	sc.Steps = slices.Clone(sc.Steps)
	for i := range sc.Steps {
		sc.Steps[i].Pos = nil
	}
	slices.SortFunc(sc.Steps, func(a, b model.Step) int { return strings.Compare(a.ID, b.ID) })
	sc.Edges = slices.Clone(sc.Edges)
	for i := range sc.Edges {
		sc.Edges[i].ID = ""
	}
	slices.SortFunc(sc.Edges, func(a, b model.Edge) int { return strings.Compare(a.From+"."+a.Port, b.From+"."+b.Port) })
	sc.Version = 0
	b, _ := json.Marshal(sc)
	return string(b)
}
