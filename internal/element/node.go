// Package element – phần tử màn hình đọc qua cây accessibility của hệ điều hành (bước 37: macOS AX, Windows UIA):
// kiểu nút trung lập với hệ điều hành + tìm theo selector text= / aria= / role= như node web 25d. Logic thuần, không
// gọi hệ điều hành (đọc cây ở internal/device/element*.go).
package element

import (
	"strings"

	"ghosthand/internal/model"
)

// Node – một phần tử trong cây, danh sách phẳng theo thứ tự duyệt cây (cha trước con – thứ tự đọc).
type Node struct {
	Role        string     // vai trò chuẩn hoá kiểu web (button, link, textbox, text…) – dùng cho role=
	Raw         string     // vai trò gốc của hệ điều hành (AXButton / AXStaticText…) – để báo lỗi, gỡ rối
	Title       string     // chữ hiện trên phần tử (nút, liên kết, tiêu đề cửa sổ)
	Desc        string     // nhãn mô tả (web: aria-label; app: nút chỉ có icon)
	Value       string     // giá trị: chữ của khối chữ, nội dung ô nhập, mục select đang chọn, checkbox 0 / 1
	Placeholder string     // chữ mờ của ô nhập
	Selected    string     // đoạn chữ đang bôi đen trong ô soạn thảo (macOS AXSelectedText; trống = không có / chưa đọc được)
	Box         model.Rect // khung theo toạ độ màn hình của robotgo (macOS: point)
	Depth       int        // độ sâu trong cây (0 = cửa sổ)
}

// Name – tên truy cập rút gọn (như accName của 25d): nhãn mô tả / chữ trên phần tử → chữ mờ → chữ của khối chữ.
func (n Node) Name() string {
	for _, s := range []string{n.Title, n.Desc, n.Placeholder} {
		if s != "" {
			return s
		}
	}
	if n.Role == RoleText {
		return n.Value
	}
	return ""
}

// ownText – chữ người dùng thấy trên phần tử (text=): khối chữ → nội dung, ô nhập → chữ mờ, còn lại → chữ trên phần tử.
func (n Node) ownText() string {
	switch {
	case n.Role == RoleText:
		return n.Value
	case editable(n.Role):
		return n.Placeholder
	}
	return n.Title
}

// Text – chữ đọc ra của phần tử (node Đọc phần tử): ô nhập / select → giá trị (ô trống → "", không lấy nhãn),
// khối chữ → nội dung, còn lại → tên.
func (n Node) Text() string {
	if editable(n.Role) || n.Role == RoleText {
		return n.Value
	}
	return n.Name()
}

// Shown – khung có cỡ thật. Phần tử ngoài viewport / ngoài khung cuộn bị kẹp ở mép (cao hoặc rộng 0–1) – phải cuộn
// tới rồi đo lại mới bấm được.
func (n Node) Shown() bool { return n.Box.W > 1 && n.Box.H > 1 }

const RoleText = "text"

func editable(role string) bool {
	return role == "textbox" || role == "searchbox" || role == "combobox" || role == "spinbutton"
}

// subroleRoles – subrole macOS rõ nghĩa hơn role (ưu tiên trước axRoles).
var subroleRoles = map[string]string{
	"AXSearchField": "searchbox", "AXSecureTextField": "textbox", "AXSwitch": "switch", "AXTabButton": "tab",
	"AXDialog": "dialog", "AXSystemDialog": "dialog", "AXCloseButton": "button", "AXMinimizeButton": "button",
	"AXZoomButton": "button", "AXFullScreenButton": "button",
	// ARIA trên trang web (Chrome / Safari): role="dialog" | "alertdialog" | "alert" | "status" thành AXGroup + subrole này
	"AXApplicationDialog": "dialog", "AXApplicationAlertDialog": "alertdialog", "AXApplicationAlert": "alert",
	"AXApplicationStatus": "status",
}

// axRoles – role macOS → vai trò kiểu web (cùng tên với IMPLICIT của web/common.js để role= viết như nhau).
var axRoles = map[string]string{
	"AXButton": "button", "AXMenuButton": "button", "AXDisclosureTriangle": "button", "AXLink": "link",
	"AXTextField": "textbox", "AXTextArea": "textbox", "AXComboBox": "combobox", "AXPopUpButton": "combobox",
	"AXCheckBox": "checkbox", "AXRadioButton": "radio", "AXSlider": "slider", "AXIncrementor": "spinbutton",
	"AXStaticText": RoleText, "AXHeading": "heading", "AXImage": "img", "AXList": "list", "AXTable": "table",
	"AXRow": "row", "AXCell": "cell", "AXColumnHeader": "columnheader", "AXWebArea": "document",
	"AXMenuItem": "menuitem", "AXMenuBarItem": "menuitem", "AXTabGroup": "tablist", "AXOutline": "tree",
	"AXProgressIndicator": "progressbar", "AXToolbar": "toolbar",
}

// RoleFromAX – vai trò chuẩn hoá từ role / subrole macOS. Không có trong bảng → bỏ "AX", chữ thường (AXGroup → group).
func RoleFromAX(role, subrole string) string {
	if r, ok := subroleRoles[subrole]; ok {
		return r
	}
	if r, ok := axRoles[role]; ok {
		return r
	}
	return strings.ToLower(strings.TrimPrefix(role, "AX"))
}
