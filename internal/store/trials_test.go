package store

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"ghosthand/internal/model"
)

func TestTrials(t *testing.T) {
	d := t.TempDir()
	t.Setenv("HOME", d)
	t.Setenv("XDG_CONFIG_HOME", d)
	dir := filepath.Join(d, "ai")
	write := func(name string, trial bool, age time.Duration) string {
		sc := model.NewScript()
		sc.Name = name
		sc.Meta = &model.ScriptMeta{CreatedBy: model.CreatedByAI, Trial: trial}
		p := filepath.Join(dir, name+".json")
		if err := WriteScriptFile(p, sc); err != nil {
			t.Fatal(err)
		}
		old := time.Now().Add(-age)
		if err := os.Chtimes(p, old, old); err != nil {
			t.Fatal(err)
		}
		return p
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	oldTrial := write("Thử cũ", true, 10*24*time.Hour)
	opened := write("Thử mở lại", true, 10*24*time.Hour)
	write("Thử mới", true, time.Hour)
	write("Giữ", false, 30*24*time.Hour)
	MarkTrialUsed(opened) // mở hôm nay – mtime cũ không tính

	list := Trials(dir)
	if len(list) != 3 || list[2].Path != oldTrial {
		t.Fatalf("danh sách thử: %+v", list)
	}
	keep := MCPSettings{}.TrialKeep()
	stale := StaleTrials(list, keep, time.Now())
	if len(stale) != 1 || stale[0].Path != oldTrial {
		t.Fatalf("quá hạn: %+v", stale)
	}
	if got := StaleTrials(list, MCPSettings{TrialDays: -1}.TrialKeep(), time.Now()); len(got) != 0 {
		t.Errorf("tắt dọn mà vẫn ra %v", got)
	}

	EditRecent(func(l []string) []string { return PushRecent(l, oldTrial) })
	ForgetTrials([]string{oldTrial, opened})
	if len(RecentScripts()) != 0 {
		t.Errorf("Mở gần đây còn file đã dọn: %v", RecentScripts())
	}
	if got := StaleTrials(Trials(dir), keep, time.Now()); len(got) != 2 {
		t.Errorf("bỏ dấu mở thì lấy lại mtime – phải 2 file quá hạn: %+v", got)
	}
}
