package script

import (
	"errors"
	"fmt"
	"slices"

	"ghosthand/internal/model"
)

// Kiểm tra node có vùng chụp: Chụp màn hình (bước 35 N1), Chờ màn hình (42 G1), Đọc chữ vùng (28 R1) – dùng chung ShotArea / Display / ShotRect.
// Vùng theo node (ShotNode): nguồn kiểm tra ở validateFlow.

// checkShot – miền giá trị khi mở file.
func checkShot(s *model.Step) error {
	if s.Type == model.StepWaitScreen && !slices.Contains(model.WaitModes, s.WaitMode) {
		return fmt.Errorf("cách chờ màn hình không hợp lệ: %q (trống = đứng yên | change)", s.WaitMode)
	}
	if s.StableMs < 0 || s.DiffPct < 0 || s.DiffPct > 100 {
		return errors.New("thời gian đứng yên không được âm, ngưỡng thay đổi phải trong 0–100 %")
	}
	if !slices.Contains(model.ShotAreas, s.ShotArea) {
		return fmt.Errorf("vùng chụp không hợp lệ: %q (trống = vùng của kịch bản | screen | rect | node)", s.ShotArea)
	}
	if s.Display < 0 {
		return errors.New("số thứ tự màn hình không được âm")
	}
	return nil
}

// validateShot – đủ dữ liệu để chạy.
func validateShot(i int, s model.Step) error {
	if r := s.ShotRect; s.ShotArea == model.ShotRect && (r == nil || r.W <= 0 || r.H <= 0) {
		return stepErr(i, s, "shotRect", "chưa chọn vùng chụp")
	}
	if (s.Type == model.StepWaitScreen || s.Type == model.StepOcrRead) && (s.TimeoutMs <= 0 || s.IntervalMs <= 0) {
		return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
	}
	return nil
}
