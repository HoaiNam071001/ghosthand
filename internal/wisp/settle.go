package wisp

import (
	"context"
	"strconv"
	"time"

	"ghosthand/internal/web"
)

// Mark / Settle (bước 56 B2) trên Wisp: Mark ghi URL, các tab, số lần tab đã chuyển trang (sự kiện navigate – để
// trong Mark.Doc); Settle chờ lệnh settle của Wisp (hết tải + DOM yên) tối đa settleCap rồi so lại.

const (
	settleFirst = 100 * time.Millisecond // trang kịp bắt đầu điều hướng / dựng lại sau thao tác
	settleCap   = 3 * time.Second        // như Chrome của app: trang tự đổi mãi thì thôi, node sau tự chờ
)

// Mark đánh dấu tab sắp thao tác: lastFind = tab của lần Find gần nhất, không thì tab theo bộ lọc.
func (b *Browser) Mark(ctx context.Context, tab string, lastFind bool) (web.Mark, error) {
	var tabs []tabEntry
	if err := b.call(ctx, "tabs", map[string]any{}, &tabs); err != nil {
		return web.Mark{}, wispErr("tabs", err)
	}
	b.mu.Lock()
	id, prefer := b.lastTab, b.prefer
	b.mu.Unlock()
	if !lastFind || id == 0 {
		t, ok := pickTab(tabs, tab, prefer)
		if !ok {
			return web.Mark{}, &web.BrowserError{Msg: "không thấy tab Wisp nào khớp “" + tab + "”"}
		}
		id = t.ID
	}
	m := web.Mark{Tab: tabArg(id), Tabs: tabIDs(tabs)}
	m.URL, _ = urlOf(tabs, id)
	b.mu.Lock()
	m.Doc = strconv.Itoa(b.navs[id])
	b.mu.Unlock()
	return m, nil
}

// Settle chờ tab của m yên rồi báo điều hướng / tab mới. Hộp thoại JS đang mở thì thôi chờ.
func (b *Browser) Settle(ctx context.Context, m web.Mark) (web.Effect, error) {
	if err := sleepCtx(ctx, settleFirst); err != nil {
		return web.Effect{}, err
	}
	id, _ := strconv.Atoi(m.Tab)
	eff := web.Effect{URL: m.URL}
	b.mu.Lock()
	open := b.dialogs[id] != nil
	b.mu.Unlock()
	if !open {
		err := b.call(ctx, "settle", map[string]any{"tab": m.Tab, "timeoutMs": int(settleCap / time.Millisecond)}, nil)
		switch codeOf(err) {
		case "":
			if err != nil {
				return eff, wispErr("chờ trang yên", err)
			}
			eff.Settled = true
		case "timeout", "no_tab":
		default:
			return eff, wispErr("chờ trang yên", err)
		}
	}
	var tabs []tabEntry
	if err := b.call(ctx, "tabs", map[string]any{}, &tabs); err != nil {
		return eff, wispErr("tabs", err)
	}
	return settleEffect(m, tabs, b.navCount(id), eff.Settled), nil
}

func (b *Browser) navCount(id int) int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.navs[id]
}

// settleEffect – hàm thuần: điều đã xảy ra so với Mark (navs = số lần chuyển trang hiện tại của tab).
func settleEffect(m web.Mark, tabs []tabEntry, navs int, settled bool) web.Effect {
	id, _ := strconv.Atoi(m.Tab)
	eff := web.Effect{Settled: settled}
	for _, t := range tabs {
		if !contains(m.Tabs, tabArg(t.ID)) && eff.Popup == "" {
			eff.Popup = t.URL
		}
	}
	u, alive := urlOf(tabs, id)
	if !alive { // trang tự window.close
		return web.Effect{Popup: eff.Popup, Settled: true}
	}
	eff.URL = u
	eff.Navigated = u != m.URL || strconv.Itoa(navs) != m.Doc
	return eff
}

func tabIDs(tabs []tabEntry) []string {
	out := make([]string, len(tabs))
	for i, t := range tabs {
		out[i] = tabArg(t.ID)
	}
	return out
}

func urlOf(tabs []tabEntry, id int) (string, bool) {
	for _, t := range tabs {
		if t.ID == id {
			return t.URL, true
		}
	}
	return "", false
}

func contains(ids []string, id string) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func sleepCtx(ctx context.Context, d time.Duration) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(d):
		return nil
	}
}
