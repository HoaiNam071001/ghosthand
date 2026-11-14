package mcpsrv

import (
	"context"
	"errors"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/perm"
	"ghosthand/internal/textop"
	"ghosthand/internal/web"
)

// Thử trang (bước 44): probe_page mở trang trên Chrome của app, dò captcha / chặn bot / canvas → AI biết trang dùng
// được node web không. AI mặc định dùng node ảnh / chữ; node web chỉ khi người dùng xin (bỏ cài đặt ưu tiên node).

// webTips – cách dùng node web khi người dùng xin (get_step_types topic=web + bản đầy đủ).
const webTips = `Node web chỉ khi người dùng xin (mặc định node ảnh / chữ: open trình duyệt thường + tìm chữ / ảnh trên màn hình). Việc trên trang web → probe_page(url) trước.
- verdict ok: node open (webBrowser true – Chrome của app) + webWait / webClick / webType / webRead / webScroll / webKey (phím qua Chrome của app – không rơi vào app khác), selector lấy từ outline (sel) – chính xác hơn tìm chữ / ảnh.
- Trang đã mở và đang thao tác dở (hộp thoại, popup): read_web_outline(dialog: true) lấy selector thật của ô / nút trong hộp thoại, thay vì đoán rồi chạy thử. Trang lớn, chỉ cần vài nút: find: "Gửi" (hoặc /regex/) – chỉ dòng khớp + vùng bao ngoài.
- Nhiều tab (cùng URL, popup): probe_page / read_web_outline trả tab (id) + tabs – đặt tab = id cho node web khi chạy thử để không nhầm tab; kịch bản lưu lại thì đổi tab sang chuỗi trong URL (id đổi khi Chrome của app mở lại).
- Form trong hộp thoại: node web đặt webScope "dialog" (bỏ ô cùng tên ở trang phía sau); ô theo nhãn: label="Ngày sinh" (cả nhãn antd không gắn for); nhiều chỗ khớp: occurrence N. Ô tuỳ biến (chọn ngày, editor) báo "không nhận focus" dù đã vào đúng ô → webType skipFocusCheck true.
- loading (trang tải lâu): chờ vài giây rồi probe_page không url (dò lại tab, không tải lại) – tối đa 2–3 lần, vẫn loading thì screenshot xem trang rồi quyết.
- captcha / blocked / canvas / empty: dùng node ảnh / chữ (open bằng trình duyệt thường, waitImage / clickImage findBy "text") và nói người dùng lý do (signs).
- Trang cần đăng nhập: không tự gõ mật khẩu trong Chrome của app – nhờ người dùng bấm Đăng nhập ở node web (mở như Chrome thường), đăng nhập rồi bấm Xong; hoặc dùng trình duyệt thường + node ảnh / chữ.`

type probeIn struct {
	URL string `json:"url,omitempty" jsonschema:"trang cần thử (https://… hoặc tên miền); bỏ trống = dò lại tab đang mở, không tải lại"`
}

type outlineIn struct {
	Tab    string `json:"tab,omitempty" jsonschema:"id tab (lấy từ tabs của lần gọi trước) hoặc chuỗi có trong URL / tiêu đề tab; bỏ trống = tab đang hiện"`
	Dialog bool   `json:"dialog,omitempty" jsonschema:"true = chỉ phần tử trong hộp thoại (role=dialog) đang mở trên cùng – form sửa / tạo mới"`
	Find   string `json:"find,omitempty" jsonschema:"chỉ dòng tên / giá trị chứa chữ (bỏ dấu) hoặc /regex/ + vùng ngoài"`
}

func (s *Server) addWebTools() {
	addTool(s, KindRun, &mcp.Tool{Name: "probe_page", Description: "Mở thử trang trên Chrome của app (profile riêng, không đăng nhập), chờ trang yên " +
		"(≤ 30 s) rồi dò captcha / chặn bot / game vẽ canvas: verdict ok (dùng được node web) | captcha | blocked | canvas | empty | " +
		"loading (trang tải lâu, chưa hiện gì), useWeb, signs (dấu hiệu), elements, outline (≤ 40 phần tử kèm selector sel dùng được cho node web), tab (id tab đã dò), tabs (tab đang mở kèm id). " +
		"Gọi trước khi soạn node web cho một trang. Không truyền url = dò lại tab đang mở, không tải lại: verdict loading hoặc loaded false " +
		"→ chờ vài giây rồi gọi lại không url (hoặc screenshot để xem trang)."}, s.probePage)
	addTool(s, KindRead, &mcp.Tool{Name: "read_web_outline", Description: "Đọc cấu trúc trang của tab trên Chrome của app (chỉ đọc, không bật trình duyệt): " +
		"outline = từng dòng vai trò \"tên\" = giá trị [trạng thái] selector – chép vào node web; tab = id tab đã đọc; tabs = các tab " +
		"(id, title, url; đầu = đang dùng) – id truyền vào tab để đọc tab khác; dialog true = chỉ hộp thoại đang mở. " +
		"Khác probe_page: không mở trang / dò captcha – cho trang đang dở (popup, hộp thoại)."}, s.readWebOutline)
	addTool(s, KindRead, &mcp.Tool{Name: "get_preferences", Description: "Cài đặt của app ảnh hưởng cách soạn: " +
		"mức chạy của AI (run), quyền hệ điều hành đang thiếu (missingPermissions)."}, s.getPrefs)
	addTool(s, KindRead, &mcp.Tool{Name: "check_permissions", Description: "Quyền hệ điều hành (macOS) và trạng thái từng quyền: granted | denied | unknown | notNeeded. " +
		"Kiểm tra không bật hộp thoại. env: lỗi môi trường. Gọi trước khi soạn / chạy node cần quyền (chuột, phím, chụp màn hình, Chrome…) để biết quyền nào thiếu – nhờ người dùng cấp ở Cài đặt → Quyền, đừng chạy thử rồi mới biết lỗi permission."}, s.checkPerms)
}

func (s *Server) probePage(ctx context.Context, _ *mcp.CallToolRequest, in probeIn) (*mcp.CallToolResult, any, error) {
	u := strings.TrimSpace(in.URL)
	if u != "" && !strings.Contains(u, "://") {
		u = "https://" + u
	}
	// chỉ trang web – file:// sẽ cho AI đọc file trên máy qua outline (MCP không có quyền đọc file).
	// Dò lại (url rỗng) dùng tab Chrome của app đang mở – tab đó do probe_page / người dùng mở.
	if u != "" && !isWebURL(u) {
		return fail(errors.New("probe_page chỉ mở trang http:// / https://"))
	}
	pc, err := s.back.CheckPage(ctx, u)
	if err != nil {
		return fail(err)
	}
	if !isWebURL(pc.URL) { // dò lại trúng tab file:// / chrome:// người dùng tự mở
		return fail(errors.New("tab đang mở không phải trang http:// / https:// – gọi probe_page kèm url"))
	}
	pc.Tabs = webTabs(pc.Tabs)
	return ok(pc)
}

func isWebURL(u string) bool {
	l := strings.ToLower(u)
	return strings.HasPrefix(l, "https://") || strings.HasPrefix(l, "http://")
}

func (s *Server) getPrefs(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	m := s.back.MCP()
	return ok(map[string]any{"run": m.RunMode(), "missingPermissions": perm.DeniedOf(s.back.Permissions())})
}

func (s *Server) readWebOutline(ctx context.Context, _ *mcp.CallToolRequest, in outlineIn) (*mcp.CallToolResult, any, error) {
	find, err := textop.NewFinder(in.Find)
	if err != nil {
		return fail(err)
	}
	o, tabs, err := s.back.ReadOutline(ctx, strings.TrimSpace(in.Tab), in.Dialog, find != nil)
	if err != nil {
		return fail(err)
	}
	if !isWebURL(o.URL) { // tab file:// / chrome:// – không đưa nội dung cho AI (như probe_page)
		return fail(errors.New("tab đang đọc không phải trang http:// / https:// – chọn tab khác bằng tab (id) hoặc mở trang bằng probe_page"))
	}
	out := map[string]any{"url": o.URL, "title": o.Title, "tab": o.Tab, "tabs": webTabs(tabs), "dialogs": o.Dialogs}
	if find != nil {
		var matched int
		if o, matched = findOutline(o, find, maxFindLines); matched == 0 {
			out["hint"] = "không dòng nào có tên / giá trị khớp find – thử chữ ngắn hơn, hoặc bỏ find để đọc cả cây"
		}
		out["matches"] = matched
	}
	out["total"], out["outline"] = o.Total, o.Text()
	return ok(out)
}

// maxFindLines – số dòng tối đa khi lọc bằng find (dòng khớp + vùng bao ngoài).
const maxFindLines = 80

// webTabs – chỉ tab http(s): tab file:// / chrome:// của người dùng không lộ cho AI.
func webTabs(tabs []web.Tab) []web.Tab {
	out := make([]web.Tab, 0, len(tabs))
	for _, t := range tabs {
		if isWebURL(t.URL) {
			out = append(out, t)
		}
	}
	return out
}

func (s *Server) checkPerms(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	return ok(map[string]any{"permissions": s.back.Permissions(), "env": s.back.EnvWarnings(nil)})
}
