package app

import (
	"context"
	"image"
	"path/filepath"
	"testing"
	"time"

	"ghosthand/internal/batch"
	"ghosthand/internal/device"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// batchApp – App chỉ có phiên chạy thật với chuột / phím giả.
func batchApp() *App {
	in := &devicetest.FakeInput{}
	return &App{sess: session.New(nil, session.Deps{
		Input:       func() device.Input { return in },
		Screen:      func() model.Rect { return model.Rect{W: 1920, H: 1080} },
		Displays:    func() []model.Rect { return []model.Rect{{W: 1920, H: 1080}} },
		AllowDanger: func(model.Script, string, string) (bool, error) { return false, nil },
		Browser:     func(func(x, y int) error) (web.Browser, func(), error) { return nil, func() {}, nil },
		Corners:     func(context.Context, *device.TrackingInput, func()) {},
		Touch:       func(context.Context, *device.TrackingInput, func() bool, func()) {},
		SaveRun:     func(model.RunRecord, string, map[string]image.Image) error { panic("lượt test không được ghi lịch sử") },
	})}
}

func writeScript(t *testing.T, dir, name string, steps ...model.Step) string {
	t.Helper()
	sc := scripttest.Linear(model.Script{Name: name, Loops: 1, Steps: steps})
	p := filepath.Join(dir, name+".json")
	if err := store.WriteScriptFile(p, sc); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestBatchRun(t *testing.T) {
	dir := t.TempDir()
	wait := modeltest.Node("s1", "n1", model.StepWait, func(s *model.Step) { s.DelayAfter = 1 })
	writeScript(t, dir, "a-ok", wait)
	// n2 dùng biến của node chạy sau nó → lỗi lúc chạy ở n2
	writeScript(t, dir, "b-loi", wait, modeltest.Node("s2", "n2", model.StepText, func(s *model.Step) { s.Text = "{{n3.status}}" }), modeltest.Node("s3", "n3", model.StepWait, nil))
	writeScript(t, dir, "c-ok", wait)
	a := batchApp()
	b, items, err := a.startBatch(batch.Request{Targets: []string{dir}}, batchOpt{source: session.SourceCLI, stopBy: session.StopByAPI})
	if err != nil || len(items) != 3 {
		t.Fatalf("%v %v", items, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	st := b.Wait(ctx)
	if st.State != batch.StateDone || len(st.Rows) != 3 || st.Failed() != 1 {
		t.Fatalf("lỗi một kịch bản vẫn chạy tiếp: %+v", st)
	}
	if r := st.Rows[1]; r.Name != "b-loi" || r.State != batch.RowFail || r.Node != "n2" || r.Code == "" || r.RunID == "" {
		t.Errorf("dòng lỗi phải có mã + node + runId: %+v", r)
	}
	if got, _ := a.batchByID(""); got != b {
		t.Error("id trống = lượt mới nhất")
	}
}

func TestBatchUserStopAndBusy(t *testing.T) {
	dir := t.TempDir()
	long := modeltest.Node("s1", "n1", model.StepWait, func(s *model.Step) { s.DelayAfter = 5000 })
	writeScript(t, dir, "a", long)
	writeScript(t, dir, "b", long)
	a := batchApp()
	b, _, err := a.startBatch(batch.Request{Targets: []string{dir}}, batchOpt{source: session.SourceCLI, stopBy: session.StopByAPI})
	if err != nil {
		t.Fatal(err)
	}
	for a.sess.Running() == "" {
		time.Sleep(5 * time.Millisecond)
	}
	if _, _, err := a.startBatch(batch.Request{Targets: []string{dir}}, batchOpt{}); err == nil {
		t.Error("đang có lượt phải báo bận")
	}
	a.sess.StopWith(session.StopByF8) // người dùng bấm F8 → dừng cả lượt, không chạy b
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if st := b.Wait(ctx); st.State != batch.StateStopped || len(st.Rows) != 1 || st.Rows[0].State != batch.RowStopped {
		t.Fatalf("%+v", st)
	}
}
