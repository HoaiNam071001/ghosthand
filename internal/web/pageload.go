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

// loadProbe – trạng thái trang mỗi lần hỏi.
type loadProbe struct {
	State string `json:"state"` // document.readyState
	Nodes int    `json:"nodes"` // số phần tử trong DOM
}

const loadProbeJS = `({state: document.readyState, nodes: document.getElementsByTagName('*').length})`

// loadWatch quyết định khi nào trang đủ yên để dò (hàm thuần theo chuỗi mẫu, có test).
type loadWatch struct {
	last  int
	since time.Time
}

// settled – mẫu p lúc now: trang đã qua giai đoạn tải HTML và số phần tử không đổi đáng kể trong settleFor.
// Đổi ít (≤ 2 %, tối thiểu 3 phần tử) coi như yên – trang có đồng hồ / carousel không bao giờ đứng hẳn.
func (w *loadWatch) settled(p loadProbe, now time.Time) bool {
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
		p, err := evalJS[loadProbe](ctx, tctx, "chờ trang tải", loadProbeJS)
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
