package mcpsrv

import (
	"context"
	"errors"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/perm"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// Thử trang + ưu tiên node (bước 44): probe_page mở trang trên Chrome của app, dò captcha / chặn bot / canvas → AI
// biết trang dùng được node web không; ưu tiên node (ảnh / chữ mặc định | web) AI đọc / đổi tự do, guide đổi theo.

// nodePrefTips – mục thêm vào guide theo ưu tiên node hiện tại.
var nodePrefTips = map[string]string{
	store.NodePrefWeb: `Ưu tiên node web (Cài đặt / set_node_preference): việc trên trang web → probe_page(url) trước.
- verdict ok: node open (webBrowser true – Chrome của app) + webWait / webClick / webType / webRead / webScroll / webKey (phím qua Chrome của app – không rơi vào app khác), selector lấy từ outline (sel) – chính xác hơn tìm chữ / ảnh.
- Trang đã mở và đang thao tác dở (hộp thoại, popup): read_web_outline(dialog: true) lấy selector thật của ô / nút trong hộp thoại, thay vì đoán rồi chạy thử.
- Nhiều tab (cùng URL, popup): probe_page / read_web_outline trả tab (id) + tabs – đặt tab = id cho node web khi chạy thử để không nhầm tab; kịch bản lưu lại thì đổi tab sang chuỗi trong URL (id đổi khi Chrome của app mở lại).
- Form trong hộp thoại: node web đặt webScope "dialog" (bỏ ô cùng tên ở trang phía sau); ô theo nhãn: label="Ngày sinh" (cả nhãn antd không gắn for); nhiều chỗ khớp: occurrence N. Ô tuỳ biến (chọn ngày, editor) báo "không nhận focus" dù đã vào đúng ô → webType skipFocusCheck true.
- loading (trang tải lâu): chờ vài giây rồi probe_page không url (dò lại tab, không tải lại) – tối đa 2–3 lần, vẫn loading thì screenshot xem trang rồi quyết.
- captcha / blocked / canvas / empty: dùng node ảnh / chữ (open bằng trình duyệt thường, waitImage / clickImage findBy "text") và nói người dùng lý do (signs).
- Chrome của app chỉ để trang không cần đăng nhập – không đăng nhập tài khoản thật ở đó (dễ bị captcha / khoá); trang cần đăng nhập dùng trình duyệt thường + node ảnh / chữ.`,
	store.NodePrefVision: `Ưu tiên node ảnh / chữ (mặc định): trang web cũng làm bằng node open (trình duyệt thường) + tìm chữ / ảnh trên màn hình.
- Chỉ dùng node web khi người dùng xin hoặc sau khi đổi ưu tiên (set_node_preference "web"); muốn biết trang có dùng được node web không → probe_page(url).`,
}

type probeIn struct {
	URL string `json:"url,omitempty" jsonschema:"trang cần thử (https://… hoặc tên miền); bỏ trống = dò lại tab đang mở, không tải lại"`
}

type outlineIn struct {
	Tab    string `json:"tab,omitempty" jsonschema:"id tab (lấy từ tabs của lần gọi trước) hoặc chuỗi có trong URL / tiêu đề tab; bỏ trống = tab đang hiện"`
	Dialog bool   `json:"dialog,omitempty" jsonschema:"true = chỉ phần tử trong hộp thoại (role=dialog) đang mở trên cùng – form sửa / tạo mới"`
}

type prefIn struct {
	Pref string `json:"pref" jsonschema:"vision (node ảnh / chữ – mặc định) | web (thử trang trên Chrome của app trước, không captcha thì dùng node web)"`
}

func (s *Server) addWebTools() {
	addTool(s, KindRun, &mcp.Tool{Name: "probe_page", Description: "Mở thử trang trên Chrome của app (profile riêng, không đăng nhập), chờ trang yên " +
		"(≤ 30 s) rồi dò captcha / chặn bot / game vẽ canvas: verdict ok (dùng được node web) | captcha | blocked | canvas | empty | " +
		"loading (trang tải lâu, chưa hiện gì), useWeb, signs (dấu hiệu), elements, outline (≤ 40 phần tử kèm selector sel dùng được cho node web), tab (id tab đã dò), tabs (tab đang mở kèm id). " +
		"Gọi trước khi soạn node web cho một trang. Không truyền url = dò lại tab đang mở, không tải lại: verdict loading hoặc loaded false " +
		"→ chờ vài giây rồi gọi lại không url (hoặc screenshot để xem trang)."}, s.probePage)
	addTool(s, KindRead, &mcp.Tool{Name: "read_web_outline", Description: "Đọc cấu trúc trang của tab đang điều khiển trên Chrome của app (không bật trình duyệt, không đụng chuột / phím): " +
		"outline = từng dòng vai trò \"tên\" = giá trị [trạng thái] selector  – chép selector vào node web; tab = id tab đã đọc; tabs = mọi tab đang mở " +
		"(id, title, url; đứng đầu = đang dùng) – truyền id vào tab để đọc / ghim tab khác; dialog true = chỉ hộp thoại đang mở (form antd). " +
		"Khác probe_page: không mở trang, không dò captcha – dùng khi trang đã mở và đang thao tác dở (popup, hộp thoại)."}, s.readWebOutline)
	addTool(s, KindRead, &mcp.Tool{Name: "get_preferences", Description: "Cài đặt của app ảnh hưởng cách soạn: nodePref (vision | web), " +
		"mức chạy của AI (run), quyền hệ điều hành đang thiếu (missingPermissions)."}, s.getPrefs)
	addTool(s, KindRead, &mcp.Tool{Name: "check_permissions", Description: "Quyền hệ điều hành (macOS) và trạng thái từng quyền: granted | denied | unknown | notNeeded. " +
		"Kiểm tra không bật hộp thoại. Gọi trước khi soạn / chạy node cần quyền (chuột, phím, chụp màn hình, Chrome…) để biết quyền nào thiếu – nhờ người dùng cấp ở Cài đặt → Quyền, đừng chạy thử rồi mới biết lỗi permission."}, s.checkPerms)
	addTool(s, KindSettings, &mcp.Tool{Name: "set_node_preference", Description: "Đổi ưu tiên node khi soạn: vision = node ảnh / chữ (mặc định), " +
		"web = thử trang (probe_page) trước, không captcha thì dùng node web. Đổi ngay, app báo người dùng; guide (get_step_types) theo mức mới."}, s.setPref)
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
	return ok(map[string]any{"nodePref": m.NodePreference(), "run": m.RunMode(), "missingPermissions": perm.DeniedOf(s.back.Permissions())})
}

func (s *Server) setPref(_ context.Context, _ *mcp.CallToolRequest, in prefIn) (*mcp.CallToolResult, any, error) {
	p := strings.ToLower(strings.TrimSpace(in.Pref))
	if err := s.back.SetNodePref(p); err != nil {
		return fail(err)
	}
	return ok(map[string]any{"nodePref": p, "tips": nodePrefTips[p]})
}

func (s *Server) readWebOutline(ctx context.Context, _ *mcp.CallToolRequest, in outlineIn) (*mcp.CallToolResult, any, error) {
	o, tabs, err := s.back.ReadOutline(ctx, strings.TrimSpace(in.Tab), in.Dialog)
	if err != nil {
		return fail(err)
	}
	if !isWebURL(o.URL) { // tab file:// / chrome:// – không đưa nội dung cho AI (như probe_page)
		return fail(errors.New("tab đang đọc không phải trang http:// / https:// – chọn tab khác bằng tab (id) hoặc mở trang bằng probe_page"))
	}
	return ok(map[string]any{
		"url": o.URL, "title": o.Title, "tab": o.Tab, "tabs": webTabs(tabs), "dialogs": o.Dialogs,
		"total": o.Total, "outline": o.Text(),
	})
}

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
	return ok(map[string]any{"permissions": s.back.Permissions()})
}
