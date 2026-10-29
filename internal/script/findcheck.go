package script

import (
	"path/filepath"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Kiểm tra trước khi chạy của node tự tìm ảnh mẫu / chữ / phần tử: Chờ ảnh, Click theo ảnh tự tìm, Tìm tất cả (42 G3).

// checkFindWait – chỗ thứ mấy + thời gian chờ của node tự tìm chữ / phần tử.
func checkFindWait(i int, s model.Step) error {
	if s.Occurrence < 0 {
		return stepErr(i, s, "occurrence", "chỗ thứ mấy phải ≥ 1")
	}
	if s.TimeoutMs <= 0 || s.IntervalMs <= 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
	}
	return nil
}

// checkImageStep: bước chờ ảnh / click theo ảnh tự tìm có ảnh mẫu đọc được (hoặc chữ / cách tìm phần tử) và thông số hợp lệ.
func checkImageStep(i int, s model.Step) error {
	switch s.FindBy {
	case model.FindByElement:
		return checkElementFind(i, s)
	case model.FindByText:
		if strings.TrimSpace(s.FindText) == "" {
			return stepErr(i, s, "findText", "chưa nhập chữ cần tìm")
		}
		return checkFindWait(i, s)
	case model.FindByAI:
		if s.Type == model.StepFindAll {
			return stepErr(i, s, "findBy", "Tìm tất cả chưa tìm bằng AI được – dùng ảnh / chữ / phần tử")
		}
		if strings.TrimSpace(s.FindText) == "" {
			return stepErr(i, s, "findText", "chưa mô tả phần tử cho AI tìm")
		}
		return checkFindWait(i, s)
	}
	if s.Template == "" {
		return stepErr(i, s, "template", "chưa có ảnh mẫu – bấm “Khoanh ảnh mẫu”")
	}
	img, err := vision.DecodePNG(s.Template)
	if err != nil {
		return stepErr(i, s, "template", "%v", err)
	}
	if b := img.Bounds(); b.Dx() < 4 || b.Dy() < 4 {
		return stepErr(i, s, "template", "ảnh mẫu quá nhỏ (%d × %d px)", b.Dx(), b.Dy())
	}
	if s.Threshold < 1 || s.Threshold > 100 {
		return stepErr(i, s, "threshold", "độ khớp tối thiểu phải trong 1–100%%")
	}
	if s.TimeoutMs <= 0 || s.IntervalMs <= 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
	}
	return nil
}

// checkFindAll – như checkImageStep + khoảng số chỗ (minCount 0 = 1, maxCount 0 = không giới hạn).
func checkFindAll(i int, s model.Step) error {
	if err := checkImageStep(i, s); err != nil {
		return err
	}
	if lo := max(s.MinCount, 1); s.MaxCount > 0 && s.MaxCount < lo {
		return stepErr(i, s, "maxCount", "số chỗ tối đa (%d) nhỏ hơn tối thiểu (%d)", s.MaxCount, lo)
	}
	return nil
}

// checkWaitDownload – node Chờ tải xong: mẫu tên file (nếu không có biến) đúng cú pháp glob, thời gian chờ > 0.
func checkWaitDownload(i int, s model.Step) error {
	if s.TimeoutMs <= 0 || s.IntervalMs <= 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
	}
	if p := s.FilePattern; p != "" && !strings.Contains(p, "{{") {
		if _, err := filepath.Match(p, ""); err != nil {
			return stepErr(i, s, "filePattern", "mẫu tên file sai cú pháp: %v", err)
		}
	}
	return nil
}
