package script

import (
	"slices"
	"testing"

	"ghosthand/internal/model"
)

func TestParseFlow(t *testing.T) {
	got, err := ParseFlow([]string{"n1>n2 > n3", "n2.fail->n6.next>n4>n2", "n3.case:vip>n7"})
	if err != nil {
		t.Fatal(err)
	}
	want := []model.Edge{
		{From: "n1", Port: "success", To: "n2"}, {From: "n2", Port: "success", To: "n3"},
		{From: "n2", Port: "fail", To: "n6"}, {From: "n6", Port: "next", To: "n4"}, {From: "n4", Port: "success", To: "n2"},
		{From: "n3", Port: "case:vip", To: "n7"},
	}
	if !slices.Equal(got, want) {
		t.Fatalf("got %v", got)
	}
	for _, bad := range []string{"n1", "n1>>n2", "n1>n2.fail"} {
		if _, err := ParseFlow([]string{bad}); err == nil {
			t.Errorf("%q phải lỗi", bad)
		}
	}
}

func TestFlowText(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"open","target":"x"},{"type":"waitImage","findBy":"text","findText":"a"},
		{"type":"clickImage","imageSource":"node","imageFrom":"n2"},{"type":"scroll"},{"type":"counter","max":3},{"type":"end"}],
		"flow":["n1>n2>n3","n2.fail>n5.next>n4>n2","n5.done>n6"]}`)
	got := FlowText(sc)
	want := []string{"n1>n2>n3", "n2.fail>n5.next>n4>n2", "n5.done>n6"}
	if !slices.Equal(got, want) {
		t.Fatalf("got %q", got)
	}
}

func TestPatchFlowAndRemoveByPort(t *testing.T) {
	sc := compactScript(t, `{"steps":[{"type":"wait"},{"type":"wait"},{"type":"wait"}]}`)
	out, _, err := ApplyPatch(sc, Patch{RemoveEdges: []string{"n1"}, Flow: []string{"n1.fail>n3", "n1>n3"}})
	if err != nil {
		t.Fatal(err)
	}
	if got := FlowText(out); !slices.Equal(got, []string{"n1>n3", "n1.fail>n3", "n2>n3"}) {
		t.Fatalf("got %q", got)
	}
}
