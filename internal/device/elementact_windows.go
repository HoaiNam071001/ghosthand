package device

import (
	"errors"
	"fmt"
	"unicode/utf16"
	"unsafe"

	"ghosthand/internal/model"
)

// Thao tác phần tử không cần chuột trên Windows (bước 43 E1w) qua control pattern của UI Automation – cùng ý nghĩa với
// ax_do của macOS. Gọi trên phần tử lấy từ cây cache (GetCurrentPatternAs hỏi thẳng app, không qua cache).

const (
	patternExpandCollapse = 10005
	patternToggle         = 10015
	patternScroll         = 10017
)

var (
	iidUIAScrollItem     = parseGUID("b488300f-d015-4f19-9c29-bb595e3645ef")
	iidUIAToggle         = parseGUID("94cf8058-9b8d-4ab9-8bfd-4cd0a33c8c70")
	iidUIAExpandCollapse = parseGUID("619be086-1f4e-4ee4-bafa-210128738730")
)

// scrollTo cuộn nút thứ index (thứ tự như readElements) vào khung nhìn – cây đổi giữa hai lần thì có thể cuộn nhầm,
// nơi gọi phải đọc lại để đo.
func scrollTo(app string, index int) error { return actAt(app, index, model.ElActScroll, "") }

// actAt làm act (model.ElAct*) với nút thứ index của lần readElements vừa đọc. nil = app nhận lệnh (chưa chắc đã đổi –
// engine đọc lại để kiểm).
func actAt(app string, index int, act, value string) error {
	hwnds, name, err := appWindows(app)
	if err != nil {
		return appErr(err, name)
	}
	acted := false
	var actErr error
	onCOM(func() {
		_, err = uiaWalkWindows(hwnds, func(i int, el *comObj) bool {
			if i == index {
				acted, actErr = true, uiaDo(el, act, value)
			}
			return i == index
		})
	})
	switch {
	case err != nil:
		return err
	case !acted:
		return errors.New("không thấy lại phần tử (trang vừa đổi)")
	}
	return actErr
}

func uiaDo(el *comObj, act, value string) error {
	switch act {
	case model.ElActPress:
		return uiaPress(el)
	case model.ElActSetValue:
		return uiaSetValue(el, value)
	case model.ElActExpand:
		return uiaPattern(el, patternExpandCollapse, iidUIAExpandCollapse, 3, "ExpandCollapse.Expand")
	case model.ElActCollapse:
		return uiaPattern(el, patternExpandCollapse, iidUIAExpandCollapse, 4, "ExpandCollapse.Collapse")
	case model.ElActSelect:
		return uiaPattern(el, patternSelectionItem, iidUIASelectionItem, 3, "SelectionItem.Select")
	case model.ElActScroll:
		return uiaPattern(el, patternScroll, iidUIAScrollItem, 3, "ScrollItem.ScrollIntoView")
	}
	return fmt.Errorf("thao tác %q không có", act)
}

// uiaPress – AXPress của macOS gộp nhiều pattern của UIA: nút / liên kết có Invoke, checkbox / switch chỉ có Toggle,
// radio / tab / mục danh sách chỉ có SelectionItem, nút mở menu có thể chỉ có ExpandCollapse. Thử lần lượt.
func uiaPress(el *comObj) error {
	if uiaPattern(el, patternInvoke, iidUIAInvoke, 3, "Invoke") == nil ||
		uiaPattern(el, patternToggle, iidUIAToggle, 3, "Toggle.Toggle") == nil ||
		uiaPattern(el, patternSelectionItem, iidUIASelectionItem, 3, "SelectionItem.Select") == nil ||
		uiaPattern(el, patternExpandCollapse, iidUIAExpandCollapse, 3, "ExpandCollapse.Expand") == nil {
		return nil
	}
	return errors.New("phần tử không bấm được qua UI Automation (không có Invoke / Toggle / SelectionItem)")
}

func uiaSetValue(el *comObj, value string) error {
	var p *comObj
	if err := vcall(el, "GetCurrentPatternAs", 14, patternValue, uintptr(unsafe.Pointer(iidUIAValue)), uintptr(unsafe.Pointer(&p))); err != nil || p == nil {
		return errors.New("phần tử không cho đặt giá trị (không có ValuePattern)")
	}
	defer p.release()
	u := append(utf16.Encode([]rune(value)), 0)
	b, _, _ := oleSysAllocStringLen.Call(uintptr(unsafe.Pointer(&u[0])), uintptr(len(u)-1))
	defer procSysFreeString.Call(b)
	return vcall(p, "Value.SetValue", 3, b)
}
