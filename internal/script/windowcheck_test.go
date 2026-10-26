package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestValidateGuard(t *testing.T) {
	click := func(f func(s *model.Step)) model.Script {
		s := model.Step{ID: "a", Ref: "n1", Type: model.StepClick, Enabled: true, Points: []model.Point{{X: 1, Y: 1}}, OnlyInWindow: true, WinApp: "chrome"}
		f(&s)
		return model.Script{Steps: []model.Step{s}, Start: "a"}
	}
	screen := model.Rect{W: 1920, H: 1080}
	if err := ValidateScript(click(func(*model.Step) {}), screen); err != nil {
		t.Errorf("hợp lệ mà lỗi: %v", err)
	}
	if err := ValidateScript(click(func(s *model.Step) { s.WinApp = "" }), screen); err == nil {
		t.Error("chưa chọn cửa sổ phải lỗi")
	}
	if err := ValidateScript(click(func(s *model.Step) { s.WinMatch = "bậy" }), screen); err == nil {
		t.Error("winMatch sai phải lỗi")
	}
}
