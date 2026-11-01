package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestSelectorHints(t *testing.T) {
	sc := model.Script{Steps: []model.Step{
		{ID: "a", Ref: "n1", Selectors: []string{`aria="Messenger"`, `aria="Messenger, 1 unread"`}},
		{ID: "b", Ref: "n2", Cond: &model.Cond{Kind: "all", Conds: []model.Cond{{Kind: "element", Selectors: []string{"text=Hộp thư (3)"}}}}},
		{ID: "c", Ref: "n3", Cases: []model.Case{{Key: "x", Cond: &model.Cond{Kind: "element", Selectors: []string{"aria={{ten}} (3)"}}}}},
	}}
	got := SelectorHints(sc)
	want := []SelectorHint{
		{"a", "n1", "selectors[1]", `aria="Messenger, 1 unread"`, "aria=Messenger"},
		{"b", "n2", "cond.conds[0].selectors[0]", "text=Hộp thư (3)", "text=Hộp thư"},
	}
	if len(got) != len(want) {
		t.Fatalf("got %+v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("%d: %+v, cần %+v", i, got[i], want[i])
		}
	}
}
