package script

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"ghosthand/internal/ai"
	"ghosthand/internal/inputsource"
	"ghosthand/internal/model"
)

// Kiểm tra kịch bản lúc mở file: giá trị trong miền hợp lệ, bổ sung phần trống, sửa ref / cạnh hỏng.

// checkScript kiểm tra giá trị nằm trong miền hợp lệ và bổ sung phần trống (slice nil, id / ref trùng, nút / cách bấm mặc định,
// cạnh trỏ node không còn) để frontend dùng ngay được. Không kiểm tra đủ flow – validateFlow làm lúc Chạy.
func checkScript(sc *model.Script) error {
	if sc.Loops < 0 || sc.MaxMinutes < 0 {
		return errors.New("số vòng / số phút không được âm")
	}
	if sc.Region != nil && (sc.Region.W <= 0 || sc.Region.H <= 0) {
		return errors.New("vùng có kích thước không hợp lệ")
	}
	if sc.AnchorMode != model.AnchorNearest && sc.AnchorMode != model.AnchorTopLeft {
		return fmt.Errorf("cách neo điểm không hợp lệ: %q", sc.AnchorMode)
	}
	if sc.Human != "" && !slices.Contains(model.HumanLevels, sc.Human) {
		return fmt.Errorf("mức giống người không hợp lệ: %q (off | low | medium | high)", sc.Human)
	}
	if sc.Steps == nil {
		sc.Steps = []model.Step{}
	}
	ids := map[string]bool{}
	n := 0
	for i := range sc.Steps {
		s := &sc.Steps[i]
		if err := checkStep(s); err != nil {
			return fmt.Errorf("bước %d: %w", i+1, err)
		}
		for s.ID == "" || ids[s.ID] { // id trống / trùng (sửa tay file) → đặt id mới
			n++
			s.ID = fmt.Sprintf("f%d", n)
		}
		ids[s.ID] = true
	}
	FixRefs(sc.Steps)
	checkEdges(sc, ids)
	return checkInputs(sc)
}

// FixRefs đặt ref cho node chưa có / trùng / sai dạng: n1, n2… (số nhỏ nhất chưa dùng).
func FixRefs(steps []model.Step) {
	used := map[string]bool{}
	bad := []int{}
	for i, s := range steps {
		if !model.ValidRef(s.Ref) || used[s.Ref] {
			bad = append(bad, i)
			continue
		}
		used[s.Ref] = true
	}
	n := 0
	for _, i := range bad {
		for n++; used[fmt.Sprintf("n%d", n)]; n++ {
		}
		steps[i].Ref = fmt.Sprintf("n%d", n)
		used[steps[i].Ref] = true
	}
}

// checkEdges bỏ cạnh hỏng (trỏ node không còn, thiếu cổng, trùng cổng – sửa tay file), đặt id cạnh trống / trùng;
// start trỏ node không còn thì bỏ trống.
func checkEdges(sc *model.Script, ids map[string]bool) {
	if sc.Edges == nil {
		sc.Edges = []model.Edge{}
	}
	out := sc.Edges[:0]
	seenPort := map[[2]string]bool{}
	seenID := map[string]bool{}
	n := 0
	for _, e := range sc.Edges {
		key := [2]string{e.From, e.Port}
		if !ids[e.From] || !ids[e.To] || e.Port == "" || seenPort[key] {
			continue
		}
		seenPort[key] = true
		for e.ID == "" || seenID[e.ID] {
			n++
			e.ID = fmt.Sprintf("e%d", n)
		}
		seenID[e.ID] = true
		out = append(out, e)
	}
	sc.Edges = out
	if !ids[sc.Start] {
		sc.Start = ""
	}
}

// checkWebFields – miền giá trị riêng của node web (D4).
func checkWebFields(s *model.Step) error {
	if s.ReadFrom != "" && s.ReadFrom != model.ReadValue && s.ReadFrom != model.ReadAttr {
		return fmt.Errorf("nguồn đọc không hợp lệ: %q", s.ReadFrom)
	}
	if s.ScrollMode != "" && s.ScrollMode != model.ScrollModeIn && s.ScrollMode != model.ScrollModeUntil {
		return fmt.Errorf("cách cuộn không hợp lệ: %q", s.ScrollMode)
	}
	if !slices.Contains(model.TypeModes, s.TypeMode) {
		return fmt.Errorf("cách nhập chữ không hợp lệ: %q (trống = tự chọn | keys | paste)", s.TypeMode)
	}
	if !slices.Contains(model.WebScopes, s.WebScope) {
		return fmt.Errorf("phạm vi tìm không hợp lệ: %q (trống = cả trang | dialog)", s.WebScope)
	}
	if !slices.Contains(model.ReadNears, s.ReadNear) {
		return fmt.Errorf("hướng đọc cạnh nhãn không hợp lệ: %q (trống | right | below)", s.ReadNear)
	}
	return nil
}

func checkStep(s *model.Step) error {
	need := 0
	switch s.Type {
	case model.StepClick, model.StepDouble, model.StepHold, model.StepWaitPixel:
		need = 1
	case model.StepPath:
		need = 1
		if !slices.Contains(model.Shapes, s.Shape) {
			return fmt.Errorf("hình vẽ không hợp lệ: %q (trống | circle | rect | star)", s.Shape)
		}
		if s.ShapeW < 0 || s.ShapeH < 0 {
			return errors.New("cỡ hình không được âm")
		}
	case model.StepDrag:
		need = 2
	case model.StepScreenshot, model.StepWaitScreen, model.StepOcrRead:
		if err := checkShot(s); err != nil {
			return err
		}
	case model.StepHTTP:
		if s.Method != "" && !slices.Contains(model.HTTPMethods, s.Method) {
			return fmt.Errorf("method HTTP không hợp lệ: %q (GET | POST | PUT | PATCH | DELETE)", s.Method)
		}
		if !slices.Contains(model.BodyTypes, s.BodyType) {
			return fmt.Errorf("kiểu body không hợp lệ: %q (trống | json | form | text)", s.BodyType)
		}
	case model.StepSystem:
		if !slices.Contains(model.SysOps, s.SysOp) {
			return fmt.Errorf("thao tác hệ thống không hợp lệ: %q (volume | volumeUp | volumeDown | mute | unmute)", s.SysOp)
		}
		if s.Volume < 0 || s.Volume > 100 {
			return errors.New("âm lượng phải trong 0–100 %")
		}
	case model.StepWaitUntil:
		if !slices.Contains(model.PassedModes, s.IfPassed) {
			return fmt.Errorf("cách xử lý giờ đã qua không hợp lệ: %q (trống | tomorrow | fail)", s.IfPassed)
		}
	case model.StepFile:
		if !slices.Contains(model.FileOps, s.FileOp) {
			return fmt.Errorf("thao tác tệp không hợp lệ: %q (trống = ghi chữ | row | mkdir | trash | emptyTrash)", s.FileOp)
		}
	case model.StepWindow:
		if err := checkWindow(*s); err != nil {
			return err
		}
	case model.StepApp:
		if err := checkApp(*s); err != nil {
			return err
		}
	case model.StepBrowserTab, model.StepBrowserGo, model.StepBrowserNorm, model.StepSavePdf:
		if err := checkTab(*s); err != nil {
			return err
		}
	case model.StepSysInfo:
	case model.StepInputSource:
		if !slices.Contains(model.InputOps, s.InputOp) {
			return fmt.Errorf("thao tác bộ gõ không hợp lệ: %q (trống = đọc | set | toggleIME)", s.InputOp)
		}
		if s.InputOp == model.InputToggleIME && strings.TrimSpace(s.InputHotkey) != "" && !strings.Contains(s.InputHotkey, "{{") {
			if _, _, err := inputsource.ParseHotkey(s.InputHotkey); err != nil {
				return err
			}
		}
	case model.StepZip:
		if err := checkZip(*s); err != nil {
			return err
		}
	case model.StepProcess:
		if err := checkProcess(*s); err != nil {
			return err
		}
	case model.StepPower:
		if err := checkPower(*s); err != nil {
			return err
		}
	case model.StepDisplay:
		if err := checkDisplay(*s); err != nil {
			return err
		}
	case model.StepNotify, model.StepMCPTool:
	case model.StepAskAI:
		if !slices.Contains(ai.Kinds, s.AIKind) {
			return fmt.Errorf("nhà cung cấp AI không hợp lệ: %q (trống = openai | anthropic | gemini)", s.AIKind)
		}
		if !slices.Contains(model.AIImages, s.AIImage) {
			return fmt.Errorf("ảnh gửi AI không hợp lệ: %q (trống | screen | file)", s.AIImage)
		}
		if !slices.Contains(model.AIFormats, s.AIFormat) {
			return fmt.Errorf("dạng trả lời AI không hợp lệ: %q (trống = chữ | json)", s.AIFormat)
		}
		if s.TimeoutMs < 0 {
			return fmt.Errorf("thời gian chờ không được âm")
		}
		if s.AIImage == model.AIImageScreen {
			if err := checkShot(s); err != nil {
				return err
			}
		}
	case model.StepOSShortcut:
		if s.TimeoutMs < 0 {
			return fmt.Errorf("thời gian chờ không được âm")
		}
	case model.StepShell:
		if err := checkShell(*s); err != nil {
			return err
		}
	case model.StepClipboard:
		if !slices.Contains(model.ClipOps, s.ClipOp) {
			return fmt.Errorf("phép clipboard không hợp lệ: %q (trống = đọc | write | image)", s.ClipOp)
		}
	case model.StepWait, model.StepText, model.StepKey, model.StepOpen, model.StepScroll, model.StepWaitImage, model.StepClickImage, model.StepFindAll,
		model.StepWebWait, model.StepWebClick, model.StepWebType, model.StepWebRead, model.StepWebScroll, model.StepWebKey, model.StepElementRead, model.StepPageText, model.StepReadTable, model.StepWaitDownload, model.StepElementAction, model.StepReadDocument, model.StepWaitUIEvent:
		if err := checkWebFields(s); err != nil {
			return err
		}
	case model.StepIf, model.StepSwitch, model.StepSwitchScreen, model.StepCounter, model.StepForEach, model.StepEnd, model.StepSetVar, model.StepCalc,
		model.StepTextMatch, model.StepTextSplit, model.StepTextClean, model.StepTextNumber:
		if err := checkControl(s); err != nil {
			return err
		}
	default:
		return fmt.Errorf("loại bước không hợp lệ: %q", s.Type)
	}
	if s.Human != "" && !slices.Contains(model.HumanLevels, s.Human) {
		return fmt.Errorf("mức giống người không hợp lệ: %q (trống = theo kịch bản | off | low | medium | high)", s.Human)
	}
	if err := checkNumVars(s); err != nil {
		return err
	}
	if s.Direction != "" && !slices.Contains(model.ScrollDirections, s.Direction) {
		return fmt.Errorf("hướng cuộn không hợp lệ: %q", s.Direction)
	}
	if s.ImageSource != "" && s.ImageSource != model.ImageFromNode && s.ImageSource != model.ImageFromSearch {
		return fmt.Errorf("nguồn vị trí ảnh không hợp lệ: %q", s.ImageSource)
	}
	if r := s.Retry; r != nil && (r.Count < 0 || r.Count > model.MaxRetries || r.DelayMs < 0) {
		return fmt.Errorf("số lần thử lại phải trong 0–%d, thời gian nghỉ không âm", model.MaxRetries)
	}
	if s.FindBy != "" && s.FindBy != model.FindByText && s.FindBy != model.FindByElement && s.FindBy != model.FindByAI {
		return fmt.Errorf("cách tìm không hợp lệ: %q", s.FindBy)
	}
	if s.FindBy == model.FindByAI && s.Type != model.StepWaitImage && s.Type != model.StepClickImage {
		return fmt.Errorf("tìm bằng AI chỉ dùng cho Chờ ảnh / Click theo ảnh")
	}
	if s.SearchArea != "" && s.SearchArea != "screen" {
		return fmt.Errorf("vùng tìm không hợp lệ: %q", s.SearchArea)
	}
	if s.MinCount < 0 || s.MaxCount < 0 {
		return errors.New("số chỗ tối thiểu / tối đa không được âm")
	}
	if s.Threshold < 0 || s.Threshold > 100 || s.Tolerance < 0 || s.Tolerance > 255 || s.TemplateScale < 0 {
		return errors.New("độ khớp / sai số màu / tỷ lệ ảnh mẫu ngoài khoảng cho phép")
	}
	if err := checkMatch(s.MatchMode, s.ColorTol); err != nil {
		return err
	}
	if len(s.Points) < need {
		return fmt.Errorf("thiếu điểm (cần %d)", need)
	}
	for _, p := range s.Points {
		if !validAnchor(p.Ax) || !validAnchor(p.Ay) {
			return fmt.Errorf("neo điểm không hợp lệ: %q / %q", p.Ax, p.Ay)
		}
	}
	switch s.Button {
	case "":
		s.Button = "left"
	case "left", "right", "center":
	default:
		return fmt.Errorf("nút chuột không hợp lệ: %q", s.Button)
	}
	switch s.KeyMode {
	case "":
		s.KeyMode = model.KeyChord
	case model.KeyChord, model.KeySequence:
	default:
		return fmt.Errorf("cách bấm phím không hợp lệ: %q", s.KeyMode)
	}
	for _, m := range s.Modifiers {
		if m != "cmd" && m != "ctrl" && m != "alt" && m != "shift" {
			return fmt.Errorf("phím kèm không hợp lệ: %q", m)
		}
	}
	if s.Clicks < 0 || s.ClickInterval < 0 || s.HoldMs < 0 || s.DragMs < 0 || s.DelayAfter < 0 || s.JitterMs < 0 || s.JitterPx < 0 || s.Amount < 0 || s.TimeoutMs < 0 || s.IntervalMs < 0 {
		return errors.New("số lần / thời gian / ngẫu nhiên không được âm")
	}
	if s.Points == nil {
		s.Points = []model.Point{}
	}
	if s.Keys == nil {
		s.Keys = []string{}
	}
	if s.Modifiers == nil {
		s.Modifiers = []string{}
	}
	return nil
}
func validAnchor(a string) bool {
	return a == "" || a == AnchorStart || a == AnchorEnd || a == AnchorCenter || a == AnchorRatio
}

// checkMatch – cách so ảnh mẫu và độ lệch màu (node tìm ảnh, điều kiện thấy ảnh – bước 40).
func checkMatch(mode string, colorTol int) error {
	if !slices.Contains(model.MatchModes, mode) {
		return fmt.Errorf("cách so ảnh không hợp lệ: %q", mode)
	}
	if colorTol < 0 || colorTol > 100 {
		return errors.New("độ lệch màu phải trong 0–100%")
	}
	return nil
}
