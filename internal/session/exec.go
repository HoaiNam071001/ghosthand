package session

import (
	"context"
	"errors"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
)

// Event của một phiên (Emitter). Tên engine:* giữ như trước bước 22 – frontend nghe sẵn.
//   run:started {runId, source, script, path, preset} · engine:state bool · engine:countdown n · engine:progress Progress
//   engine:node StepResult · engine:failed FailedStep · engine:done RunSummary · run:ended Status

// Started – event "run:started".
type Started struct {
	RunID  string `json:"runId"`
	Source string `json:"source"`
	Script string `json:"script"`
	Path   string `json:"path,omitempty"`
	Preset string `json:"preset,omitempty"`
}

// FailedStep – bước làm lần chạy dừng vì lỗi (event engine:failed).
type FailedStep struct {
	StepID string             `json:"stepId"`
	Miss   *engine.FindResult `json:"miss,omitempty"` // chờ ảnh hết giờ: chỗ giống nhất
}

// exec chạy phiên r: đếm ngược, chạy engine, ghi lịch sử, emit event; luôn đóng r.done.
func (m *Manager) exec(ctx context.Context, r *run, canDanger bool) {
	st := r.status
	base := m.deps.Input()
	if st.Source == SourceAI {
		base = m.deps.SelfGuard(base)
	}
	in := &device.TrackingInput{Input: base}
	rec := model.RunRecord{RunSummary: model.RunSummary{ID: st.RunID, Script: r.sc.Name, Source: st.Source}, Inputs: r.values, Results: []model.StepResult{}}
	types := map[string]string{}
	for _, s := range r.sc.Steps {
		types[s.ID] = s.Type
	}
	var err error
	defer func() { m.finish(r, err) }()

	br, closeBr, err := m.deps.Browser(in.Move)
	if err != nil {
		return
	}
	defer closeBr()
	eng := engine.New(in, r.sc, engine.Options{
		Screen: m.deps.Screen(), Displays: m.deps.Displays(), Debug: st.Source == SourceUser, StepMode: r.opt.Step, FocusClick: true, KeepShots: true, ShotEach: r.opt.ShotEach,
		Browser: br, AllowDanger: canDanger, StopAt: r.opt.StopAt, Seed: r.seed, Pins: r.opt.Pins, ShotsDir: m.deps.ShotsDir(), Secrets: r.secrets, MCP: m.deps.MCP, AIDefault: m.deps.AIDefault().Config(),
		OnProgress: func(p engine.Progress) {
			m.mu.Lock()
			r.status.Progress = &p
			m.mu.Unlock()
			m.emit("engine:progress", p)
		},
		OnNode: func(res model.StepResult) {
			rec.Add(res, types[res.NodeID])
			m.noteNode(r, res)
			m.emit("engine:node", res)
		},
	})
	m.mu.Lock()
	r.eng = eng
	m.mu.Unlock()

	m.emit("run:started", Started{RunID: st.RunID, Source: st.Source, Script: st.Script, Path: st.Path, Preset: st.Preset})
	m.emit("engine:state", true)
	defer m.emit("engine:state", false)

	for n := r.opt.Countdown; n > 0; n-- {
		m.emit("engine:countdown", n)
		if engine.Sleep(ctx, 1000) != nil {
			err = context.Canceled // dừng khi đang đếm ngược – không ghi lịch sử
			return
		}
	}
	m.emit("engine:countdown", 0)
	m.setState(r, StateRunning)

	go m.deps.Corners(ctx, in, func() { m.StopWith(StopByCorner) })
	if st.Source == SourceAI { // người dùng cầm chuột lúc AI đang điều khiển → nhường: tạm dừng, wait_run báo AI
		go m.deps.Touch(ctx, in, eng.Paused, func() { eng.PauseTouched() })
	}

	if r.sc.KeepAwake { // giữ máy thức tới khi chạy xong; lỗi chỉ cảnh báo – kịch bản vẫn chạy
		if stop, kerr := m.deps.KeepAwake(ctx); kerr != nil {
			m.emit("log:error", "giữ máy thức: "+kerr.Error())
		} else {
			defer stop()
		}
	}

	rec.StartedAt = m.deps.Now()
	err = eng.Run(ctx)
	rec.DurationMs = m.deps.Now().Sub(rec.StartedAt).Milliseconds()
	rec.Status, rec.Error = outcome(err)
	if id, _ := eng.Failed(); err != nil && id != "" {
		rec.FailNode = id
	}
	carry := eng.Carry()
	m.mu.Lock()
	r.carry, r.shots, r.status.Reached, r.status.TimedOut = &carry, eng.Shots(), eng.Reached(), eng.TimedOut()
	m.mu.Unlock()
	if r.opt.NoHistory {
		// kịch bản tạm của AI: vết chạy vẫn giữ trong bộ nhớ (Trace), không ghi thư mục lịch sử
	} else if e := m.deps.SaveRun(rec, r.opt.Path, eng.Shots()); e != nil {
		m.emit("log:error", "lưu lịch sử chạy: "+e.Error()) // lịch sử chỉ là phụ – vẫn báo xong
	}
	m.emit("engine:done", rec.RunSummary)
	if id, miss := eng.Failed(); err != nil && id != "" {
		m.mu.Lock()
		r.status.FailedStep = id
		m.mu.Unlock()
		// frontend chọn bước lỗi; chờ ảnh hết giờ thì kèm chỗ giống nhất để xem lại
		m.emit("engine:failed", FailedStep{StepID: id, Miss: miss})
	}
}

func outcome(err error) (state, msg string) {
	switch {
	case errors.Is(err, context.Canceled):
		return StateStopped, ""
	case err != nil:
		return StateFail, err.Error()
	}
	return StateSuccess, ""
}

func (m *Manager) setState(r *run, state string) {
	m.mu.Lock()
	r.status.State = state
	m.mu.Unlock()
}

// finish – chốt trạng thái cuối, nhả phiên đang chạy, emit "run:ended", gọi OnEnd.
func (m *Manager) finish(r *run, err error) {
	r.cancel()
	state, msg := outcome(err)
	m.mu.Lock()
	r.status.State, r.status.Error = state, msg
	r.status.DurationMs = m.deps.Now().Sub(r.status.StartedAt).Milliseconds()
	if !errors.Is(err, context.Canceled) {
		r.err = err
	}
	if m.cur == r {
		m.cur = nil
	}
	st := r.status
	m.mu.Unlock()
	close(r.done)
	m.emit("run:ended", st)
	if m.OnEnd != nil {
		m.OnEnd(st, r.err)
	}
}
