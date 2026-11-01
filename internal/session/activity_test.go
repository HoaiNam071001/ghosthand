package session

import (
	"context"
	"testing"
	"time"

	"ghosthand/internal/engine"
)

func TestActivityOf(t *testing.T) {
	now := time.UnixMilli(50_000)
	run := func(p *engine.Progress) Status { return Status{State: StateRunning, Source: SourceAI, Progress: p} }
	cases := []struct {
		name string
		st   Status
		want Activity
	}{
		{"đếm ngược", Status{State: StateCountdown}, Activity{Doing: DoingCountdown}},
		{"đang thao tác", run(&engine.Progress{}), Activity{Doing: DoingActing}},
		{"chưa có tiến độ", run(nil), Activity{Doing: DoingActing}},
		{"đang chờ chữ", run(&engine.Progress{Wait: &engine.WaitProgress{Kind: "text", What: "Sent", ElapsedMs: 2_500, TimeoutMs: 10_000}}),
			Activity{Doing: DoingWaiting, WaitKind: "text", What: "Sent", LeftS: 8}},
		{"đụng chuột", run(&engine.Progress{Paused: true, PausedBy: engine.PausedTouch, ResumeAt: 53_100, Wait: &engine.WaitProgress{}}),
			Activity{Doing: DoingPaused, PausedBy: "touch", ResumeInS: 4}},
		{"lỗi", Status{State: StateFail}, Activity{Doing: DoingFailed}},
	}
	for _, c := range cases {
		got := ActivityOf(c.st, now)
		got.Source, got.RunID, got.Script = "", "", ""
		if got != c.want {
			t.Errorf("%s: %+v, muốn %+v", c.name, got, c.want)
		}
	}
}

// Một lần chạy: run:state phát khi đổi loại việc, kết thúc bằng done; OnActivity nhận cùng chuỗi.
func TestActivityEvents(t *testing.T) {
	m, ev, _ := testManager(t)
	var got []string
	m.OnActivity = func(a Activity) { got = append(got, a.Doing) }
	m.Wait(context.Background(), mustStart(t, m, waitScript(t, 1), Options{Source: SourceAI}))
	if len(got) < 2 || got[0] != DoingCountdown || got[len(got)-1] != DoingDone || !ev.has("run:state") {
		t.Errorf("chuỗi việc = %v", got)
	}
	for i := 1; i < len(got); i++ {
		if got[i] == got[i-1] {
			t.Errorf("phát trùng %q: %v", got[i], got)
		}
	}
}
