package device

import (
	"strings"
	"unsafe"
)

// Chữ của ô soạn thảo / tài liệu qua UIA TextPattern (bước 43 E3w) – Word, Notepad, Document của trang web không có
// ValuePattern chứa nội dung, và phần đang chọn chỉ đọc được qua TextPattern. Đọc riêng khi node Đọc tài liệu cần
// (không đưa vào cache của readElements: GetText cả trang mỗi lần đọc cây thì chậm).

const patternText = 10014

var iidUIAText = parseGUID("32eba289-3583-42c9-9c59-3b6d9a1e9b6a")

// docTexts đọc chữ các nút ở indices trong một lần duyệt cây – cả ô (DocumentRange) hoặc phần đang chọn
// (GetSelection). Nút không có TextPattern → "".
func docTexts(app string, indices []int, selection bool) ([]string, error) {
	hwnds, name, err := appWindows(app)
	if err != nil {
		return nil, appErr(err, name)
	}
	want := map[int]int{} // chỉ số nút → vị trí trong out
	last := -1
	for k, i := range indices {
		want[i], last = k, max(last, i)
	}
	out := make([]string, len(indices))
	onCOM(func() {
		_, err = uiaWalkWindows(hwnds, func(i int, el *comObj) bool {
			if k, ok := want[i]; ok {
				out[k] = uiaText(el, selection)
			}
			return i >= last
		})
	})
	return out, err
}

func uiaText(el *comObj, selection bool) string {
	var tp *comObj
	if vcall(el, "GetCurrentPatternAs", 14, patternText, uintptr(unsafe.Pointer(iidUIAText)), uintptr(unsafe.Pointer(&tp))) != nil || tp == nil {
		return ""
	}
	defer tp.release()
	if !selection {
		var r *comObj
		if vcall(tp, "TextPattern.get_DocumentRange", 7, uintptr(unsafe.Pointer(&r))) != nil || r == nil {
			return ""
		}
		defer r.release()
		return rangeText(r)
	}
	var arr *comObj
	if vcall(tp, "TextPattern.GetSelection", 5, uintptr(unsafe.Pointer(&arr))) != nil || arr == nil {
		return ""
	}
	defer arr.release()
	var n int32
	vcall(arr, "TextRangeArray.Length", 3, uintptr(unsafe.Pointer(&n)))
	var parts []string
	for i := int32(0); i < n; i++ {
		var r *comObj
		if vcall(arr, "TextRangeArray.GetElement", 4, uintptr(i), uintptr(unsafe.Pointer(&r))) == nil && r != nil {
			if t := rangeText(r); t != "" { // con trỏ nháy không bôi đen = khoảng rỗng
				parts = append(parts, t)
			}
			r.release()
		}
	}
	return strings.Join(parts, "\n")
}

// rangeText – IUIAutomationTextRange.GetText(-1): cả khoảng, không giới hạn độ dài.
func rangeText(r *comObj) string {
	var b uintptr
	if vcall(r, "TextRange.GetText", 12, ^uintptr(0), uintptr(unsafe.Pointer(&b))) != nil || b == 0 {
		return ""
	}
	defer procSysFreeString.Call(b)
	return bstr(b)
}
