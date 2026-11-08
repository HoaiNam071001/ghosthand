package web

import (
	"context"
	"time"
)

// Trang yên + điều gì đã xảy ra sau thao tác (bước 56 B2, học chrome-devtools-mcp waitForEventsAfterAction): trước
// click / gõ / phím đánh dấu tab (Mark), sau đó chờ DOM yên bằng MutationObserver rồi báo điều hướng / tab mới
// (Settle). Hỏi từ Go mỗi settlePoll – không dùng setTimeout trong trang (tab chạy nền bị bóp timer còn 1 lần / giây).

const (
	settleFirst = 100 * time.Millisecond // chờ đầu: trang kịp bắt đầu điều hướng / dựng lại sau thao tác
	settleQuiet = 100 * time.Millisecond // không thêm / bớt phần tử chừng này = yên
	settleCap   = 3 * time.Second        // trần chờ – trang tự đổi mãi (feed, quảng cáo) thì thôi, node sau tự chờ
	settlePoll  = 50 * time.Millisecond
)

// settleJS – cài MutationObserver (một lần mỗi document, trong isolated world) ghi lúc cuối có phần tử thêm / bớt;
// chỉ tính phần tử (đồng hồ đổi chữ, carousel đổi style không làm trang "chưa yên"). doc: mã của document – đổi = đã
// điều hướng sang trang mới (world mất biến khi trang tải lại).
const settleJS = `(() => {
  let s = window.__ghSettle;
  if (!s) {
    s = window.__ghSettle = {doc: Math.random().toString(36).slice(2), last: Date.now()};
    const el = (l) => { for (const n of l) if (n.nodeType === 1) return true; return false; };
    new MutationObserver((recs) => {
      for (const r of recs) if (el(r.addedNodes) || el(r.removedNodes)) { s.last = Date.now(); return; }
    }).observe(document, {childList: true, subtree: true});
  }
  return {doc: s.doc, idle: Date.now() - s.last, state: document.readyState, nodes: document.getElementsByTagName('*').length};
})()`

// settleProbe – trạng thái trang mỗi lần hỏi (dùng chung cho chờ trang tải – pageload.go).
type settleProbe struct {
	Doc   string `json:"doc"`
	Idle  int    `json:"idle"`  // ms từ lần cuối có phần tử thêm / bớt (từ lúc cài nếu chưa có)
	State string `json:"state"` // document.readyState
	Nodes int    `json:"nodes"` // số phần tử trong DOM
}

func (p settleProbe) quiet() bool {
	return p.State != "loading" && time.Duration(p.Idle)*time.Millisecond >= settleQuiet
}

// Mark – tab trước thao tác.
type Mark struct {
	Tab  string   // id tab sẽ thao tác
	URL  string   // URL lúc đánh dấu
	Doc  string   // mã document (settleJS)
	Tabs []string // id các tab đang mở – tab mới sau thao tác = popup
	nav  int      // số lần khung chính bắt đầu tải (navWatch) lúc đánh dấu
}

// Effect – điều đã xảy ra sau thao tác.
type Effect struct {
	Navigated bool   // sang trang khác / tải lại / đổi URL trong trang (SPA)
	URL       string // URL tab sau thao tác
	Popup     string // URL tab mới mở ("" = không có)
	Settled   bool   // trang yên trước settleCap
}

// settleState – một lần hỏi trong Settle: probe tab (ok = đọc được – đang chuyển trang thì không), tab đang mở, tải.
type settleState struct {
	probe   settleProbe
	ok      bool
	url     string
	popup   string
	loading bool // khung chính đang tải (navWatch)
	started bool // khung chính đã bắt đầu tải sau Mark
	closed  bool // tab đã đóng (trang tự window.close)
}

// settleDone – hàm thuần: đủ yên để trả chưa; kèm Effect theo trạng thái cuối. Bắt đầu tải mà xong vẫn document cũ
// (link tải file, 204) = không điều hướng; hết giờ khi còn đang tải trang mới = có.
func settleDone(m Mark, s settleState) (bool, Effect) {
	if s.closed {
		return true, Effect{Popup: s.popup, Settled: true}
	}
	newDoc := s.ok && s.probe.Doc != m.Doc
	moving := s.started && (s.loading || !s.ok)
	eff := Effect{Navigated: newDoc || moving || s.url != m.URL, URL: s.url, Popup: s.popup}
	if !s.ok || s.loading || !s.probe.quiet() {
		return false, eff
	}
	eff.Settled = true
	return true, eff
}

// openedTab – tab có trong tabs mà không có lúc đánh dấu (tab đầu tiên tìm thấy).
func openedTab(m Mark, tabs []tabInfo) string {
	for _, t := range tabs {
		if !contains(m.Tabs, t.ID) {
			return t.URL
		}
	}
	return ""
}

func contains(ids []string, id string) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func tabIDs(tabs []tabInfo) []string {
	ids := make([]string, len(tabs))
	for i, t := range tabs {
		ids[i] = t.ID
	}
	return ids
}

func urlOf(tabs []tabInfo, id string) string {
	for _, t := range tabs {
		if t.ID == id {
			return t.URL
		}
	}
	return ""
}

func probeSettle(ctx, tctx context.Context) (settleProbe, error) {
	return evalJS[settleProbe](ctx, tctx, "chờ trang yên", settleJS)
}
