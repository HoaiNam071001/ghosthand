package procinfo

import (
	"os"
	"testing"
)

func TestCPUPercent(t *testing.T) {
	if got := cpuPercent(0.15, 0.3); got != 50 {
		t.Errorf("got %v", got)
	}
	if cpuPercent(-1, 0.3) != 0 || cpuPercent(1, 0) != 0 {
		t.Error("số âm / khoảng 0 phải ra 0")
	}
}

func TestSystemListFindsSelf(t *testing.T) {
	list, err := System{}.List(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range list {
		if p.PID == os.Getpid() {
			if p.Name == "" || p.MemMB <= 0 {
				t.Errorf("tiến trình của chính test: %+v", p)
			}
			return
		}
	}
	t.Error("không thấy tiến trình của chính test")
}

func TestGroups(t *testing.T) {
	got := Groups([]Info{
		{PID: 1, Name: "Helper", CPU: 1, MemMB: 100},
		{PID: 2, Name: "ffmpeg", CPU: 50, MemMB: 300},
		{PID: 3, Name: "Helper", CPU: 2, MemMB: 50},
		{PID: 4, Name: "idle", MemMB: 1},
	})
	if len(got) != 3 || got[0].Name != "ffmpeg" || got[1].Name != "Helper" || got[1].Count != 2 || got[1].CPU != 3 || got[1].MemMB != 150 {
		t.Errorf("Groups = %+v", got)
	}
}
