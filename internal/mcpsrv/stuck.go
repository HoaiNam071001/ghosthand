package mcpsrv

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"

	"ghosthand/internal/model"
	"ghosthand/internal/session"
)

// Chặn AI thử mãi (bước 56 A3): run_script / resume_run / run_step lỗi giống hệt (node + mã lỗi + tham số node) lần
// thứ stuckAfter liên tiếp → kết quả kèm "stuck" gợi ý đổi cách thay vì chạy lại y nguyên.

const stuckAfter = 3

const stuckHint = "lỗi giống hệt %d lần liên tiếp (cùng node, mã lỗi, tham số) – đừng chạy lại y nguyên: đổi cách tìm / thao tác (get_step_types topic=debug), xem màn hình (describe_screen / screenshot) hoặc hỏi người dùng"

// failStreak – lỗi gần nhất + số lần liên tiếp; mỗi runId chỉ đếm một lần (wait_run đọc lại cùng lần chạy).
type failStreak struct {
	mu   sync.Mutex
	sig  string
	runs map[string]bool
	n    int
}

// note ghi lần chạy đã xong tr; trả số lần liên tiếp lỗi giống hệt (0 = không lỗi).
func (f *failStreak) note(tr session.Trace, sc model.Script) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	sig := failSig(tr, sc)
	if sig == "" {
		f.sig, f.runs, f.n = "", nil, 0
		return 0
	}
	if f.runs[tr.RunID] {
		return f.n
	}
	if sig != f.sig {
		f.sig, f.runs, f.n = sig, map[string]bool{}, 0
	}
	f.runs[tr.RunID] = true
	f.n++
	return f.n
}

// failSig – dấu của lỗi: ref node + mã lỗi + tham số node (bỏ id, vị trí thẻ, tên – không ảnh hưởng chạy); "" = không lỗi.
func failSig(tr session.Trace, sc model.Script) string {
	if tr.State != session.StateFail || tr.FailedStep == "" {
		return ""
	}
	code := ""
	for _, r := range tr.Results {
		if r.NodeID == tr.FailedStep && r.Error != nil {
			code = r.Error.Code
		}
	}
	var step model.Step
	for _, s := range sc.Steps {
		if s.ID == tr.FailedStep {
			step = s
		}
	}
	ref := step.Ref // id của kịch bản tạm có thể khác mỗi lần gửi – so theo ref
	step.ID, step.Pos, step.Name = "", nil, ""
	b, _ := json.Marshal(step)
	h := sha256.Sum256(append([]byte(ref+"|"+code+"|"), b...))
	return hex.EncodeToString(h[:8])
}
