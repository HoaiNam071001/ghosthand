package web

import (
	"context"
	"time"
)

// Chờ trang trước khi thử trang (bước 44 T6): nhiều trang không bao giờ tới readyState complete (quảng cáo, tracking
// tải mãi) nhưng nội dung đã dùng được → dò khi số phần tử đứng yên một lúc, không đợi complete.

const (
	loadTimeout = 30 * time.Second
	settleFor   = 1500 * time.Millisecond // số phần tử đứng yên chừng này thì dò (trang chạy JS / tự chuyển tiếp xong)
	loadPoll    = 300 * time.Millisecond
)

// loadWatch quyết định khi nào trang đủ yên để dò (hàm thuần theo chuỗi mẫu, có test).
type loadWatch struct {
	last  int
	since time.Time
}

// settled – mẫu p lúc now: trang đã qua giai đoạn tải HTML và số phần tử không đổi đáng kể trong settleFor.
// Đổi ít (≤ 2 %, tối thiểu 3 phần tử) coi như yên – trang có đồng hồ / carousel không bao giờ đứng hẳn. Probe dùng
// chung với Settle (settle.go): MutationObserver không thấy phần tử thêm / bớt suốt settleFor thì yên ngay.
func (w *loadWatch) settled(p settleProbe, now time.Time) bool {
	if p.State != "loading" && time.Duration(p.Idle)*time.Millisecond >= settleFor {
		return true
	}
	if p.State == "loading" || w.since.IsZero() || changed(w.last, p.Nodes) {
		w.last, w.since = p.Nodes, now
		return false
	}
	return now.Sub(w.since) >= settleFor
}

func changed(a, b int) bool {
	d := a - b
	if d < 0 {
		d = -d
	}
	return d > max(3, a/50)
}

// waitSettled chờ trang yên (tối đa loadTimeout); hết giờ thì vẫn dò (false).
func waitSettled(ctx context.Context, tctx context.Context) (bool, error) {
	var w loadWatch
	end := time.Now().Add(loadTimeout)
	for {
		p, err := probeSettle(ctx, tctx)
		if err != nil {
			return false, err
		}
		now := time.Now()
		if w.settled(p, now) {
			return true, nil
		}
		if now.After(end) {
			return false, nil
		}
		if err := sleepCtx(ctx, loadPoll); err != nil {
			return false, err
		}
	}
}
