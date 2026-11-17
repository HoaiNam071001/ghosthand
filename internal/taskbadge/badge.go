// Package taskbadge: dấu hiệu trạng thái chạy trên icon app ở thanh tác vụ (Windows) – đang chạy (vòng xoay + thanh
// tiến độ chạy dài), xong (✓) hoặc lỗi (!) trong DoneFor giây rồi tự mất. Hệ khác: chưa làm, không hiện gì.
package taskbadge

import (
	"sync"
	"time"
)

// Kind – dấu đang hiện trên icon.
type Kind int

const (
	None    Kind = iota // không dấu
	Running             // đang chạy
	Done                // xong, thành công
	Failed              // xong, lỗi
)

// DoneFor – dấu xong / lỗi hiện chừng này rồi tự về None.
const DoneFor = 3 * time.Second

var (
	mu    sync.Mutex
	gen   int         // tăng mỗi lần Set – hẹn giờ cũ thấy gen đổi thì bỏ qua
	timer *time.Timer // hẹn giờ xoá dấu xong / lỗi
	apply = platformApply
)

// Set đổi dấu. Done / Failed tự về None sau DoneFor, trừ khi trước đó có Set khác.
func Set(k Kind) {
	mu.Lock()
	defer mu.Unlock()
	gen++
	if timer != nil {
		timer.Stop()
		timer = nil
	}
	if k == Done || k == Failed {
		g := gen
		timer = time.AfterFunc(DoneFor, func() {
			mu.Lock()
			defer mu.Unlock()
			if gen == g {
				apply(None)
			}
		})
	}
	apply(k)
}
