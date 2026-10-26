package engine

import (
	"fmt"

	"ghosthand/internal/model"
)

// windowMismatchErr – node đặt OnlyInWindow nhưng cửa sổ đích mất hoặc không ở trước (46 C2).
type windowMismatchErr struct{ msg string }

func (e *windowMismatchErr) Error() string { return e.msg }

// guardedTypes – node chuột / phím có công tắc OnlyInWindow (khớp script.VarFields, frontend flow/windowGuard.ts).
var guardedTypes = map[string]bool{model.StepClick: true, model.StepDouble: true, model.StepHold: true, model.StepDrag: true,
	model.StepScroll: true, model.StepPath: true, model.StepText: true, model.StepKey: true}

// guardWindow chặn thao tác khi cửa sổ khớp WinApp + WinTitle không phải cửa sổ đang ở trước. Chưa thao tác gì
// trước khi từ chối – input không bao giờ gõ / bấm nhầm sang app khác. Không đọc được danh sách cửa sổ cũng từ chối.
func (e *Engine) guardWindow(s model.Step) error {
	if !s.OnlyInWindow || !guardedTypes[s.Type] {
		return nil
	}
	wins, err := e.wins.List()
	if err != nil {
		return fmt.Errorf("không kiểm tra được cửa sổ đang ở trước (%w) – node đặt chỉ thao tác trong cửa sổ đã chọn", err)
	}
	i, err := model.MatchWindow(wins, s.WinApp, s.WinTitle, s.WinMatch)
	if err != nil {
		return &invalidErr{err.Error()}
	}
	want := windowLabel(s)
	front, hasFront := foreground(wins)
	if i < 0 {
		return &windowMismatchErr{fmt.Sprintf("không thấy cửa sổ %s (đã đóng hoặc chưa mở)%s – chưa thao tác gì", want, frontNote(front, hasFront))}
	}
	if !hasFront || wins[i].ID != front.ID {
		return &windowMismatchErr{fmt.Sprintf("cửa sổ %s không ở trước%s – chưa thao tác gì; thêm node Cửa sổ (focus) trước node này", want, frontNote(front, hasFront))}
	}
	return nil
}

func windowLabel(s model.Step) string {
	switch {
	case s.WinApp != "" && s.WinTitle != "":
		return fmt.Sprintf("%q · %q", s.WinApp, s.WinTitle)
	case s.WinApp != "":
		return fmt.Sprintf("%q", s.WinApp)
	}
	return fmt.Sprintf("%q", s.WinTitle)
}

func frontNote(w model.WindowInfo, ok bool) string {
	if !ok {
		return ""
	}
	return fmt.Sprintf(" (đang ở trước: %s – %q)", w.App, w.Title)
}
