package engine

import (
	"errors"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

func guardStep(typ, app string) model.Step {
	return modeltest.Step(typ, func(s *model.Step) {
		s.OnlyInWindow, s.WinApp = true, app
		s.Points = []model.Point{{X: 10, Y: 10}}
		s.Text, s.Keys = "x", []string{"a"}
	})
}

func TestGuardWindow(t *testing.T) {
	e, fw := winEngine() // chrome ở trước, Zalo thu nhỏ
	var mm *windowMismatchErr
	for _, typ := range []string{model.StepClick, model.StepText, model.StepKey} {
		if err := e.guardWindow(guardStep(typ, "chrome")); err != nil {
			t.Errorf("%s: cửa sổ đúng ở trước mà bị chặn: %v", typ, err)
		}
	}
	if err := e.guardWindow(guardStep(model.StepClick, "zalo")); !errors.As(err, &mm) {
		t.Errorf("cửa sổ thu nhỏ: %v, muốn window_mismatch", err)
	} else if errCode(err) != model.ErrWindowMismatch {
		t.Errorf("mã lỗi %q", errCode(err))
	}
	if err := e.guardWindow(guardStep(model.StepClick, "notepad")); !errors.As(err, &mm) {
		t.Errorf("cửa sổ không có: %v", err)
	}
	_ = fw.Close(1) // Chrome mất
	if err := e.guardWindow(guardStep(model.StepText, "chrome")); !errors.As(err, &mm) {
		t.Errorf("cửa sổ đã đóng: %v", err)
	}
	off := guardStep(model.StepClick, "notepad")
	off.OnlyInWindow = false
	if err := e.guardWindow(off); err != nil {
		t.Errorf("không bật công tắc mà vẫn chặn: %v", err)
	}
}

// Bị chặn thì chưa động tới chuột / phím.
func TestGuardWindowNoInput(t *testing.T) {
	e, _ := winEngine()
	if _, err := e.runStep(t.Context(), guardStep(model.StepClick, "zalo"), 0); err == nil {
		t.Fatal("muốn lỗi window_mismatch")
	}
}

// 57 A1: thứ tự chồng có lúc lệch (VS Code đứng đầu khi Chrome đang nhận phím) – cờ Front của device thắng thứ tự.
func TestGuardWindowPrefersFront(t *testing.T) {
	e, fw := winEngine()
	code := model.WindowInfo{ID: 9, Title: "autoclicker", App: "Code", PID: 9, Box: model.Rect{W: 800, H: 600}}
	fw.Wins = append([]model.WindowInfo{code}, fw.Wins...)
	if err := e.guardWindow(guardStep(model.StepText, "chrome")); err == nil {
		t.Fatal("không có cờ Front: Code đứng đầu phải bị coi là ở trước")
	}
	if err := fw.Focus(1); err != nil {
		t.Fatal(err)
	}
	if err := e.guardWindow(guardStep(model.StepText, "chrome")); err != nil {
		t.Errorf("Chrome mang cờ Front mà bị chặn: %v", err)
	}
	if w, _ := foreground(fw.Wins); w.App != "chrome" {
		t.Errorf("foreground = %+v, muốn chrome", w)
	}
}

// Hai cửa sổ cùng app: cửa sổ đang ở trước khớp là cho qua, dù không đứng đầu danh sách.
func TestGuardWindowTwoSameApp(t *testing.T) {
	e, fw := winEngine()
	other := model.WindowInfo{ID: 5, Title: "Google Maps – Google Chrome", App: "chrome", PID: 10, Box: model.Rect{W: 800, H: 600}}
	fw.Wins = append([]model.WindowInfo{fw.Wins[0], other}, fw.Wins[1:]...)
	if err := fw.Focus(5); err != nil {
		t.Fatal(err)
	}
	if err := e.guardWindow(guardStep(model.StepText, "chrome")); err != nil {
		t.Errorf("cửa sổ Chrome thứ hai đang ở trước mà bị chặn: %v", err)
	}
}
