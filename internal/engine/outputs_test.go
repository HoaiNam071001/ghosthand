package engine

import (
	"context"
	"testing"
	"time"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

func fakeWins() *devicetest.FakeWindows {
	return &devicetest.FakeWindows{Wins: []model.WindowInfo{
		{ID: 1, Title: "Đã thu nhỏ", App: "zalo", Minimized: true},
		{ID: 2, Title: "Sân thử – Google Chrome", App: "chrome"},
	}}
}

// Click / gõ / phím: output có cửa sổ đang ở trước sau thao tác (bỏ cửa sổ thu nhỏ).
func TestActionFocusOutput(t *testing.T) {
	for _, n := range []model.Step{
		modeltest.Node("a", "n1", model.StepClick, func(s *model.Step) { s.Points = []model.Point{{X: 1, Y: 2}} }),
		modeltest.Node("a", "n1", model.StepText, func(s *model.Step) { s.Text = "chào" }),
		modeltest.Node("a", "n1", model.StepKey, func(s *model.Step) { s.Keys = []string{"enter"} }),
	} {
		e := newEngine(&devicetest.FakeInput{}, model.Script{Loops: 1, Start: "a", Steps: []model.Step{n}}, nil)
		e.wins = fakeWins()
		e.pasteAuto, e.imeCheck = false, false
		if err := e.Run(context.Background()); err != nil {
			t.Fatalf("%s: %v", n.Type, err)
		}
		if o := e.results["a"].Output; o["window"] != "Sân thử – Google Chrome" || o["windowApp"] != "chrome" {
			t.Errorf("%s: output %v", n.Type, o)
		}
	}
}

// Thanh mini của chính app nổi trên cùng lúc chạy (macOS còn liệt kê) – output vẫn ghi cửa sổ thật ở dưới.
func TestFocusOutputSkipsSelf(t *testing.T) {
	ws := append([]model.WindowInfo{{ID: 7, Title: "Ghosthand", App: "ghosthand", PID: selfPID}}, fakeWins().Wins...)
	if w, _ := foreground(ws); w.ID != 2 {
		t.Errorf("foreground = %+v, muốn Chrome", w)
	}
	if w, ok := newWindow(ws, map[uint64]bool{2: true}); ok {
		t.Errorf("newWindow = %+v, muốn không có (chỉ cửa sổ của app mới hiện)", w)
	}
}

// Mở: dò cửa sổ mới trong lúc chờ DelayAfter; tổng thời gian vẫn đúng DelayAfter (không chờ hai lần).
func TestOpenNewWindowOutput(t *testing.T) {
	run := func(appear bool) (map[string]any, time.Duration) {
		fw := fakeWins()
		n := modeltest.Node("a", "n1", model.StepOpen, func(s *model.Step) { s.Target, s.DelayAfter = "notepad", 600 })
		e := newEngine(&devicetest.FakeInput{}, model.Script{Loops: 1, Start: "a", Steps: []model.Step{n}}, nil)
		e.wins = fw
		e.open = func(string, string) error {
			if appear {
				go func() {
					time.Sleep(250 * time.Millisecond)
					fw.Show(model.WindowInfo{ID: 9, Title: "Untitled - Notepad", App: "notepad"})
				}()
			}
			return nil
		}
		start := time.Now()
		if err := e.Run(context.Background()); err != nil {
			t.Fatal(err)
		}
		return e.results["a"].Output, time.Since(start)
	}
	o, d := run(true)
	if o["window"] != "Untitled - Notepad" || o["windowApp"] != "notepad" || o["newWindow"] != true || d < 550*time.Millisecond || d > 900*time.Millisecond {
		t.Errorf("có cửa sổ mới: output %v sau %v", o, d)
	}
	o, d = run(false)
	if o["window"] != "Sân thử – Google Chrome" || o["newWindow"] != false || d < 550*time.Millisecond || d > 900*time.Millisecond {
		t.Errorf("không có cửa sổ mới: output %v sau %v", o, d)
	}
}
