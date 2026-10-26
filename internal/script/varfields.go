package script

import (
	"encoding/json"
	"fmt"
	"slices"

	"ghosthand/internal/launch"
	"ghosthand/internal/model"
)

// VarField – ô chữ nhận {{biến}} của node (kể cả trong điều kiện / case).
type VarField struct {
	Name string // tên trường (json) cho lời báo lỗi, vd "cond.conds[1].left"
	Ptr  *string
	URL  bool // ô URL: giá trị biến được mã hoá (launch.EscapeURLValue)
	JSON bool // thân JSON của node HTTP: giá trị biến thoát theo chuỗi JSON (đặt biến trong "…")
	// Num: ô số – toạ độ (Point.XVar / YVar, F5b) hoặc trường số (NumVars, F5c): biến phải ra số (output của node),
	// cả ô là số + / − (EvalCoord)
	Num  bool
	Calc bool // biểu thức node Tính toán: giá trị không phải số thành chuỗi "…" (CalcQuote)
}

// VarFields – các ô chữ nhận biến của s (input {{key}} ở resolveInputs, biến node ở resolveNodeVars, kiểm tra ở
// validateFlow). Con trỏ trỏ vào s – muốn sửa thì gọi trên bản sao (cloneStep).
func VarFields(s *model.Step) []VarField {
	var out []VarField
	add := func(name string, p *string, url bool) { out = append(out, VarField{Name: name, Ptr: p, URL: url}) }
	if hasPoints(s.Type) {
		for i := range s.Points {
			if p := &s.Points[i]; p.UsesVar() && !(i == 0 && s.Type == model.StepDrag && s.DragFromPrev) { // A "từ điểm trước" không dùng
				out = append(out, VarField{Name: fmt.Sprintf("points[%d].xVar", i), Ptr: &p.XVar, Num: true},
					VarField{Name: fmt.Sprintf("points[%d].yVar", i), Ptr: &p.YVar, Num: true})
			}
		}
	}
	for i := range s.NumVars {
		out = append(out, VarField{Name: fmt.Sprintf("numVars[%d].expr", i), Ptr: &s.NumVars[i].Expr, Num: true})
	}
	if s.OnlyInWindow { // cửa sổ đích của công tắc chỉ-thao-tác-trong-cửa-sổ (46 C2); node Cửa sổ / chờ sự kiện tự thêm bên dưới
		add("winApp", &s.WinApp, false)
		add("winTitle", &s.WinTitle, false)
	}
	switch s.Type {
	case model.StepText:
		add("text", &s.Text, false)
	case model.StepWaitImage, model.StepClickImage, model.StepFindAll:
		switch s.FindBy {
		case model.FindByText:
			add("findText", &s.FindText, false)
		case model.FindByElement:
			for i := range s.Selectors {
				add(fmt.Sprintf("selectors[%d]", i), &s.Selectors[i], false)
			}
			add("elementApp", &s.ElementApp, false)
		}
	case model.StepWebWait, model.StepWebClick, model.StepWebType, model.StepWebRead, model.StepWebScroll:
		for i := range s.Selectors {
			add(fmt.Sprintf("selectors[%d]", i), &s.Selectors[i], false)
		}
		add("tab", &s.Tab, false)
		if s.Type == model.StepWebType {
			add("text", &s.Text, false)
		}
		if s.Type == model.StepWebScroll && s.ScrollMode == model.ScrollModeUntil {
			for i := range s.ScrollIn {
				add(fmt.Sprintf("scrollIn[%d]", i), &s.ScrollIn[i], false)
			}
		}
	case model.StepWebKey:
		add("tab", &s.Tab, false)
	case model.StepElementAction:
		add("text", &s.Text, false)
		fallthrough
	case model.StepElementRead, model.StepPageText, model.StepReadTable, model.StepReadDocument:
		if s.FindBy == model.FindByText {
			add("findText", &s.FindText, false)
			break
		}
		for i := range s.Selectors {
			add(fmt.Sprintf("selectors[%d]", i), &s.Selectors[i], false)
		}
		add("elementApp", &s.ElementApp, false)
		if s.Type == model.StepReadTable {
			add("filePath", &s.FilePath, false)
		}
	case model.StepSysInfo:
		add("filePath", &s.FilePath, false)
	case model.StepOSShortcut:
		add("shortcutName", &s.ShortcutName, false)
		add("text", &s.Text, false)
	case model.StepShell:
		// Script KHÔNG nhận biến (chống chèn lệnh) – biến đi qua ShellEnv
		add("filePath", &s.FilePath, false)
		for i := range s.ShellEnv {
			add(fmt.Sprintf("shellEnv[%d].value", i), &s.ShellEnv[i].Value, false)
		}
	case model.StepWaitDownload:
		add("filePath", &s.FilePath, false)
		add("filePattern", &s.FilePattern, false)
	case model.StepHTTP:
		add("url", &s.URL, false)
		kv := func(name string, rows []model.KV) {
			for i := range rows {
				add(fmt.Sprintf("%s[%d].value", name, i), &rows[i].Value, false)
			}
		}
		kv("query", s.Query)
		kv("headers", s.Headers)
		switch s.BodyType {
		case model.BodyJSON:
			out = append(out, VarField{Name: "body", Ptr: &s.Body, JSON: true})
		case model.BodyText:
			add("body", &s.Body, false)
		case model.BodyForm:
			kv("form", s.Form)
		}
	case model.StepWaitUntil:
		add("at", &s.At, false)
	case model.StepFile:
		if s.FileOp != model.FileEmptyTrash {
			add("filePath", &s.FilePath, false)
		}
		switch s.FileOp {
		case model.FileWrite:
			add("text", &s.Text, false)
		case model.FileRow:
			for i := range s.Cells {
				add(fmt.Sprintf("cells[%d]", i), &s.Cells[i], false)
			}
			add("sheet", &s.Sheet, false)
		case model.FileTrash:
			add("filePattern", &s.FilePattern, false)
		}
	case model.StepClipboard:
		switch s.ClipOp {
		case model.ClipWrite:
			add("text", &s.Text, false)
		case model.ClipImage:
			add("filePath", &s.FilePath, false)
		}
	case model.StepWindow:
		add("winApp", &s.WinApp, false)
		add("winTitle", &s.WinTitle, false)
	case model.StepWaitUIEvent:
		add("winApp", &s.WinApp, false)
		add("winTitle", &s.WinTitle, false)
		add("elementApp", &s.ElementApp, false)
		for i := range s.Selectors {
			add(fmt.Sprintf("selectors[%d]", i), &s.Selectors[i], false)
		}
	case model.StepInputSource:
		add("inputLayout", &s.InputLayout, false)
		add("inputHotkey", &s.InputHotkey, false)
	case model.StepDisplay:
		add("displayValue", &s.DisplayValue, false)
	case model.StepNotify:
		add("notifyTitle", &s.NotifyTitle, false)
		add("text", &s.Text, false)
	case model.StepZip:
		add("filePath", &s.FilePath, false)
		add("filePattern", &s.FilePattern, false)
		add("zipTo", &s.ZipTo, false)
	case model.StepProcess:
		add("procName", &s.ProcName, false)
	case model.StepApp:
		add("appName", &s.AppName, false)
	case model.StepBrowserTab, model.StepBrowserGo, model.StepBrowserNorm, model.StepSavePdf:
		add("tab", &s.Tab, false)
		if s.Type == model.StepSavePdf {
			add("filePath", &s.FilePath, false)
		}
		if s.TabOp == model.TabNew || s.Type == model.StepBrowserGo {
			add("url", &s.URL, launch.TargetKind(s.URL) == launch.TargetURL)
		}
	case model.StepScreenshot:
		add("saveDir", &s.SaveDir, false)
		add("fileName", &s.FileName, false)
	case model.StepOpen:
		add("target", &s.Target, launch.TargetKind(s.Target) == launch.TargetURL)
	case model.StepIf:
		if s.Cond != nil {
			condFields(s.Cond, "cond", add)
		}
	case model.StepSwitch:
		add("value", &s.Value, false)
		for i := range s.Cases {
			add(fmt.Sprintf("cases[%d].match", i), &s.Cases[i].Match, false)
		}
	case model.StepSwitchScreen:
		for i := range s.Cases {
			if c := s.Cases[i].Cond; c != nil {
				condFields(c, fmt.Sprintf("cases[%d].cond", i), add)
			}
		}
	case model.StepEnd:
		add("message", &s.Message, false)
	case model.StepSetVar:
		add("value", &s.Value, false)
	case model.StepCalc:
		out = append(out, VarField{Name: "value", Ptr: &s.Value, Calc: true})
	case model.StepTextMatch:
		add("value", &s.Value, false)
		add("pattern", &s.Pattern, false)
	case model.StepTextSplit, model.StepTextNumber:
		add("value", &s.Value, false)
	case model.StepTextClean:
		add("value", &s.Value, false)
		add("replaceFrom", &s.ReplaceFrom, false)
		add("replaceTo", &s.ReplaceTo, false)
	case model.StepForEach:
		if s.ListFrom == model.ListFile {
			add("filePath", &s.FilePath, false)
			add("sheet", &s.Sheet, false)
		} else {
			add("value", &s.Value, false)
		}
	}
	return out
}

// EscapeValue – giá trị biến chèn vào ô f: ô URL mã hoá kiểu URL, thân JSON thoát theo chuỗi JSON (", \, xuống dòng…).
func EscapeValue(f VarField, v string) string {
	switch {
	case f.URL:
		return launch.EscapeURLValue(v)
	case f.Calc:
		return CalcQuote(v)
	case f.JSON:
		b, _ := json.Marshal(v)
		return string(b[1 : len(b)-1])
	}
	return v
}

// hasPoints – loại node có điểm trên màn hình nhận toạ độ từ biến (điểm trong điều kiện pixel chưa nhận).
func hasPoints(t string) bool {
	switch t {
	case model.StepClick, model.StepDouble, model.StepHold, model.StepDrag, model.StepScroll, model.StepWaitPixel, model.StepPath:
		return true
	}
	return false
}

func condFields(c *model.Cond, name string, add func(string, *string, bool)) {
	switch c.Kind {
	case model.CondText:
		add(name+".findText", &c.FindText, false)
	case model.CondElement:
		for i := range c.Selectors {
			add(fmt.Sprintf("%s.selectors[%d]", name, i), &c.Selectors[i], false)
		}
		add(name+".elementApp", &c.ElementApp, false)
	case model.CondValue:
		add(name+".left", &c.Left, false)
		add(name+".right", &c.Right, false)
	case model.CondAll, model.CondAny:
		for i := range c.Conds {
			condFields(&c.Conds[i], fmt.Sprintf("%s.conds[%d]", name, i), add)
		}
	}
}

// CloneStep chép sâu phần lồng nhau sửa được (điểm, điều kiện, case) – thay biến trên bản sao không đụng kịch bản gốc.
func CloneStep(s model.Step) model.Step {
	s.Points = slices.Clone(s.Points)
	s.Selectors = slices.Clone(s.Selectors)
	s.ScrollIn = slices.Clone(s.ScrollIn)
	s.NumVars = slices.Clone(s.NumVars)
	s.Query, s.Headers, s.Form = slices.Clone(s.Query), slices.Clone(s.Headers), slices.Clone(s.Form)
	s.Cells = slices.Clone(s.Cells)
	s.Cond = cloneCond(s.Cond)
	if s.Cases != nil {
		cs := make([]model.Case, len(s.Cases))
		for i, c := range s.Cases {
			c.Cond = cloneCond(c.Cond)
			cs[i] = c
		}
		s.Cases = cs
	}
	return s
}
