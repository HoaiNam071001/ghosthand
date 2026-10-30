package model

import "time"

// Lịch sử chạy (bước 20 F5): một lần chạy = RunRecord (kết quả từng node, input đã dùng, kết quả cuối) – lưu ở store, gửi lên UI.

const MaxRunResults = 2000 // quá thì bỏ kết quả cũ nhất (vòng lặp dài) – Truncated đếm số đã bỏ

// RunRecord.Status
const (
	RunSuccess = "success"
	RunFail    = "fail"
	RunStopped = "stopped" // người dùng dừng (nút, F8, góc màn hình)
)

// RunSummary – một dòng trong danh sách lịch sử (event engine:done, ListRuns).
type RunSummary struct {
	ID         string    `json:"id"`
	Script     string    `json:"script"`
	Source     string    `json:"source"`
	StartedAt  time.Time `json:"startedAt"`
	DurationMs int64     `json:"durationMs"`
	Status     string    `json:"status"`             // success | fail | stopped
	Error      string    `json:"error,omitempty"`    // lỗi làm dừng kịch bản
	Message    string    `json:"message,omitempty"`  // lời nhắn node Kết thúc thành công (cuối cùng)
	Nodes      int       `json:"nodes"`              // số lần chạy node
	FailNode   string    `json:"failNode,omitempty"` // id node làm kịch bản thất bại (thống kê node hay lỗi – RunStats)
}

// RunRecord – toàn bộ một lần chạy.
type RunRecord struct {
	RunSummary
	Inputs    map[string]any `json:"inputs,omitempty"`
	Results   []StepResult   `json:"results"`
	Truncated int            `json:"truncated,omitempty"`
}

// Add ghi kết quả một node (giữ maxRunResults cuối); node Kết thúc thành công có lời nhắn thì nhớ làm Message.
func (r *RunRecord) Add(res StepResult, typ string) {
	r.Nodes++
	if typ == StepEnd && res.Status == StatusSuccess {
		if m, ok := res.Output["message"].(string); ok {
			r.Message = m
		}
	}
	if len(r.Results) >= MaxRunResults {
		r.Results = r.Results[1:]
		r.Truncated++
	}
	r.Results = append(r.Results, res)
}
