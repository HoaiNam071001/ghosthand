// Package batch – chạy nhiều kịch bản một lượt (bước 61 M2): lần lượt từng kịch bản, lỗi thì ghi dòng rồi chạy tiếp,
// người dùng dừng (F8) thì dừng cả lượt. Dùng chung cho CLI `ghosthand test` (qua API /batch) và MCP run_batch.
// Không biết cách chạy một kịch bản – App truyền Exec (đọc file / mẫu, session.Start, chờ, đọc vết chạy).
package batch

import (
	"context"
	"sync"
	"time"
)

// IDPrefix – id lượt "b1", "b2"… (runId lần chạy thường là giờ bắt đầu, toàn số – không trùng).
const IDPrefix = "b"

// Item – một kịch bản trong lượt: file (Path) hoặc mẫu (Sample = id mẫu).
type Item struct {
	Name   string `json:"name"`
	Path   string `json:"path,omitempty"`
	Sample string `json:"sample,omitempty"`
}

// Kết quả một dòng.
const (
	RowSuccess = "success"
	RowFail    = "fail"
	RowStopped = "stopped"
)

// Row – kết quả một kịch bản. Code / Node / Error chỉ có ở dòng lỗi.
type Row struct {
	Name  string `json:"name"`
	State string `json:"state"`          // success | fail | stopped
	Code  string `json:"code,omitempty"` // mã lỗi (not_found, timeout…; invalid = kịch bản không qua kiểm tra, không chạy)
	Node  string `json:"node,omitempty"` // ref node lỗi
	Error string `json:"error,omitempty"`
	Ms    int64  `json:"ms"`
	RunID string `json:"runId,omitempty"` // xem chi tiết / ảnh lỗi (wait_run) khi app chưa đóng
}

// Trạng thái lượt.
const (
	StateRunning = "running"
	StateDone    = "done"
	StateStopped = "stopped"
)

// Status – ảnh chụp tiến độ lượt.
type Status struct {
	ID      string `json:"batchId"`
	State   string `json:"state"`
	Total   int    `json:"total"`
	Current string `json:"current,omitempty"` // tên kịch bản đang chạy
	Rows    []Row  `json:"rows"`
	Ms      int64  `json:"ms"`
}

// Done – lượt đã kết thúc.
func (s Status) Done() bool { return s.State != StateRunning }

// Failed – số dòng không qua.
func (s Status) Failed() int {
	n := 0
	for _, r := range s.Rows {
		if r.State != RowSuccess {
			n++
		}
	}
	return n
}

// Exec chạy một kịch bản tới khi xong; stop = người dùng đã dừng lần chạy → dừng cả lượt.
type Exec func(ctx context.Context, it Item) (row Row, stop bool)

// Batch – một lượt đang / đã chạy.
type Batch struct {
	mu     sync.Mutex
	st     Status
	start  time.Time
	cancel context.CancelFunc
	done   chan struct{}
}

// Start chạy items nền theo thứ tự; trả ngay.
func Start(id string, items []Item, exec Exec) *Batch {
	ctx, cancel := context.WithCancel(context.Background())
	b := &Batch{st: Status{ID: id, State: StateRunning, Total: len(items), Rows: []Row{}}, start: time.Now(), cancel: cancel, done: make(chan struct{})}
	go b.loop(ctx, items, exec)
	return b
}

func (b *Batch) loop(ctx context.Context, items []Item, exec Exec) {
	defer close(b.done)
	state := StateDone
	for _, it := range items {
		if ctx.Err() != nil {
			state = StateStopped
			break
		}
		b.set(func(s *Status) { s.Current = it.Name })
		row, stop := exec(ctx, it)
		row.Name = it.Name
		b.set(func(s *Status) { s.Rows = append(s.Rows, row) })
		if stop {
			state = StateStopped
			break
		}
	}
	b.set(func(s *Status) { s.State, s.Current = state, "" })
	b.cancel()
}

func (b *Batch) set(f func(*Status)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	f(&b.st)
	b.st.Ms = time.Since(b.start).Milliseconds()
}

// Status – bản sao tiến độ hiện tại.
func (b *Batch) Status() Status {
	b.mu.Lock()
	defer b.mu.Unlock()
	s := b.st
	s.Rows = append([]Row(nil), b.st.Rows...)
	if !s.Done() {
		s.Ms = time.Since(b.start).Milliseconds()
	}
	return s
}

// Stop huỷ lượt: Exec nhận ctx đã huỷ (dừng lần chạy đang diễn ra), không chạy kịch bản kế.
func (b *Batch) Stop() { b.cancel() }

// Wait chờ lượt xong hoặc ctx hết hạn, trả tiến độ lúc đó.
func (b *Batch) Wait(ctx context.Context) Status {
	select {
	case <-b.done:
	case <-ctx.Done():
	}
	return b.Status()
}
