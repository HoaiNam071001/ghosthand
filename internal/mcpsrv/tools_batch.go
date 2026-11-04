package mcpsrv

import (
	"context"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/batch"
)

// Chạy nhiều kịch bản một lượt (bước 61 M2) – thay cho gọi run_script từng cái: một lượt vài phút nên chạy nền,
// gọi lại với batchId để chờ tiếp. Kết quả gọn: tên các kịch bản qua + chi tiết chỉ dòng lỗi.

type batchIn struct {
	Targets []string       `json:"targets,omitempty" jsonschema:"file / thư mục .json / mau:<id> (đường dẫn tuyệt đối)"`
	Samples bool           `json:"samples,omitempty" jsonschema:"thêm mọi mẫu sân thử"`
	All     bool           `json:"all,omitempty" jsonschema:"kèm mẫu web thật / cần chuẩn bị tay"`
	Level   int            `json:"level,omitempty" jsonschema:"chỉ mẫu mức 1-3"`
	Inputs  map[string]any `json:"inputs,omitempty"`
	BatchID string         `json:"batchId,omitempty" jsonschema:"chờ tiếp lượt này"`
	WaitS   *int           `json:"waitS,omitempty"`
}

func (s *Server) addBatchTools() {
	addTool(s, KindRun, &mcp.Tool{Name: "run_batch", Description: "Chạy nhiều kịch bản lần lượt (lỗi vẫn chạy tiếp; hỏi người dùng một lần; không ghi Lịch sử). " +
		"Trả passed + failed (code, node, runId → wait_run xem lỗi). Chưa xong: gọi lại với batchId; dừng: stop_run batchId."}, s.runBatch)
}

func (s *Server) runBatch(ctx context.Context, _ *mcp.CallToolRequest, in batchIn) (*mcp.CallToolResult, any, error) {
	id := in.BatchID
	if id == "" {
		var err error
		id, err = s.back.StartBatch(batch.Request{Targets: in.Targets, Select: batch.Select{Samples: in.Samples, All: in.All, Level: in.Level}, Values: in.Inputs})
		if err != nil {
			return fail(err)
		}
	}
	wait := defaultWaitS
	if in.WaitS != nil {
		wait = min(max(*in.WaitS, 0), maxWaitS)
	}
	wctx, cancel := context.WithTimeout(ctx, time.Duration(wait)*time.Second)
	defer cancel()
	st, err := s.back.WaitBatch(wctx, id)
	if err != nil {
		return fail(err)
	}
	return ok(batchView(st))
}

// batchView – kết quả gọn cho AI: dòng qua chỉ ghi tên.
func batchView(st batch.Status) map[string]any {
	passed, failed := []string{}, []batch.Row{}
	for _, r := range st.Rows {
		if r.State == batch.RowSuccess {
			passed = append(passed, r.Name)
		} else {
			failed = append(failed, r)
		}
	}
	v := map[string]any{"batchId": st.ID, "state": st.State, "total": st.Total, "passed": passed, "failed": failed, "ms": st.Ms}
	if !st.Done() {
		v["current"] = st.Current
		v["hint"] = "chưa xong – gọi run_batch với batchId để chờ tiếp"
	}
	return v
}
