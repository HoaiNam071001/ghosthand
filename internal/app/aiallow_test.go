package app

import (
	"testing"

	"ghosthand/internal/model"
)

func TestRunHash(t *testing.T) {
	sc := model.Script{Name: "a", Steps: []model.Step{{ID: "s1", Type: model.StepWait}}}
	h := runHash(sc)
	meta := sc
	meta.Meta = &model.ScriptMeta{Trial: true}
	meta.Groups = []model.Group{{ID: "g1"}}
	if runHash(meta) != h {
		t.Error("Meta / Groups không được đổi hash")
	}
	edited := sc
	edited.Steps = []model.Step{{ID: "s1", Type: model.StepWait, DelayAfter: 500}}
	if runHash(edited) == h {
		t.Error("sửa node phải đổi hash")
	}
	if sc.Steps[0].DelayAfter != 0 {
		t.Error("runHash không được sửa kịch bản gốc")
	}
}

func TestAllowList(t *testing.T) {
	l := newAllowList()
	if ok, changed := l.check("/a.json", "h1"); ok || changed {
		t.Fatal("chưa cho phép gì")
	}
	l.allow("/a.json", "h1")
	if ok, _ := l.check("/a.json", "h1"); !ok {
		t.Fatal("bản đã cho phép")
	}
	if ok, changed := l.check("/a.json", "h2"); ok || !changed {
		t.Fatal("file sửa sau khi cho phép → hỏi lại, báo đã đổi")
	}
	// Kịch bản tạm: nhớ theo nội dung, không có "đã đổi".
	l.allow("", "t1")
	if ok, _ := l.check("", "t1"); !ok {
		t.Fatal("kịch bản tạm cùng nội dung")
	}
	if ok, changed := l.check("", "t2"); ok || changed {
		t.Fatal("kịch bản tạm khác nội dung")
	}
	if ok, _ := l.check("", ""); ok {
		t.Fatal("hash rỗng (run_batch) không bao giờ nhớ")
	}
	l.clear()
	if ok, changed := l.check("/a.json", "h1"); ok || changed {
		t.Fatal("clear quên hết")
	}
}
