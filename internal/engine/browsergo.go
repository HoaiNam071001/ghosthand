package engine

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"ghosthand/internal/launch"
	"ghosthand/internal/model"
)

// Node Đi tới URL (bước 43 B2): đổi URL của tab (chọn tab như browserTab – waitTab) rồi chờ trang tải xong. Đặt URL qua
// trình duyệt thay vì Cmd+L + gõ: không cần cửa sổ ở trước, bộ gõ tiếng Việt không làm sai chữ.

func (e *Engine) browserGo(ctx context.Context, s model.Step) (map[string]any, error) {
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	url := launch.BrowserURL(strings.TrimSpace(s.URL))
	if url == "" {
		return nil, &invalidErr{fmt.Sprintf("%q không phải URL / đường dẫn file", s.URL)}
	}
	start := time.Now()
	t, err := e.waitTab(ctx, s)
	if err != nil {
		return nil, err
	}
	old, saw := t.URL, false
	if t.Loading && sameURL(t.URL, url) {
		// Thử lại sau timeout: trang đích đang tải dở thì chỉ chờ tiếp – điều hướng lại làm trang chậm tải lại từ đầu
		saw = true
	} else if err := e.tabs.Go(ctx, t, url); err != nil {
		return nil, err
	}
	err = e.pollUntil(ctx, s, "tab", func() (bool, error) {
		tabs, err := e.tabs.Tabs(ctx, t.Browser)
		if err != nil {
			return false, err
		}
		i := slices.IndexFunc(tabs, func(x model.TabInfo) bool { return x.ID == t.ID })
		if i < 0 {
			return false, &notFoundErr{msg: "tab đã đóng trong lúc tải trang"}
		}
		t = tabs[i]
		saw = saw || t.Loading
		// cùng URL cũ (tải lại / trang chưa đổi kịp): chỉ xong khi đã thấy tải hoặc URL đích đúng là URL cũ
		return !t.Loading && (t.URL != old || saw || old == url), nil
	}, func() error {
		return &timeoutErr{msg: fmt.Sprintf("trang %s chưa tải xong sau %s", url, fmtSeconds(s.TimeoutMs)), detail: map[string]any{"url": t.URL, "title": t.Title, "loading": t.Loading}}
	})
	if err != nil {
		return nil, err
	}
	out := tabOutput(t)
	out["ms"] = int(time.Since(start).Milliseconds())
	return out, nil
}

// sameURL – trình duyệt hay thêm / bớt "/" cuối khi chuẩn hoá URL.
func sameURL(a, b string) bool {
	return strings.TrimRight(a, "/") == strings.TrimRight(b, "/")
}
