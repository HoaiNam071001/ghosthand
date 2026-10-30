package device

import (
	"errors"
	"hash/fnv"
	"strings"
	"unsafe"

	"ghosthand/internal/model"
)

// Giao diện (không phải nội dung trang) của trình duyệt họ Chromium qua UI Automation – thanh tab, ô địa chỉ, nút
// tải lại / quay lại / tiến tới (bước 43 B1w). Khác element_windows.go: đi từng cấp bằng TreeWalker và không xuống
// `Document` nên trang nặng cũng đọc nhanh. Vai trò nút dựa vào ClassName của Views (không đổi theo ngôn ngữ).
// Mọi hàm chạy trên luồng COM; phần tử giữ lại trong chromeUI, trả hết khi xong (chromeUI.free).

const (
	ctButton   = 50000
	ctEdit     = 50004
	ctTabItem  = 50019
	ctDocument = 50030

	propClassName = 30012
	propRuntimeID = 30000

	patternInvoke        = 10000
	patternValue         = 10002
	patternSelectionItem = 10010
)

var (
	iidUIAInvoke        = parseGUID("fb377fbe-8ea6-46d5-9c73-6499642d3059")
	iidUIAValue         = parseGUID("a94cd8b1-0844-4cd6-9d2d-640537ab39e9")
	iidUIASelectionItem = parseGUID("a8efa66a-0fda-421a-9194-38021f3578ea")

	oleSafeArrayGetLBound = oleaut32.NewProc("SafeArrayGetLBound")
	oleSafeArrayGetUBound = oleaut32.NewProc("SafeArrayGetUBound")
	oleSafeArrayGetElem   = oleaut32.NewProc("SafeArrayGetElement")
	oleSysAllocStringLen  = oleaut32.NewProc("SysAllocStringLen")

	uiaChromeReq    *comObj // cache request tầng Element, chỉ đụng trên luồng COM
	uiaChromeWalker *comObj
)

// ErrChromeTabGone – tab không còn trên thanh tab (đã đóng giữa chừng).
var ErrChromeTabGone = errors.New("tab không còn mở")

// ChromeTab – một tab trên thanh tab. ID suy từ RuntimeId của UIA: ổn định tới khi đóng tab, không đổi khi kéo tab.
type ChromeTab struct {
	ID       int64
	Name     string
	Selected bool
}

// ChromeWindow – giao diện một cửa sổ trình duyệt. Address chỉ là của tab đang chọn; Tabs rỗng = không phải cửa sổ
// trình duyệt có thanh tab (popup, DevTools, toàn màn hình F11).
type ChromeWindow struct {
	Tabs    []ChromeTab
	Address string
	Loading bool   // đang điều hướng: Chrome gỡ Document khỏi cây tới khi trang mới được nhận
	DocURL  string // URL đầy đủ của trang đang hiện (Value của Document); "" khi đang điều hướng
}

type chromeUI struct {
	tabs      []chromeTab
	omni      *comObj
	address   string
	reload    *comObj
	docURL    string
	hasDoc    bool
	back, fwd *comObj
	free      []*comObj
}

type chromeTab struct {
	ChromeTab
	el *comObj
}

func chromeInit() error {
	if err := uiaInit(); err != nil {
		return err
	}
	if uiaChromeReq == nil {
		var req *comObj
		if err := vcall(uiaAuto, "CreateCacheRequest", 20, uintptr(unsafe.Pointer(&req))); err != nil {
			return err
		}
		for _, p := range []uintptr{propControlType, propName, propClassName, propValue, propIsSelected, propRuntimeID} {
			vcall(req, "CacheRequest.AddProperty", 3, p)
		}
		vcall(req, "CacheRequest.put_TreeScope", 7, 1 /* TreeScope_Element */)
		uiaChromeReq = req
	}
	if uiaChromeWalker == nil {
		var w *comObj
		if err := vcall(uiaAuto, "get_ControlViewWalker", 14, uintptr(unsafe.Pointer(&w))); err != nil {
			return err
		}
		uiaChromeWalker = w
	}
	return nil
}

// withChrome đọc giao diện cửa sổ hwnd rồi gọi fn (trên luồng COM, phần tử còn sống trong fn).
func withChrome(hwnd uint64, fn func(*chromeUI) error) (err error) {
	h, err := liveWindow(hwnd)
	if err != nil {
		return err
	}
	onCOM(func() {
		if err = chromeInit(); err != nil {
			return
		}
		var root *comObj
		if err = vcall(uiaAuto, "ElementFromHandleBuildCache", 10, h, uintptr(unsafe.Pointer(uiaChromeReq)), uintptr(unsafe.Pointer(&root))); err != nil || root == nil {
			err = errors.New("không đọc được cửa sổ trình duyệt (chạy quyền admin?)")
			return
		}
		ui := &chromeUI{free: []*comObj{root}}
		defer func() {
			for _, o := range ui.free {
				o.release()
			}
		}()
		ui.walk(root, 0)
		err = fn(ui)
	})
	return err
}

func (ui *chromeUI) walk(parent *comObj, depth int) {
	if depth > 14 {
		return
	}
	var kid *comObj
	if vcall(uiaChromeWalker, "GetFirstChildElementBuildCache", 10, uintptr(unsafe.Pointer(parent)), uintptr(unsafe.Pointer(uiaChromeReq)), uintptr(unsafe.Pointer(&kid))) != nil {
		return
	}
	for kid != nil {
		ui.free = append(ui.free, kid) // trả cuối cùng: phần tử giữ lại (tab, nút) còn dùng sau khi duyệt xong
		ct, _ := cachedInt(kid, propControlType)
		class := cachedStr(kid, propClassName)
		switch {
		case ct == ctDocument:
			ui.hasDoc, ui.docURL = true, cachedStr(kid, propValue)
		case ct == ctTabItem:
			ui.tabs = append(ui.tabs, chromeTab{ChromeTab{ID: runtimeHash(kid), Name: oneLine(cachedStr(kid, propName))}, kid})
			sel, _ := cachedBool(kid, propIsSelected)
			ui.tabs[len(ui.tabs)-1].Selected = sel
		case ct == ctEdit && (ui.omni == nil || strings.Contains(class, "Omnibox")):
			ui.omni, ui.address = kid, cachedStr(kid, propValue)
		case ct == ctButton && class == "ReloadButton":
			ui.reload = kid
		case ct == ctButton && strings.Contains(class, "Back"):
			// Chrome: cả hai nút cùng ClassName "BackForwardButton", quay lại đứng trước tiến tới
			if ui.back == nil {
				ui.back = kid
			} else if ui.fwd == nil && class == "BackForwardButton" {
				ui.fwd = kid
			}
		case ct == ctButton && class == "ForwardButton":
			ui.fwd = kid
		default:
			ui.walk(kid, depth+1)
		}
		var next *comObj
		if vcall(uiaChromeWalker, "GetNextSiblingElementBuildCache", 12, uintptr(unsafe.Pointer(kid)), uintptr(unsafe.Pointer(uiaChromeReq)), uintptr(unsafe.Pointer(&next))) != nil {
			return
		}
		kid = next
	}
}

// runtimeHash – id số từ RuntimeId (mảng int32) của phần tử.
func runtimeHash(el *comObj) int64 {
	v := cachedVariant(el, propRuntimeID)
	defer v.clear()
	if v.vt&0x2000 == 0 || v.val == 0 {
		return 0
	}
	var lo, hi int32
	oleSafeArrayGetLBound.Call(v.val, 1, uintptr(unsafe.Pointer(&lo)))
	oleSafeArrayGetUBound.Call(v.val, 1, uintptr(unsafe.Pointer(&hi)))
	h := fnv.New64a()
	for i := lo; i <= hi; i++ {
		var x int32
		oleSafeArrayGetElem.Call(v.val, uintptr(unsafe.Pointer(&i)), uintptr(unsafe.Pointer(&x)))
		h.Write([]byte{byte(x), byte(x >> 8), byte(x >> 16), byte(x >> 24)})
	}
	return int64(h.Sum64() >> 1)
}

func (ui *chromeUI) find(id int64) (*chromeTab, error) {
	for i := range ui.tabs {
		if ui.tabs[i].ID == id {
			return &ui.tabs[i], nil
		}
	}
	return nil, ErrChromeTabGone
}

// ReadChromeWindow – thanh tab + ô địa chỉ của cửa sổ trình duyệt hwnd.
func ReadChromeWindow(hwnd uint64) (cw ChromeWindow, err error) {
	err = withChrome(hwnd, func(ui *chromeUI) error {
		for _, t := range ui.tabs {
			cw.Tabs = append(cw.Tabs, t.ChromeTab)
		}
		cw.Address = ui.address
		cw.Loading, cw.DocURL = !ui.hasDoc, ui.docURL
		return nil
	})
	return cw, err
}

// SelectChromeTab chuyển sang tab id (SelectionItem.Select) – không đưa cửa sổ lên trước.
func SelectChromeTab(hwnd uint64, id int64) error {
	return withChrome(hwnd, func(ui *chromeUI) error {
		t, err := ui.find(id)
		if err != nil {
			return err
		}
		return uiaPattern(t.el, patternSelectionItem, iidUIASelectionItem, 3, "SelectionItem.Select")
	})
}

// CloseChromeTab bấm nút × của tab id.
func CloseChromeTab(hwnd uint64, id int64) error {
	return withChrome(hwnd, func(ui *chromeUI) error {
		t, err := ui.find(id)
		if err != nil {
			return err
		}
		var btn *comObj
		if vcall(uiaChromeWalker, "GetFirstChildElementBuildCache", 10, uintptr(unsafe.Pointer(t.el)), uintptr(unsafe.Pointer(uiaChromeReq)), uintptr(unsafe.Pointer(&btn))) != nil || btn == nil {
			return errors.New("không thấy nút đóng của tab")
		}
		defer btn.release()
		return uiaPattern(btn, patternInvoke, iidUIAInvoke, 3, "Invoke")
	})
}

// ChromeNav – nút tải lại / quay lại / tiến tới (model.TabReload / TabBack / TabForward) của tab đang chọn.
func ChromeNav(hwnd uint64, op string) error {
	return withChrome(hwnd, func(ui *chromeUI) error {
		btn := map[string]*comObj{model.TabReload: ui.reload, model.TabBack: ui.back, model.TabForward: ui.fwd}[op]
		if btn == nil {
			return errors.New("không thấy nút điều hướng trên thanh công cụ trình duyệt")
		}
		return uiaPattern(btn, patternInvoke, iidUIAInvoke, 3, "Invoke")
	})
}

// SetChromeAddress đưa focus vào ô địa chỉ rồi điền url (chưa Enter – nơi gọi gửi phím).
func SetChromeAddress(hwnd uint64, url string) error {
	return withChrome(hwnd, func(ui *chromeUI) error {
		if ui.omni == nil {
			return errors.New("không thấy ô địa chỉ (cửa sổ đang toàn màn hình hoặc là popup?)")
		}
		if err := vcall(ui.omni, "SetFocus", 3); err != nil {
			return err
		}
		return uiaSetValue(ui.omni, url)
	})
}

// uiaPattern lấy pattern của el rồi gọi method không tham số ở slot.
func uiaPattern(el *comObj, id uintptr, iid *comGUID, slot int, name string) error {
	var p *comObj
	if err := vcall(el, "GetCurrentPatternAs", 14, id, uintptr(unsafe.Pointer(iid)), uintptr(unsafe.Pointer(&p))); err != nil {
		return err
	}
	if p == nil {
		return errors.New("phần tử không hỗ trợ " + name)
	}
	defer p.release()
	return vcall(p, name, slot)
}
