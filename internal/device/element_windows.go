package device

import (
	"fmt"
	"sync"
	"time"
	"unsafe"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Phần tử màn hình trên Windows qua UI Automation (37 E5). Một lần gọi ElementFromHandleBuildCache lấy cả cây con
// của cửa sổ kèm thuộc tính đã chọn (cache request, TreeScope_Subtree) – tương tự hỏi nhiều thuộc tính một lần của
// macOS. Chrome / Edge tự bật cây web khi có client UIA. Không cần quyền như macOS; app chạy quyền admin thì app
// thường không đọc được (UIPI).

var (
	clsidCUIAutomation   = parseGUID("ff48dba4-60ef-4201-aa87-54103eef594e")
	iidUIAutomation      = parseGUID("30cbe57d-d9d0-452a-ab13-7ac5ac4825ee")
	uiaAuto, uiaCacheReq *comObj  // chỉ đụng trên luồng COM
	uiaSeen              sync.Map // pid đã đọc lần đầu (chờ Chrome dựng cây)
)

// Mã thuộc tính UIA (UIA_*PropertyId) đưa vào cache request.
const (
	propBounding    = 30001
	propControlType = 30003
	propLocalized   = 30004
	propName        = 30005
	propHelpText    = 30013
	propOffscreen   = 30022
	propValue       = 30045
	propIsSelected  = 30079
	propToggle      = 30086
	propAriaRole    = 30101
)

// Giới hạn như macOS (element_darwin.go): trang nặng vài nghìn nút; quá giới hạn thì dùng phần đã đọc.
const (
	maxElementNodes = 20000
	uiaBuildWait    = 2500 * time.Millisecond // lần đầu: chờ Chrome / Electron dựng cây tối đa
)

func readElements(app string) ([]element.Node, error) {
	hwnds, name, err := appWindows(app)
	if err != nil {
		return nil, appErr(err, name)
	}
	pid := hwndPID(hwnds[0])
	if _, seen := uiaSeen.LoadOrStore(pid, true); seen {
		return uiaReadAll(hwnds)
	}
	// lần đầu với một app: đọc lại tới khi số nút đứng yên (≥ 50 nút) hoặc hết uiaBuildWait
	deadline := time.Now().Add(uiaBuildWait)
	var prev []element.Node
	for {
		nodes, err := uiaReadAll(hwnds)
		if err != nil || len(nodes) == len(prev) && len(nodes) >= 50 || time.Now().After(deadline) {
			return nodes, err
		}
		prev = nodes
		time.Sleep(300 * time.Millisecond)
	}
}

func appErr(err error, name string) error {
	if name != "" {
		return fmt.Errorf("%w (%s)", err, name)
	}
	return err
}

func hwndPID(h uintptr) uint32 {
	var pid uint32
	procGetWindowThreadPID.Call(h, uintptr(unsafe.Pointer(&pid)))
	return pid
}

func uiaReadAll(hwnds []uintptr) (nodes []element.Node, err error) {
	onCOM(func() {
		var w *uiaWalk
		if w, err = uiaWalkWindows(hwnds, nil); err == nil {
			nodes = w.nodes
		}
	})
	return nodes, err
}

// uiaInit dựng IUIAutomation + cache request (một lần, trên luồng COM).
func uiaInit() error {
	if uiaAuto == nil {
		a, err := coCreate(clsidCUIAutomation, iidUIAutomation)
		if err != nil {
			return fmt.Errorf("không mở được UI Automation: %w", err)
		}
		uiaAuto = a
	}
	if uiaCacheReq == nil {
		var req *comObj
		if err := vcall(uiaAuto, "CreateCacheRequest", 20, uintptr(unsafe.Pointer(&req))); err != nil {
			return err
		}
		for _, p := range []uintptr{propBounding, propControlType, propLocalized, propName, propHelpText, propOffscreen,
			propValue, propIsSelected, propToggle, propAriaRole} {
			vcall(req, "CacheRequest.AddProperty", 3, p) // thuộc tính máy cũ chưa có thì bỏ qua
		}
		if err := vcall(req, "CacheRequest.put_TreeScope", 7, 7 /* TreeScope_Subtree */); err != nil {
			req.release()
			return err
		}
		uiaCacheReq = req
	}
	return nil
}

// uiaWalk – duyệt cây đã cache (cha trước con). each ≠ nil: gọi với chỉ số (thứ tự như readElements) + phần tử trước
// khi thêm nút; trả true thì dừng duyệt.
type uiaWalk struct {
	nodes []element.Node
	each  func(i int, el *comObj) bool
	stop  bool
}

func uiaWalkWindows(hwnds []uintptr, each func(int, *comObj) bool) (*uiaWalk, error) {
	if err := uiaInit(); err != nil {
		return nil, err
	}
	w := &uiaWalk{each: each}
	var firstErr error
	for _, h := range hwnds {
		var root *comObj
		if err := vcall(uiaAuto, "ElementFromHandleBuildCache", 10, h, uintptr(unsafe.Pointer(uiaCacheReq)), uintptr(unsafe.Pointer(&root))); err != nil || root == nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("không đọc được cây phần tử của cửa sổ (app chạy quyền admin?): %v", err)
			}
			continue
		}
		w.visit(root, 0)
		root.release()
	}
	if len(w.nodes) == 0 && !w.stop && firstErr != nil {
		return nil, firstErr
	}
	return w, nil
}

func (w *uiaWalk) visit(el *comObj, depth int) {
	if w.stop || len(w.nodes) >= maxElementNodes || depth > 200 {
		return
	}
	if w.each != nil && w.each(len(w.nodes), el) {
		w.stop = true
		return
	}
	w.nodes = append(w.nodes, uiaNode(el, depth))
	var kids *comObj
	if vcall(el, "GetCachedChildren", 19, uintptr(unsafe.Pointer(&kids))) != nil || kids == nil {
		return
	}
	defer kids.release()
	var n int32
	vcall(kids, "ElementArray.Length", 3, uintptr(unsafe.Pointer(&n)))
	for i := int32(0); i < n && !w.stop; i++ {
		var k *comObj
		if vcall(kids, "ElementArray.GetElement", 4, uintptr(i), uintptr(unsafe.Pointer(&k))) == nil && k != nil {
			w.visit(k, depth+1)
			k.release()
		}
	}
}

// uiaNode – nút trung lập từ thuộc tính đã cache; HelpText (title / chữ mờ ô nhập) → Placeholder. Khối chữ: chữ nằm
// ở Name → Value (như AXStaticText). Ngoài khung
// nhìn (IsOffscreen) → khung cỡ 0 để engine cuộn tới trước khi bấm (Node.Shown), như khung kẹp mép của macOS.
func uiaNode(el *comObj, depth int) element.Node {
	ct, _ := cachedInt(el, propControlType)
	role := element.RoleFromUIA(ct, cachedStr(el, propAriaRole))
	name := oneLine(cachedStr(el, propName))
	n := element.Node{Role: role, Raw: cachedStr(el, propLocalized),
		Placeholder: oneLine(cachedStr(el, propHelpText)), Depth: depth}
	switch {
	case role == element.RoleText:
		n.Value = name
	default:
		// aria-label của web nằm ở Name – Desc cũng là tên để aria= tìm như macOS (Chrome đặt tên vào cả AXTitle và AXDescription)
		n.Title, n.Desc = name, name
		if role != "document" { // Document của trang web có ValuePattern = URL, không phải nội dung (chữ: DocTexts)
			n.Value = cachedStr(el, propValue)
		}
		// phần tử không hỗ trợ thì UIA trả giá trị mặc định (ToggleState 2, IsSelected false) – chỉ đọc theo vai trò
		switch role {
		case "checkbox", "switch", "menuitemcheckbox": // 0 tắt, 1 bật, 2 lửng
			if t, ok := cachedInt(el, propToggle); ok {
				n.Value = fmt.Sprint(t)
			}
		case "radio", "menuitemradio":
			if s, ok := cachedBool(el, propIsSelected); ok {
				n.Value = map[bool]string{true: "1", false: "0"}[s]
			}
		}
	}
	var r struct{ L, T, R, B int32 }
	if vcall(el, "get_CachedBoundingRectangle", 75, uintptr(unsafe.Pointer(&r))) == nil {
		n.Box = model.Rect{X: int(r.L), Y: int(r.T), W: int(r.R - r.L), H: int(r.B - r.T)}
	}
	if off, _ := cachedBool(el, propOffscreen); off {
		n.Box.W, n.Box.H = 0, 0
	}
	return n
}

func cachedVariant(el *comObj, prop uintptr) (v variant) {
	if vcall(el, "GetCachedPropertyValue", 12, prop, uintptr(unsafe.Pointer(&v))) != nil {
		v = variant{}
	}
	return v
}

func cachedStr(el *comObj, prop uintptr) string {
	v := cachedVariant(el, prop)
	defer v.clear()
	if v.vt != vtBSTR {
		return ""
	}
	return bstr(v.val)
}

func cachedInt(el *comObj, prop uintptr) (int, bool) {
	v := cachedVariant(el, prop)
	defer v.clear()
	return int(int32(v.val)), v.vt == vtI4
}

func cachedBool(el *comObj, prop uintptr) (bool, bool) {
	v := cachedVariant(el, prop)
	defer v.clear()
	return int16(v.val) != 0, v.vt == vtBool
}
