package perm

import "ghosthand/internal/model"

// order – thứ tự cố định của kết quả (cùng thứ tự hiện ở tab Quyền). Bản TS: frontend/src/flow/perms.ts (cùng tên NeedsOf).
var order = []ID{Accessibility, ScreenRecording, AutoChrome, AutoFinder, AutoSystemEvents, Notifications}

// Need gom quyền cần cho một node / kịch bản.
type Need map[ID]bool

func (n Need) add(ids ...ID) {
	for _, id := range ids {
		n[id] = true
	}
}

// List trả các quyền theo thứ tự cố định.
func (n Need) List() []ID {
	out := []ID{}
	for _, id := range order {
		if n[id] {
			out = append(out, id)
		}
	}
	return out
}

// NeedsOf: quyền (macOS) mà node s cần để chạy. Node điều khiển, HTTP, tệp thường, nén… không cần quyền nào.
// Chỉ tính Chrome cho Automation trình duyệt; Edge / Brave / Cốc Cốc chưa kiểm tra riêng (cần quyền riêng, xin lúc chạy).
func NeedsOf(s model.Step) []ID {
	n := Need{}
	addStep(n, s)
	return n.List()
}

// Needs: quyền cần cho mọi node đang bật của kịch bản.
func Needs(sc model.Script) []ID {
	n := Need{}
	for _, s := range sc.Steps {
		if s.Enabled {
			addStep(n, s)
		}
	}
	return n.List()
}

func addStep(n Need, s model.Step) {
	switch s.Type {
	case model.StepClick, model.StepDouble, model.StepHold, model.StepDrag, model.StepText, model.StepKey, model.StepScroll,
		model.StepPath, model.StepWebClick, model.StepWebType, model.StepWebScroll,
		model.StepElementAction, model.StepPageText, model.StepReadTable, model.StepReadDocument, model.StepWaitUIEvent:
		n.add(Accessibility)
	case model.StepWaitImage, model.StepFindAll:
		addFind(n, s.FindBy)
	case model.StepClickImage:
		n.add(Accessibility)
		if s.ImageSource == model.ImageFromNode { // dùng chỗ node khác đã tìm, không tự tìm
			break
		}
		addFind(n, s.FindBy)
	case model.StepElementRead:
		n.add(Accessibility)
		if s.FindBy == model.FindByText || s.ReadNear != "" {
			n.add(ScreenRecording)
		}
	case model.StepWaitPixel, model.StepWaitScreen, model.StepScreenshot:
		n.add(ScreenRecording)
	case model.StepIf, model.StepSwitchScreen:
		addCond(n, s.Cond)
		for _, c := range s.Cases {
			addCond(n, c.Cond)
		}
	case model.StepBrowserTab, model.StepBrowserGo:
		addChrome(n, s)
	case model.StepBrowserNorm:
		n.add(Accessibility, AutoSystemEvents)
		addChrome(n, s)
	case model.StepSavePdf:
		n.add(Accessibility)
		addChrome(n, s)
	case model.StepFile:
		if s.FileOp == model.FileTrash || s.FileOp == model.FileEmptyTrash {
			n.add(AutoFinder)
		}
	case model.StepDisplay:
		if s.DisplayOp == model.DisplayTheme {
			n.add(AutoSystemEvents)
		}
	case model.StepPower:
		switch s.PowerOp {
		case model.PowerLock:
			n.add(Accessibility, AutoSystemEvents)
		case model.PowerShutdown, model.PowerRestart:
			n.add(AutoSystemEvents)
		}
	case model.StepInputSource:
		if s.InputOp == model.InputToggleIME {
			n.add(Accessibility)
		}
	case model.StepNotify:
		n.add(Notifications)
	}
}

// addFind: tìm ảnh / chữ cần chụp màn hình; tìm phần tử đọc cây accessibility.
func addFind(n Need, findBy string) {
	if findBy == model.FindByElement {
		n.add(Accessibility)
		return
	}
	n.add(ScreenRecording)
}

func addCond(n Need, c *model.Cond) {
	if c == nil {
		return
	}
	switch c.Kind {
	case model.CondImage, model.CondText, model.CondPixel:
		n.add(ScreenRecording)
	case model.CondElement:
		n.add(Accessibility)
	}
	for i := range c.Conds {
		addCond(n, &c.Conds[i])
	}
}

func addChrome(n Need, s model.Step) {
	if s.Browser == "" || s.Browser == model.BrowserChrome {
		n.add(AutoChrome)
	}
}

// Missing: các mục trong items bị từ chối (`denied`) mà ids cần. `unknown` / tự kiểm tra không tính – chưa chắc thiếu.
// Bản TS: flow/perms.ts missingOf.
func Missing(items []Item, ids []ID) []Item {
	out := []Item{}
	for _, it := range items {
		if it.State != Denied {
			continue
		}
		for _, id := range ids {
			if it.ID == id {
				out = append(out, it)
				break
			}
		}
	}
	return out
}

// DeniedOf: mọi quyền đang bị từ chối.
func DeniedOf(items []Item) []Item {
	out := []Item{}
	for _, it := range items {
		if it.State == Denied {
			out = append(out, it)
		}
	}
	return out
}
