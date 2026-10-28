package mcpsrv

import (
	"context"
	"testing"
)

// Mọi tool đăng ký phải có annotations đúng nhóm – tool mới thiếu / sai thì test đỏ (qua tools/list như client thật).
func TestToolAnnotations(t *testing.T) {
	cs, _ := connect(t)
	back := &fakeBackend{}
	kinds := map[string]string{}
	for _, ti := range New(back).Tools() {
		kinds[ti.Name] = ti.Kind
	}
	tl, err := cs.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(tl.Tools) != len(kinds) {
		t.Fatalf("tools/list %d tool, đăng ký %d", len(tl.Tools), len(kinds))
	}
	for _, tool := range tl.Tools {
		a := tool.Annotations
		if a == nil {
			t.Errorf("%s: thiếu annotations", tool.Name)
			continue
		}
		switch kind := kinds[tool.Name]; kind {
		case KindRead, KindScreen:
			if !a.ReadOnlyHint {
				t.Errorf("%s (%s): phải ReadOnlyHint", tool.Name, kind)
			}
		case KindRun:
			if a.ReadOnlyHint && tool.Name != "wait_run" {
				t.Errorf("%s: nhóm run không được ReadOnlyHint", tool.Name)
			}
		}
		if !a.ReadOnlyHint && (a.DestructiveHint == nil || a.OpenWorldHint == nil) {
			t.Errorf("%s: phải nói rõ DestructiveHint / OpenWorldHint (mặc định client là true)", tool.Name)
		}
	}
	for _, name := range []string{"run_script", "run_step", "resume_run"} {
		a := annotationsFor(KindRun, name)
		if a.DestructiveHint == nil || !*a.DestructiveHint || a.OpenWorldHint == nil || !*a.OpenWorldHint {
			t.Errorf("%s: phải destructive + open-world", name)
		}
	}
}
