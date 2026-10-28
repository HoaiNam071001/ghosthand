package script

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"ghosthand/internal/launch"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// ValidateScript kiểm tra kịch bản (đã áp input) trước khi chạy để không dừng giữa chừng vì dữ liệu sai.
// Lỗi là *ScriptError (bước / trường) để UI và AI biết chỗ sửa.
// screen: khung màn hình khi Region = nil; W = 0 thì bỏ qua kiểm tra điểm nằm trong vùng (không biết màn hình).
func ValidateScript(sc model.Script, screen model.Rect) error {
	if err := validateFlow(sc); err != nil {
		return err
	}
	b := Bounds(sc, screen)
	inside := func(p model.Point) bool {
		q := ResolvePoint(p, b)
		return b.W == 0 || q.X >= b.X && q.X <= b.X+b.W && q.Y >= b.Y && q.Y <= b.Y+b.H
	}
	// Node absolute: toạ độ màn hình thật, kiểm tra trong khung màn hình (không cộng gốc vùng).
	insideStep := func(s model.Step, p model.Point) bool {
		if s.CoordSpace != CoordAbsolute {
			return inside(p)
		}
		sb := StepBounds(sc, screen, s)
		return sb.W == 0 || p.X >= 0 && p.X <= sb.W && p.Y >= 0 && p.Y <= sb.H
	}
	enabled := 0
	for i, s := range sc.Steps {
		if !s.Enabled {
			continue
		}
		s = withNumVarPlaceholders(s)
		enabled++
		if s.OnlyInWindow {
			if err := validateGuard(i, s); err != nil {
				return err
			}
		}
		need := 0
		switch s.Type {
		case model.StepClick, model.StepDouble, model.StepHold:
			need = 1
		case model.StepDrag:
			need = 2
		case model.StepScroll:
			need = min(len(s.Points), 1) // có điểm thì điểm phải trong vùng
			if !slices.Contains(model.ScrollDirections, s.Direction) {
				return stepErr(i, s, "direction", "hướng cuộn không hợp lệ %q", s.Direction)
			}
			if s.Amount < 1 {
				return stepErr(i, s, "amount", "số nấc cuộn phải ≥ 1")
			}
		case model.StepOpen:
			if strings.TrimSpace(s.Target) == "" || s.Target == "https://" {
				return stepErr(i, s, "target", "chưa nhập URL / app cần mở")
			}
			if s.WebBrowser && launch.TargetKind(s.Target) == launch.TargetApp {
				return stepErr(i, s, "target", "Chrome của app chỉ mở được URL / file, không mở được app “%s”", s.Target)
			}
		case model.StepHTTP:
			if err := checkHTTPStep(i, s); err != nil {
				return err
			}
		case model.StepWaitUntil:
			if strings.TrimSpace(s.At) == "" {
				return stepErr(i, s, "at", "chưa nhập giờ cần chờ")
			}
			if !strings.Contains(s.At, "{{") {
				if _, _, err := ParseAt(s.At, time.Now()); err != nil {
					return stepErr(i, s, "at", "%v", err)
				}
			}
		case model.StepPath:
			need = 1 // hình: tâm trong vùng; đường gấp khúc: mọi điểm trong vùng
			if s.Shape == "" {
				if len(s.Points) < 2 {
					return stepErr(i, s, "points", "đường vẽ cần ít nhất 2 điểm")
				}
				need = len(s.Points)
			}
			if s.Shape != "" && s.ShapeW < 4 {
				return stepErr(i, s, "shapeW", "hình quá nhỏ – rộng tối thiểu 4 px")
			}
			if s.DragMs <= 0 {
				return stepErr(i, s, "dragMs", "thời gian vẽ phải > 0")
			}
		case model.StepSystem: // check.go đã kiểm thao tác + mức 0–100
		case model.StepFile:
			if err := checkFileStep(i, s); err != nil {
				return err
			}
		case model.StepWindow:
			if err := validateWindow(i, s); err != nil {
				return err
			}
		case model.StepApp:
			if err := validateApp(i, s); err != nil {
				return err
			}
		case model.StepBrowserTab, model.StepBrowserGo, model.StepBrowserNorm, model.StepSavePdf:
			if err := validateTab(i, s); err != nil {
				return err
			}
		case model.StepClipboard:
			if s.ClipOp == model.ClipImage && strings.TrimSpace(s.FilePath) == "" {
				return stepErr(i, s, "filePath", "chưa nhập file ảnh cần chép")
			}
		case model.StepScreenshot, model.StepWaitScreen:
			if err := validateShot(i, s); err != nil {
				return err
			}
		case model.StepWaitImage, model.StepClickImage:
			// click theo chỗ node khác thấy: nguồn đã kiểm tra ở validateFlow
			if s.Type == model.StepWaitImage || s.ImageSource == model.ImageFromSearch {
				if err := checkImageStep(i, s); err != nil {
					return err
				}
			}
		case model.StepFindAll:
			if err := checkFindAll(i, s); err != nil {
				return err
			}
		case model.StepWebWait, model.StepWebClick, model.StepWebType, model.StepWebRead, model.StepWebScroll:
			if err := checkWebStep(i, s); err != nil {
				return err
			}
		case model.StepPageText, model.StepReadDocument:
			if err := checkPageText(i, s); err != nil {
				return err
			}
		case model.StepSysInfo:
		case model.StepInputSource:
			if s.InputOp == model.InputSet && strings.TrimSpace(s.InputLayout) == "" {
				return stepErr(i, s, "inputLayout", "chưa nhập bộ gõ cần đổi sang")
			}
		case model.StepZip:
			if err := validateZip(i, s); err != nil {
				return err
			}
		case model.StepProcess:
			if err := validateProcess(i, s); err != nil {
				return err
			}
		case model.StepPower:
		case model.StepDisplay:
			if err := validateDisplay(i, s); err != nil {
				return err
			}
		case model.StepNotify:
			if strings.TrimSpace(s.NotifyTitle) == "" && strings.TrimSpace(s.Text) == "" {
				return stepErr(i, s, "text", "chưa nhập nội dung thông báo")
			}
		case model.StepAskAI:
			if err := validateAskAI(i, s); err != nil {
				return err
			}
		case model.StepOSShortcut:
			if strings.TrimSpace(s.ShortcutName) == "" {
				return stepErr(i, s, "shortcutName", "chưa nhập tên Shortcut")
			}
		case model.StepShell:
			if err := validateShell(i, s); err != nil {
				return err
			}
		case model.StepWaitDownload:
			if err := checkWaitDownload(i, s); err != nil {
				return err
			}
		case model.StepReadTable:
			if err := checkPageText(i, s); err != nil {
				return err
			}
			if err := checkTableFile(i, s); err != nil {
				return err
			}
		case model.StepWaitUIEvent:
			if err := checkWaitUIEvent(i, s); err != nil {
				return err
			}
		case model.StepElementAction:
			if err := checkElementAction(i, s); err != nil {
				return err
			}
		case model.StepElementRead:
			if err := checkElementRead(i, s); err != nil {
				return err
			}
		case model.StepWaitPixel:
			need = 1
			if _, err := vision.ParseColor(s.Color); err != nil {
				return stepErr(i, s, "color", "%v", err)
			}
			if s.Tolerance < 0 || s.Tolerance > 255 {
				return stepErr(i, s, "tolerance", "sai số màu phải trong 0–255")
			}
			if s.TimeoutMs <= 0 || s.IntervalMs <= 0 {
				return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
			}
		case model.StepWait:
		case model.StepText:
			if s.Text == "" {
				return stepErr(i, s, "text", "chưa nhập nội dung gõ")
			}
		case model.StepKey:
			if len(s.Keys) == 0 {
				return stepErr(i, s, "keys", "chưa chọn phím")
			}
		case model.StepWebKey:
			if err := checkWebKey(i, s); err != nil {
				return err
			}
		case model.StepIf, model.StepSwitch, model.StepSwitchScreen, model.StepCounter, model.StepForEach, model.StepEnd, model.StepSetVar, model.StepCalc,
			model.StepTextMatch, model.StepTextSplit, model.StepTextClean, model.StepTextNumber:
			if err := validateControl(i, s, inside); err != nil {
				return err
			}
		default:
			return stepErr(i, s, "type", "loại bước không hợp lệ %q", s.Type)
		}
		if len(s.Points) < need {
			return stepErr(i, s, "points", "cần %d điểm, mới có %d", need, len(s.Points))
		}
		for j := 0; j < need; j++ {
			skip := s.Type == model.StepDrag && (j == 0 && s.DragFromPrev || j == 1 && s.DragRelative)
			if !skip && !insideStep(s, s.Points[j]) {
				q := ResolvePoint(s.Points[j], StepBounds(sc, screen, s))
				return stepErr(i, s, "points", "điểm X %d Y %d nằm ngoài vùng%s", q.X, q.Y, outsideHint(s, b))
			}
		}
		if r := s.Retry; r != nil && (r.Count < 0 || r.Count > model.MaxRetries || r.DelayMs < 0) {
			return stepErr(i, s, "retry", "số lần thử lại phải trong 0–%d", model.MaxRetries)
		}
	}
	if enabled == 0 {
		return &model.ScriptError{Msg: "kịch bản không có node nào được bật"}
	}
	return nil
}

// outsideHint nêu gốc toạ độ đang cộng để dễ thấy nhầm vùng / màn hình (toạ độ AI lấy từ screenshot là tuyệt đối).
func outsideHint(s model.Step, b model.Rect) string {
	if s.CoordSpace == CoordAbsolute {
		return " (toạ độ tuyệt đối trên màn hình, gốc 0,0)"
	}
	return fmt.Sprintf(" (toạ độ đã cộng gốc vùng %d,%d; muốn dùng toạ độ màn hình như ảnh screenshot thì đặt coordSpace \"absolute\")", b.X, b.Y)
}

// checkWebKey – node webKey: có phím, mọi phím / phím kèm bấm được qua CDP.
func checkWebKey(i int, s model.Step) error {
	if len(s.Keys) == 0 {
		return stepErr(i, s, "keys", "chưa chọn phím")
	}
	for _, k := range s.Keys {
		if err := web.CheckKey(k, false); err != nil {
			return stepErr(i, s, "keys", "%v", err)
		}
	}
	for _, m := range s.Modifiers {
		if err := web.CheckKey(m, true); err != nil {
			return stepErr(i, s, "modifiers", "%v", err)
		}
	}
	return nil
}

// checkWebStep: node web có ít nhất một selector, mọi dòng đọc được (dòng trống bỏ qua) và thời gian chờ hợp lệ.
func checkWebStep(i int, s model.Step) error {
	n, err := checkSelectors(i, s, "selectors", s.Selectors)
	if err != nil {
		return err
	}
	if n == 0 {
		return stepErr(i, s, "selectors", "chưa nhập cách tìm phần tử (vd text=Xem lịch sử)")
	}
	if s.Occurrence < 0 {
		return stepErr(i, s, "occurrence", "chỗ thứ mấy phải ≥ 1")
	}
	if s.TimeoutMs <= 0 || s.IntervalMs <= 0 {
		return stepErr(i, s, "timeoutMs", "thời gian chờ tối đa / kiểm tra mỗi phải > 0")
	}
	switch s.Type {
	case model.StepWebType:
		if s.Text == "" && !s.WebClear && !s.WebEnter {
			return stepErr(i, s, "text", "chưa nhập nội dung gõ")
		}
	case model.StepWebRead:
		if s.ReadFrom == model.ReadAttr && strings.TrimSpace(s.Attr) == "" {
			return stepErr(i, s, "attr", "chưa nhập tên thuộc tính cần đọc (vd href)")
		}
	case model.StepWebScroll:
		if s.ScrollMode != "" {
			if !slices.Contains(model.ScrollDirections, s.Direction) {
				return stepErr(i, s, "direction", "hướng cuộn không hợp lệ %q", s.Direction)
			}
			if s.Amount < 1 {
				return stepErr(i, s, "amount", "số nấc cuộn phải ≥ 1")
			}
		}
		if s.ScrollMode == model.ScrollModeUntil {
			if _, err := checkSelectors(i, s, "scrollIn", s.ScrollIn); err != nil {
				return err
			}
		}
	}
	return nil
}

// checkSelectors – mỗi dòng không trống phải đúng dạng; trả số dòng có giá trị.
func checkSelectors(i int, s model.Step, field string, lines []string) (int, error) {
	n := 0
	for j, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		if _, err := model.ParseSelector(line); err != nil {
			return 0, stepErr(i, s, fmt.Sprintf("%s[%d]", field, j), "%v", err)
		}
		n++
	}
	return n, nil
}
