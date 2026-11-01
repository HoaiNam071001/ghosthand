package session

import (
	"context"
	"errors"
	"testing"

	"ghosthand/internal/model"
)

// Kịch bản 2 node Chờ s1 → s2.
func twoWaits(t *testing.T) model.Script {
	t.Helper()
	sc := waitScript(t, 1)
	s2 := sc.Steps[0]
	s2.ID, s2.Ref = "s2", "n2"
	sc.Steps = append(sc.Steps, s2)
	sc.Edges = []model.Edge{{ID: "e1", From: "s1", Port: model.PortSuccess, To: "s2"}}
	return sc
}

func TestStopAtTraceSeed(t *testing.T) {
	m, _, _ := testManager(t)
	id, err := m.Start(twoWaits(t), nil, Options{Source: SourceAI, StopAt: "s1"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := m.Wait(context.Background(), id); err != nil {
		t.Fatal(err)
	}
	tr, err := m.Trace(id)
	if err != nil {
		t.Fatal(err)
	}
	if !tr.Reached || tr.State != StateSuccess || len(tr.Results) != 1 || tr.Results[0].NodeID != "s1" {
		t.Fatalf("trace = %+v", tr)
	}

	id2, err := m.Start(twoWaits(t), nil, Options{Source: SourceAI, From: "s2", SeedRun: id})
	if err != nil {
		t.Fatal(err)
	}
	m.Wait(context.Background(), id2)
	tr, _ = m.Trace(id2)
	if len(tr.Results) != 1 || tr.Results[0].NodeID != "s2" || tr.Reached {
		t.Errorf("chạy tiếp = %+v", tr)
	}

	if _, err := m.Start(twoWaits(t), nil, Options{StopAt: "n9"}); err == nil {
		t.Error("StopAt node không có mà không báo lỗi")
	}
	if _, err := m.Start(twoWaits(t), nil, Options{SeedRun: "khong-co"}); err == nil {
		t.Error("SeedRun không có mà không báo lỗi")
	}
}

// Lượt AI / chạy tiếp (57 B1, B2): Stage chạy trước node đầu, chạy tiếp từ node lỗi thì kèm cửa sổ đang ở trước lúc lỗi;
// Stage lỗi = lần chạy lỗi. Người dùng bấm Chạy trong app thì không gọi (frontend tự thu thanh mini).
func TestStageFocus(t *testing.T) {
	m, _, _ := testManager(t)
	var got []*model.WindowInfo
	m.deps.Stage = func(f *model.WindowInfo) error {
		got = append(got, f)
		return nil
	}
	m.Wait(context.Background(), mustStart(t, m, waitScript(t, 1), Options{Source: SourceUser}))
	id := mustStart(t, m, waitScript(t, 1), Options{Source: SourceAI})
	m.Wait(context.Background(), id)
	if len(got) != 1 || got[0] != nil {
		t.Fatalf("Stage = %v, muốn một lần (lượt AI) không kèm cửa sổ", got)
	}

	m.mu.Lock() // giả lần chạy id lỗi ở s1 khi Chrome đang ở trước
	r := m.runs[id]
	r.status.FailedStep = "s1"
	r.carry.Results["s1"] = model.StepResult{NodeID: "s1", Error: &model.StepError{Code: model.ErrTimeout,
		Detail: map[string]any{"context": map[string]any{"foreground": map[string]any{"app": "Google Chrome", "title": "Messenger"}}}}}
	m.mu.Unlock()
	m.Wait(context.Background(), mustStart(t, m, waitScript(t, 1), Options{Source: SourceAI, From: "s1", SeedRun: id}))
	if len(got) != 2 || got[1] == nil || got[1].App != "Google Chrome" || got[1].Title != "Messenger" {
		t.Fatalf("chạy tiếp: Stage = %+v", got[len(got)-1])
	}

	m.deps.Stage = func(*model.WindowInfo) error { return errors.New("cửa sổ \"Google Chrome\" đã đóng") }
	if st, _ := m.Wait(context.Background(), mustStart(t, m, waitScript(t, 1), Options{Source: SourceAI})); st.State != StateFail {
		t.Errorf("Stage lỗi mà lần chạy %s", st.State)
	}
}
