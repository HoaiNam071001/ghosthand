package session

import (
	"math"
	"time"

	"ghosthand/internal/engine"
)

// Việc lần chạy đang làm, cho người ngồi máy (58 D1): đang cầm chuột / phím (đừng chạm) hay đang chờ, tạm dừng, xong.
// Một chỗ tính cho viền quanh màn hình (App.OnActivity), API SSE (event run:state), wait_run (current.doing).
const (
	DoingCountdown = "countdown"
	DoingActing    = "acting"  // đang bấm / gõ / kéo – đừng chạm
	DoingWaiting   = "waiting" // đang chờ ảnh / chữ / phần tử / cửa sổ… (Wait)
	DoingPaused    = "paused"
	DoingDone      = "done"
	DoingFailed    = "failed"
	DoingStopped   = "stopped"
)

// Activity – event "run:state".
type Activity struct {
	Doing     string `json:"doing"`
	RunID     string `json:"runId"`
	Source    string `json:"source"`
	Script    string `json:"script,omitempty"`
	WaitKind  string `json:"waitKind,omitempty"`  // waiting: engine.WaitProgress.Kind
	What      string `json:"what,omitempty"`      // waiting: thứ đang chờ
	LeftS     int    `json:"leftS,omitempty"`     // waiting: giây còn lại tới hết giờ
	PausedBy  string `json:"pausedBy,omitempty"`  // paused: touch | ""
	ResumeInS int    `json:"resumeInS,omitempty"` // paused vì đụng chuột: giây nữa tự chạy tiếp
}

// ActivityOf – việc đang làm theo trạng thái phiên st lúc now.
func ActivityOf(st Status, now time.Time) Activity {
	a := Activity{RunID: st.RunID, Source: st.Source, Script: st.Script}
	p := st.Progress
	switch {
	case st.State == StateSuccess:
		a.Doing = DoingDone
	case st.State == StateFail:
		a.Doing = DoingFailed
	case st.State == StateStopped:
		a.Doing = DoingStopped
	case st.State == StateCountdown:
		a.Doing = DoingCountdown
	case p != nil && p.Paused:
		a.Doing, a.PausedBy = DoingPaused, p.PausedBy
		if p.PausedBy == engine.PausedTouch && p.ResumeAt > 0 {
			a.ResumeInS = ceilS(p.ResumeAt - now.UnixMilli())
		}
	case p != nil && p.Wait != nil:
		a.Doing, a.WaitKind, a.What = DoingWaiting, p.Wait.Kind, p.Wait.What
		a.LeftS = ceilS(p.Wait.TimeoutMs - p.Wait.ElapsedMs)
	default:
		a.Doing = DoingActing
	}
	return a
}

func ceilS(ms int64) int { return max(0, int(math.Ceil(float64(ms)/1000))) }

// noteActivity phát run:state + OnActivity khi việc đang làm đổi loại (đếm giây không phát – thanh mini tự đếm theo
// engine:progress, viền chỉ cần loại).
func (m *Manager) noteActivity(r *run) {
	m.mu.Lock()
	a := ActivityOf(r.status, m.deps.Now())
	changed := a.Doing != r.doing.Doing || a.PausedBy != r.doing.PausedBy || a.What != r.doing.What
	r.doing = a
	m.mu.Unlock()
	if !changed {
		return
	}
	m.emit("run:state", a)
	if m.OnActivity != nil {
		m.OnActivity(a)
	}
}
