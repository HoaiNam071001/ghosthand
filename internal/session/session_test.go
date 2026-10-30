package session

import (
	"context"
	"errors"
	"image"
	"strings"
	"sync"
	"testing"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

type events struct {
	mu   sync.Mutex
	list []string
}

func (e *events) emit(ev string, _ any) {
	e.mu.Lock()
	e.list = append(e.list, ev)
	e.mu.Unlock()
}

func (e *events) has(ev string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, x := range e.list {
		if x == ev {
			return true
		}
	}
	return false
}

func testManager(t *testing.T) (*Manager, *events, *[]model.RunRecord) {
	t.Helper()
	ev := &events{}
	var saved []model.RunRecord
	var mu sync.Mutex
	m := New(ev.emit, Deps{
		Input:       func() device.Input { return &devicetest.FakeInput{} },
		Screen:      func() model.Rect { return model.Rect{W: 1920, H: 1080} },
		Displays:    func() []model.Rect { return []model.Rect{{W: 1920, H: 1080}} },
		AllowDanger: func(model.Script, string, string) (bool, error) { return false, nil },
		Browser:     func(func(x, y int) error) (web.Browser, func(), error) { return nil, func() {}, nil },
		Corners:     func(context.Context, *device.TrackingInput, func()) {},
		Touch:       func(context.Context, *device.TrackingInput, func() bool, func()) {},
		SelfGuard:   func(in device.Input) device.Input { return in },
		SaveRun: func(rec model.RunRecord, _ string, _ map[string]image.Image) error {
			mu.Lock()
			saved = append(saved, rec)
			mu.Unlock()
			return nil
		},
	})
	return m, ev, &saved
}

// Kịch bản một node Chờ ms.
func waitScript(t *testing.T, ms int) model.Script {
	t.Helper()
	sc := model.NewScript()
	s, err := model.NewStep("wait")
	if err != nil {
		t.Fatal(err)
	}
	s.ID, s.Ref, s.DelayAfter = "s1", "n1", ms
	sc.Steps = []model.Step{s}
	sc.Start = "s1"
	sc.Loops = 1
	return sc
}

func TestStartWaitSuccess(t *testing.T) {
	m, ev, saved := testManager(t)
	id, err := m.Start(waitScript(t, 1), nil, Options{Source: SourceCLI})
	if err != nil {
		t.Fatal(err)
	}
	st, err := m.Wait(context.Background(), id)
	if err != nil || st.State != StateSuccess || st.Source != SourceCLI || st.RunID != id {
		t.Fatalf("status %+v err %v", st, err)
	}
	if len(*saved) != 1 || (*saved)[0].ID != id {
		t.Fatalf("lịch sử phải ghi một lần với runId: %+v", *saved)
	}
	for _, e := range []string{"run:started", "engine:state", "engine:done", "run:ended"} {
		if !ev.has(e) {
			t.Errorf("thiếu event %s", e)
		}
	}
	if m.Running() != "" {
		t.Error("xong rồi mà vẫn đang chạy")
	}
}

func TestBusyAndStop(t *testing.T) {
	m, _, saved := testManager(t)
	id, err := m.Start(waitScript(t, 1), nil, Options{Countdown: 5})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := m.Start(waitScript(t, 1), nil, Options{}); !errors.Is(err, ErrBusy) {
		t.Fatalf("phiên thứ hai phải báo bận, được %v", err)
	}
	if st, _ := m.Status(""); st.RunID != id || st.State != StateCountdown {
		t.Fatalf("status lúc đếm ngược %+v", st)
	}
	if m.Stop("khac") {
		t.Error("dừng nhầm runId khác")
	}
	if !m.Stop(id) {
		t.Fatal("không dừng được")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	st, err := m.Wait(ctx, id)
	if err != nil || st.State != StateStopped {
		t.Fatalf("dừng lúc đếm ngược: %+v %v", st, err)
	}
	if len(*saved) != 0 {
		t.Error("dừng lúc đếm ngược không ghi lịch sử")
	}
}

func TestValidateErrorAndUnknown(t *testing.T) {
	m, _, _ := testManager(t)
	sc := waitScript(t, 1)
	sc.Start = "khong-co"
	if _, err := m.Start(sc, nil, Options{}); err == nil {
		t.Fatal("start sai phải báo lỗi ngay")
	}
	if _, err := m.Status("x"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("runId lạ: %v", err)
	}
	if _, err := m.Wait(context.Background(), "x"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("runId lạ: %v", err)
	}
}

// Lượt AI: người dùng đụng chuột → tạm dừng trước node kế, Progress.PausedBy = touch; Tiếp tục thì chạy xong.
// Lượt người dùng tự chạy không theo dõi.
func TestAITouchPauses(t *testing.T) {
	m, _, _ := testManager(t)
	watched := make(chan string, 2)
	m.deps.Touch = func(_ context.Context, _ *device.TrackingInput, _ func() bool, onTouch func()) {
		watched <- "ai"
		time.Sleep(50 * time.Millisecond)
		onTouch()
	}
	sc := waitScript(t, 200)
	s2 := sc.Steps[0]
	s2.ID, s2.Ref = "s2", "n2"
	sc.Steps = append(sc.Steps, s2)
	sc.Edges = []model.Edge{{ID: "e1", From: "s1", Port: model.PortSuccess, To: "s2"}}

	id, err := m.Start(sc, nil, Options{Source: SourceAI})
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(500 * time.Millisecond)
	st, _ := m.Status(id)
	if st.Done() || st.Progress == nil || !st.Progress.Paused || st.Progress.PausedBy != "touch" {
		t.Fatalf("phải tạm dừng vì đụng chuột: %+v %+v", st, st.Progress)
	}
	m.Resume()
	if st, err := m.Wait(context.Background(), id); err != nil || st.State != StateSuccess {
		t.Fatalf("tiếp tục: %+v %v", st, err)
	}

	if _, err := m.Wait(context.Background(), mustStart(t, m, waitScript(t, 1), Options{Source: SourceUser})); err != nil {
		t.Fatal(err)
	}
	if len(watched) != 1 {
		t.Errorf("chỉ lượt AI mới theo dõi chuột (%d lượt)", len(watched))
	}
}

func mustStart(t *testing.T, m *Manager, sc model.Script, o Options) string {
	t.Helper()
	id, err := m.Start(sc, nil, o)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

// Lượt AI không bấm được vào cửa sổ app (hộp hỏi quyền, Cài đặt) – lỗi permission, chưa bấm; lượt người dùng vẫn bấm.
func TestAIRunCannotClickOwnWindow(t *testing.T) {
	m, _, saved := testManager(t)
	fake := &devicetest.FakeInput{}
	m.deps.Input = func() device.Input { return fake }
	m.deps.SelfGuard = func(in device.Input) device.Input {
		return &device.SelfGuardInput{Input: in, Own: func(int, int) (bool, error) { return true, nil },
			OwnFront: func() (bool, error) { return true, nil }}
	}
	sc := model.NewScript()
	s, err := model.NewStep(model.StepClick)
	if err != nil {
		t.Fatal(err)
	}
	s.ID, s.Ref, s.Points = "s1", "n1", []model.Point{{X: 10, Y: 10}}
	sc.Steps, sc.Start, sc.Loops = []model.Step{s}, "s1", 1

	if st, _ := m.Wait(context.Background(), mustStart(t, m, sc, Options{Source: SourceAI})); st.State != StateFail {
		t.Fatalf("lượt AI phải lỗi: %+v", st)
	}
	res := (*saved)[0].Results
	if len(res) == 0 || res[0].Error == nil || res[0].Error.Code != model.ErrPermission {
		t.Fatalf("muốn lỗi permission: %+v", res)
	}
	if f := (*saved)[0].FailNode; f != "s1" { // thống kê node hay lỗi (28 R2)
		t.Errorf("lịch sử phải ghi node gây lỗi s1, được %q", f)
	}
	for _, l := range fake.Lines() {
		if strings.HasPrefix(l, "click") {
			t.Fatalf("lượt AI đã bấm: %q", fake.Lines())
		}
	}

	if st, _ := m.Wait(context.Background(), mustStart(t, m, sc, Options{Source: SourceUser})); st.State != StateSuccess {
		t.Fatalf("lượt người dùng không bị chặn: %+v", st)
	}
}
