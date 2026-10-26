package script

import (
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"ghosthand/internal/model"
)

// Kiểm tra node Cửa sổ + Ứng dụng (bước 26).

// checkWindow – miền giá trị khi mở file.
func checkWindow(s model.Step) error {
	if !slices.Contains(model.WinOps, s.WinOp) {
		return fmt.Errorf("thao tác cửa sổ không hợp lệ: %q (trống = focus | waitOpen | waitClose | setBounds | minimize | maximize | restore | close | read)", s.WinOp)
	}
	if !slices.Contains(model.NameMatches, s.WinMatch) {
		return fmt.Errorf("cách so tên không hợp lệ: %q (trống = chứa | exact | regex)", s.WinMatch)
	}
	if !slices.Contains(model.WinPresets, s.WinPreset) {
		return fmt.Errorf("khung đặt sẵn không hợp lệ: %q (trống = theo winRect | center | left | right | full)", s.WinPreset)
	}
	if s.Display < 0 {
		return errors.New("số thứ tự màn hình không được âm")
	}
	return nil
}

// validateWindow – đủ dữ liệu để chạy: phải chọn app hoặc tiêu đề (cả hai trống dễ focus / đóng nhầm cửa sổ).
func validateWindow(i int, s model.Step) error {
	if strings.TrimSpace(s.WinApp) == "" && strings.TrimSpace(s.WinTitle) == "" {
		return stepErr(i, s, "winApp", "chưa chọn cửa sổ – nhập tên app hoặc tiêu đề")
	}
	if s.WinMatch == model.MatchRegex {
		for _, f := range []struct{ name, v string }{{"winApp", s.WinApp}, {"winTitle", s.WinTitle}} {
			if err := checkRegex(i, s, f.name, f.v); err != nil {
				return err
			}
		}
	}
	if s.WinOp == model.WinSetBounds {
		r := s.WinRect
		if s.WinPreset == model.PresetRect && (r == nil || r.W <= 0 || r.H <= 0) {
			return stepErr(i, s, "winRect", "chưa nhập khung cửa sổ (rộng, cao > 0)")
		}
		if r != nil && (r.W < 0 || r.H < 0) {
			return stepErr(i, s, "winRect", "cỡ cửa sổ không được âm")
		}
	}
	if s.TimeoutMs < 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ không được âm")
	}
	return nil
}

// checkRegex – mẫu regex v của trường field cú pháp đúng (có biến: kiểm lúc chạy).
func checkRegex(i int, s model.Step, field, v string) error {
	if strings.Contains(v, "{{") {
		return nil
	}
	if _, err := regexp.Compile(v); err != nil {
		return stepErr(i, s, field, "mẫu regex không hợp lệ: %v", err)
	}
	return nil
}

func checkApp(s model.Step) error {
	if !slices.Contains(model.AppOps, s.AppOp) {
		return fmt.Errorf("thao tác ứng dụng không hợp lệ: %q (trống = kiểm tra | waitStart | waitQuit | quit | forceQuit)", s.AppOp)
	}
	if !slices.Contains(model.NameMatches, s.AppMatch) {
		return fmt.Errorf("cách so tên không hợp lệ: %q (trống = chứa | exact | regex)", s.AppMatch)
	}
	return nil
}

// validateApp – có tên app; thoát app hệ thống / ghosthand bị chặn (lúc chạy chặn thêm theo tiến trình khớp).
func validateApp(i int, s model.Step) error {
	name := strings.TrimSpace(s.AppName)
	if name == "" {
		return stepErr(i, s, "appName", "chưa nhập tên app")
	}
	if s.AppMatch == model.MatchRegex {
		if err := checkRegex(i, s, "appName", name); err != nil {
			return err
		}
	}
	if (s.AppOp == model.AppQuit || s.AppOp == model.AppForceQuit) && model.ProtectedApp(name) {
		return stepErr(i, s, "appName", "không thoát được %s (app hệ thống / ghosthand)", name)
	}
	if s.TimeoutMs < 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ không được âm")
	}
	return nil
}

// validateGuard – node chuột / phím đặt onlyInWindow: phải chọn cửa sổ đích (46 C2), loại node khác không có công tắc này.
func validateGuard(i int, s model.Step) error {
	switch s.Type {
	case model.StepClick, model.StepDouble, model.StepHold, model.StepDrag, model.StepScroll, model.StepPath, model.StepText, model.StepKey:
	default:
		return stepErr(i, s, "onlyInWindow", "loại node này không có công tắc onlyInWindow (chỉ chuột / phím)")
	}
	if !slices.Contains(model.NameMatches, s.WinMatch) {
		return stepErr(i, s, "winMatch", "cách so tên không hợp lệ: %q (trống = chứa | exact | regex)", s.WinMatch)
	}
	return validateWindow(i, s)
}
