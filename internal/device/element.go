package device

import (
	"errors"
	"strings"

	"ghosthand/internal/element"
)

// Phần tử màn hình (bước 37): đọc cây accessibility của app khác (macOS AX – element_darwin.go; Windows UI Automation –
// element_windows.go) để tìm / đọc / bấm phần tử ở Chrome thường và mọi app. Tách interface để test engine bằng cây giả.

// ElementReader đọc các phần tử trong cửa sổ đang hiện của app (tên app hoặc bundle id; "" = app có cửa sổ trên cùng,
// không tính app này), danh sách phẳng theo thứ tự đọc.
type ElementReader interface {
	Elements(app string) ([]element.Node, error)
	// ScrollTo cuộn phần tử thứ index của lần Elements vừa đọc vào khung nhìn (phần tử bị kẹp ở mép – Node.Shown).
	ScrollTo(app string, index int) error
	// Act làm thao tác act (model.ElAct*) với phần tử thứ index của lần Elements vừa đọc, không dùng chuột (bước 43 E1).
	Act(app string, index int, act, value string) error
}

type SystemElements struct{}

func (SystemElements) Elements(app string) ([]element.Node, error) { return readElements(app) }
func (SystemElements) ScrollTo(app string, index int) error        { return scrollTo(app, index) }

func (SystemElements) Act(app string, index int, act, value string) error {
	return actAt(app, index, act, value)
}

var (
	// ErrNoFinder – macOS chưa cho app điều khiển Finder (Thùng rác) – StepError code permission.
	ErrNoFinder = errors.New("chưa cho phép điều khiển Finder")

	// ErrNoAccessibility – app / terminal chưa có quyền Accessibility (StepError code permission).
	ErrNoAccessibility = errors.New("chưa cấp quyền Accessibility – System Settings → Privacy & Security → Accessibility, bật cho app / terminal rồi mở lại")
	// ErrNoWindow – app không có cửa sổ đang hiện: thu nhỏ, ở Space khác, bị ẩn (cây lúc đó đứng – đọc ra giá trị cũ).
	ErrNoWindow = errors.New("app không có cửa sổ đang hiện trên màn – mở cửa sổ ra (không thu nhỏ, cùng Space / desktop đang xem)")
	// ErrAppNotFound – không có app đang chạy trùng tên / bundle id.
	ErrAppNotFound = errors.New("không thấy app đang chạy với tên này")
)

// oneLine gộp khoảng trắng (tên / nhãn hay có xuống dòng, tab). Value giữ nguyên – nội dung ô nhập nhiều dòng.
func oneLine(s string) string { return strings.Join(strings.Fields(s), " ") }
