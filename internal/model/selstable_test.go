package model

import (
	"encoding/json"
	"os"
	"slices"
	"testing"
)

// Cùng dữ liệu với frontend/src/flow/web.test.ts (testdata/stable-labels.json).
func TestStableLabel(t *testing.T) {
	b, err := os.ReadFile("../../testdata/stable-labels.json")
	if err != nil {
		t.Fatal(err)
	}
	var data struct {
		Labels, Selectors []struct{ In, Want string }
		Fixes             []struct {
			Lines, Near []string
			Want        string
		}
	}
	if err := json.Unmarshal(b, &data); err != nil {
		t.Fatal(err)
	}
	for _, c := range data.Labels {
		if got := StableLabel(c.In); got != c.Want {
			t.Errorf("StableLabel(%q) = %q, cần %q", c.In, got, c.Want)
		}
	}
	for _, c := range data.Selectors {
		got, ok := StableSelector(c.In)
		if ok != (c.Want != "") || got != c.Want {
			t.Errorf("StableSelector(%q) = %q %v, cần %q", c.In, got, ok, c.Want)
		}
	}
	for _, c := range data.Fixes {
		if got := SelectorFix(c.Lines, c.Near); got != c.Want {
			t.Errorf("SelectorFix(%q, %q) = %q, cần %q", c.Lines, c.Near, got, c.Want)
		}
	}
}

func TestStableFirst(t *testing.T) {
	got := StableFirst([]string{`aria="Messenger, 1 unread"`, `role=button[name="Messenger, 1 unread"]`, "css=#m"})
	want := []string{"aria=Messenger", `aria="Messenger, 1 unread"`, `role=button[name="Messenger"]`,
		`role=button[name="Messenger, 1 unread"]`, "css=#m"}
	if !slices.Equal(got, want) {
		t.Fatalf("got %q", got)
	}
}
