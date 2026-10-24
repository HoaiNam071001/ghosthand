// Package perm kiểm tra (và xin) quyền hệ điều hành mà các node cần – để người dùng biết thiếu quyền trước khi chạy.
package perm

// ID của một quyền; node khai báo quyền cần theo ID này (bước 48 P2).
type ID string

const (
	Accessibility    ID = "accessibility"    // chuột / phím, đọc phần tử màn hình
	ScreenRecording  ID = "screenRecording"  // chụp màn hình, tìm ảnh / chữ
	AutoChrome       ID = "autoChrome"       // điều khiển Google Chrome (tab, PDF)
	AutoFinder       ID = "autoFinder"       // Thùng rác
	AutoSystemEvents ID = "autoSystemEvents" // cửa sổ, nguồn, màn hình, bộ gõ
	Notifications    ID = "notifications"    // node Thông báo
)

// State của một quyền.
type State string

const (
	Granted   State = "granted"
	Denied    State = "denied"
	Unknown   State = "unknown" // chưa hỏi lần nào, hoặc không xác định được mà không bật hộp thoại
	NotNeeded State = "notNeeded"
)

// Item là một dòng trong danh sách quyền.
type Item struct {
	ID    ID     `json:"id"`
	Name  string `json:"name"`
	State State  `json:"state"`
	Hint  string `json:"hint"` // cách cấp, tiếng Việt
	Note  string `json:"note"` // ghi chú riêng lần kiểm tra này (vd ứng dụng đích chưa mở); có thể rỗng
	// Manual: không kiểm tra được bằng code – người dùng tự xem trong System Settings.
	Manual bool `json:"manual"`
}

// Prober là phần phụ thuộc hệ điều hành (macOS thật, bản giả khi test).
type Prober interface {
	// IDs: các quyền áp dụng cho hệ điều hành này, theo thứ tự hiện.
	IDs() []ID
	// Probe đọc trạng thái mà không bật hộp thoại nào. note giải thích khi state là Unknown.
	Probe(id ID) (state State, note string)
	// Request bật hộp thoại xin quyền (nếu hệ điều hành có) rồi trả trạng thái mới.
	Request(id ID) (state State, note string)
	// OpenSettings mở đúng mục trong System Settings.
	OpenSettings(id ID) error
}

type meta struct {
	name   string
	hint   string
	manual bool
}

var metas = map[ID]meta{
	Accessibility:    {name: "Trợ năng (Accessibility)", hint: "Cần để điều khiển chuột / bàn phím và đọc phần tử trên màn hình. System Settings → Privacy & Security → Accessibility."},
	ScreenRecording:  {name: "Ghi màn hình (Screen Recording)", hint: "Cần để chụp màn hình, tìm ảnh / chữ. Cấp xong thường phải mở lại app."},
	AutoChrome:       {name: "Tự động hoá → Google Chrome", hint: "Cần cho node Tab trình duyệt, Đi tới URL, Lưu PDF. Mở Chrome rồi bấm Cấp quyền."},
	AutoFinder:       {name: "Tự động hoá → Finder", hint: "Cần cho node Tệp khi xoá vào Thùng rác."},
	AutoSystemEvents: {name: "Tự động hoá → System Events", hint: "Cần cho node Cửa sổ, Nguồn, Màn hình, Bộ gõ."},
	Notifications:    {name: "Thông báo", hint: "Cần cho node Thông báo hệ thống. Không kiểm tra tự động được – xem System Settings → Notifications.", manual: true},
}

// Check trả danh sách quyền của hệ điều hành kèm trạng thái hiện tại.
func Check(p Prober) []Item {
	items := []Item{}
	for _, id := range p.IDs() {
		items = append(items, item(p, id, false))
	}
	return items
}

// Request xin quyền id rồi trả dòng đã cập nhật.
func Request(p Prober, id ID) (Item, bool) {
	if _, ok := metas[id]; !ok {
		return Item{}, false
	}
	return item(p, id, true), true
}

func item(p Prober, id ID, request bool) Item {
	m := metas[id]
	var st State
	var note string
	switch {
	case m.manual:
		st = Unknown
	case request:
		st, note = p.Request(id)
	default:
		st, note = p.Probe(id)
	}
	return Item{ID: id, Name: m.name, State: st, Hint: m.hint, Note: note, Manual: m.manual}
}
