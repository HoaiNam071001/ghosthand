package script

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"ghosthand/internal/launch"
	"ghosthand/internal/model"
)

// Kiểm tra node Tab trình duyệt (bước 43 B1) + Đi tới URL (B2, chung cách chọn tab): miền giá trị (checkTab, lúc mở file) và dữ liệu đủ để chạy (validateTab).

func checkTab(s model.Step) error {
	if !slices.Contains(model.TabOps, s.TabOp) {
		return fmt.Errorf("thao tác tab không hợp lệ: %q (trống = đọc | list | switch | new | close | closeOthers | reload | back | forward | waitOpen | waitClose)", s.TabOp)
	}
	if !slices.Contains(model.Browsers, s.Browser) {
		return fmt.Errorf("trình duyệt không hỗ trợ: %q (trống = đang ở trước | chrome | edge | brave | coccoc)", s.Browser)
	}
	if !slices.Contains(model.NameMatches, s.TabMatch) {
		return fmt.Errorf("cách so tab không hợp lệ: %q (trống = chứa | exact | regex)", s.TabMatch)
	}
	if s.Type == model.StepBrowserNorm {
		if !slices.Contains(model.WinPresets, s.WinPreset) {
			return fmt.Errorf("khung đặt sẵn không hợp lệ: %q (trống = theo winRect | center | left | right | full)", s.WinPreset)
		}
		if s.Display < 0 {
			return errors.New("số thứ tự màn hình không được âm")
		}
	}
	return nil
}

// validateNorm – node Chuẩn hoá phải làm ít nhất một việc; đặt cỡ theo toạ độ cần đủ W, H. Đặt cỡ phải chọn đích
// (tab node Mở, hoặc trình duyệt + tab) – để trống thì lấy trình duyệt đang ở trước, dễ đổi cỡ nhầm cửa sổ người dùng (bước 61 M4).
func validateNorm(i int, s model.Step) error {
	switch r := s.WinRect; {
	case !s.NormZoom && !s.NormFullscreen && !s.NormSize && !s.NormPopups:
		return stepErr(i, s, "normZoom", "chưa chọn việc nào – bật ít nhất một mục chuẩn hoá")
	case s.NormSize && s.WinPreset == model.PresetRect && (r == nil || r.W <= 0 || r.H <= 0):
		return stepErr(i, s, "winRect", "chưa nhập cỡ cửa sổ")
	case s.NormSize && s.TabFrom == "" && s.Browser == "":
		return stepErr(i, s, "browser", "đặt cỡ cửa sổ cần chọn trình duyệt (hoặc tab node Mở) – không đổi cỡ trình duyệt đang ở trước")
	case s.NormSize && s.TabFrom == "" && strings.TrimSpace(s.Tab) == "":
		return stepErr(i, s, "tab", "đặt cỡ cửa sổ cần chọn tab theo tiêu đề / URL (hoặc tab node Mở) – không đổi cỡ tab đang hiện")
	}
	return nil
}

// validateTab – chờ tab cần chuỗi tìm; URL tab mới mở được bằng trình duyệt. Node Mở TabFrom kiểm ở validateTabFrom.
func validateTab(i int, s model.Step) error {
	tab := strings.TrimSpace(s.Tab)
	if s.Type == model.StepBrowserNorm {
		if err := validateNorm(i, s); err != nil {
			return err
		}
	}
	switch {
	case s.TabOp == model.TabWaitOpen && tab == "":
		return stepErr(i, s, "tab", "chưa nhập tiêu đề / URL tab cần chờ")
	case s.TabOp == model.TabWaitClose && tab == "" && s.TabFrom == "":
		return stepErr(i, s, "tab", "chưa nhập tiêu đề / URL tab cần chờ đóng (hoặc chọn node Mở)")
	case s.Type == model.StepSavePdf && s.TabOp != model.TabRead:
		return stepErr(i, s, "tabOp", "node Lưu PDF không có thao tác tab")
	case s.Type == model.StepSavePdf && strings.TrimSpace(s.FilePath) == "":
		return stepErr(i, s, "filePath", "chưa nhập nơi lưu file PDF")
	case s.Type == model.StepSavePdf && !strings.Contains(s.FilePath, "{{") && !strings.HasSuffix(strings.ToLower(strings.TrimSpace(s.FilePath)), ".pdf"):
		return stepErr(i, s, "filePath", "file lưu phải có đuôi .pdf")
	case s.Type == model.StepBrowserGo && s.TabOp != model.TabRead:
		return stepErr(i, s, "tabOp", "node Đi tới URL không có thao tác tab")
	case s.Type == model.StepBrowserGo && strings.TrimSpace(s.URL) == "":
		return stepErr(i, s, "url", "chưa nhập URL cần tới")
	case s.TabOp == model.TabNew || s.Type == model.StepBrowserGo:
		u := strings.TrimSpace(s.URL)
		if u != "" && !strings.Contains(u, "{{") && launch.BrowserURL(u) == "" {
			return stepErr(i, s, "url", "%q không phải URL / đường dẫn file mở được bằng trình duyệt", u)
		}
	}
	if s.TabMatch == model.MatchRegex && tab != "" {
		if err := checkRegex(i, s, "tab", tab); err != nil {
			return err
		}
	}
	if s.TimeoutMs < 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ không được âm")
	}
	return nil
}

// TabFromOps – thao tác làm được với tab của node Mở (TabFrom); đọc / liệt kê / mở tab mới thì không.
var TabFromOps = []string{model.TabRead, model.TabSwitch, model.TabClose, model.TabCloseOthers, model.TabReload, model.TabBack, model.TabForward, model.TabWaitClose}

// validateTabFrom – TabFrom trỏ node Mở còn trong kịch bản (idx: id → chỉ số node); Đi tới URL dùng được với mọi tab.
func validateTabFrom(sc model.Script, idx map[string]int, i int, s model.Step) error {
	if s.TabFrom == "" {
		return nil
	}
	j, ok := idx[s.TabFrom]
	switch {
	case !ok:
		return stepErr(i, s, "tabFrom", "node Mở không còn trong kịch bản – chọn lại")
	case sc.Steps[j].Type != model.StepOpen || sc.Steps[j].WebBrowser:
		return stepErr(i, s, "tabFrom", "node %s không phải node Mở bằng trình duyệt thường", sc.Steps[j].Ref)
	case s.Type == model.StepBrowserTab && !slices.Contains(TabFromOps, s.TabOp):
		return stepErr(i, s, "tabFrom", "thao tác này không dùng tab của node Mở – bỏ chọn node Mở")
	}
	return nil
}
