// Package web – node web (bước 25d): tìm phần tử bằng HTML qua CDP trên Chrome của app (profile riêng), trả khung
// phần tử theo toạ độ màn hình để engine bấm bằng chuột thật. Toạ độ trang → màn hình đo bằng chuột (calibrate.go),
// không tính từ kích thước cửa sổ. Engine dùng qua interface Browser để test bằng trình duyệt giả.
package web

import (
	"context"

	"ghosthand/internal/model"
)

// Browser – trình duyệt engine điều khiển. Một bản cho mỗi lần chạy; Close nhả kết nối (không đóng trình duyệt).
type Browser interface {
	// Open mở url trong tab mới (chưa mở trình duyệt thì bật lên); tab này thành tab mặc định của node web sau.
	Open(ctx context.Context, url string) error
	// Find tìm phần tử một lần (không chờ). Không thấy → Found.OK = false, không lỗi.
	Find(ctx context.Context, q Query) (Found, error)
	// Hover đưa chuột thật tới (x, y) – điểm sắp bấm của lần Find (Scroll) gần nhất – và xem trang có nhận đúng chỗ
	// không (D0: số đo cũ, Dock / thanh menu / cửa sổ khác che mà elementFromPoint không thấy). onTarget = điểm nằm
	// trong khung phần tử → phần tử dưới chuột phải là nó.
	Hover(ctx context.Context, x, y int, onTarget bool) (Hover, error)
	// Focused – sau khi click vào phần tử của lần Find (Scroll) gần nhất: ô nhập đang focus có phải nó (con / cha / ô của
	// label) không; không phải thì at mô tả phần tử đang focus.
	Focused(ctx context.Context) (ok bool, at string, err error)
	// Chạy nền (D4b, Query.Background): thao tác qua CDP trên tab của lần Find (Scroll) gần nhất, (x, y) theo toạ độ
	// trong trang như Found.Rect – không đụng chuột / phím thật, không đưa tab lên trước.
	BgClick(ctx context.Context, x, y int, button string, count int) error // count = lần bấm thứ mấy (2 = double-click)
	BgWheel(ctx context.Context, x, y int, dir string) error               // lăn một nấc theo dir (up | down | left | right)
	BgType(ctx context.Context, text string, clear, enter bool) error      // vào ô đang focus: xoá chữ cũ, chèn text, Enter
	// Keys – node webKey (46 B3): bấm phím vào tab (id / URL / tiêu đề chứa; "" = tab node web đang dùng) qua CDP, trả URL tab.
	Keys(ctx context.Context, tab string, keys, mods []string, sequence bool) (string, error)
	// PageOutline – cây rút gọn của tab (outline.go): node web không thấy phần tử thì gửi đoạn gần giống cho AI (31b).
	PageOutline(ctx context.Context, tab string) (Outline, error)
	// Mark / Settle (56 B2): đánh dấu tab trước click / gõ / phím (lastFind = tab của lần Find gần nhất, không thì tab
	// như Keys), sau thao tác chờ trang yên rồi báo điều hướng / tab mới (settle.go).
	Mark(ctx context.Context, tab string, lastFind bool) (Mark, error)
	Settle(ctx context.Context, m Mark) (Effect, error)
	Close()
}

// Query – phần tử cần tìm: thử từng selector theo thứ tự, cái đầu thấy thì dùng.
type Query struct {
	Selectors  []model.Selector
	Tab        string // URL / tiêu đề tab chứa chuỗi này ("" = tab đang hiện)
	Scroll     bool   // sắp bấm (webClick): ngoài viewport thì cuộn vào giữa, bị che thì chưa tính là thấy, tab lên trước
	CheckOnly  bool   // chỉ xem có hay không (webWait chờ mất, webRead) – không đo toạ độ, không di chuột
	Read       string // webRead: đọc vào Found.Value – "text" (chữ hiển thị) | "value" (giá trị ô) | "attr" (thuộc tính Attr)
	Attr       string
	Viewport   bool   // tìm chính khung nhìn của trang (bỏ qua Selectors) – lăn chuột giữa trang (webScroll)
	Scope      string // model.WebScopes: "dialog" = chỉ trong hộp thoại đang mở trên cùng (không có hộp thoại → không thấy)
	Occurrence int    // chỗ thứ mấy trong số phần tử đang hiện (thứ tự trong trang); 0 = chỗ bấm được đầu tiên
	Wheel      bool   // cùng Scroll: ngoài khung nhìn thì không nhảy mà trả Found.Wheel để lăn chuột thật (bước 36)
	// Background: chạy nền – không đưa tab lên trước, không đo toạ độ bằng chuột; Found.Rect theo toạ độ trong trang
	Background bool
	Dialog     string // model.WebDialogs: hộp thoại JS đang mở – "" báo ngay (Found.Dialog) | accept | dismiss tự đóng rồi tìm tiếp
}

// Found – kết quả một lần tìm.
type Found struct {
	OK       bool
	Rect     model.Rect // khung phần tử theo toạ độ màn hình (robotgo); Query.Background: toạ độ trong trang (CSS px)
	Text     string     // chữ hiển thị (cắt ngắn)
	Selector int        // chỉ số selector đã khớp (-1 = không)
	Covered  string     // thấy nhưng bị phần tử khác che – mô tả phần tử che (OK = false)
	Hidden   int        // số phần tử khớp nhưng đang ẩn / cỡ 0 (gợi ý khi không thấy)
	Tab      string     // URL tab đã tìm
	NoTab    bool       // không có tab nào khớp Query.Tab
	Loading  bool       // trang đang tải – không thấy chưa có nghĩa là đã mất
	Moving   bool       // sắp bấm nhưng khung còn đổi giữa 2 lần đọc (hiệu ứng, trang đang dàn lại) – OK = false
	OffView  bool       // thấy nhưng tâm nằm ngoài vùng nhìn thấy của trang (chưa cuộn tới)
	Count    int        // số phần tử đang hiện khớp selector đã dùng
	Counts   []SelCount // số khớp từng selector đã xét (không thấy: mọi selector) – chi tiết lỗi cho AI
	NoDialog bool       // Query.Scope dialog nhưng trang không có hộp thoại đang mở
	Value    string     // Query.Read: giá trị đọc được
	Wheel    *Wheel     // Query.Wheel và phần tử ngoài khung nhìn: khung cần lăn (OK = false, Rect là khung phần tử)
	Dialog   *Dialog    // trang đang mở hộp thoại JS, Query.Dialog "" – chưa tìm (OK = false)
	Handled  *Dialog    // hộp thoại JS đã tự đóng theo Query.Dialog trước khi tìm
}

// Wheel – chỗ lăn chuột để phần tử vào khung nhìn: At giữa phần thấy được của khung cuộn (toạ độ màn hình), hướng
// up | down | left | right, Px quãng còn lại (CSS px) để biết lăn mấy nấc.
type Wheel struct {
	At  model.Point
	Dir string
	Px  int
}

// SelCount – số phần tử khớp một selector: đang hiện / ẩn (cỡ 0, display none…).
type SelCount struct {
	Shown  int `json:"shown"`
	Hidden int `json:"hidden"`
}

// Hover – kết quả thử hover trước khi bấm. OK = false → chưa bấm, tìm lại (Miss nói vì sao, để báo khi hết giờ).
type Hover struct {
	OK   bool
	Miss string
}

// ErrNoBrowser – Chrome của app chưa mở / không còn tab phù hợp (StepError code browser).
var ErrNoBrowser error = &BrowserError{"Chrome của app chưa mở – thêm node Mở URL với tuỳ chọn “Chrome của app” trước node web"}

// BrowserError – lỗi kết nối / điều khiển trình duyệt (StepError code browser).
type BrowserError struct{ Msg string }

func (e *BrowserError) Error() string { return e.Msg }

// QueryError – selector lỗi khi chạy trong trang (CSS / XPath sai cú pháp…) – StepError code invalid_input.
type QueryError struct{ Msg string }

func (e *QueryError) Error() string { return e.Msg }
