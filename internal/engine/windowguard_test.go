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
