package mcpsrv

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ghosthand/internal/batch"
)

// Lượt giả: kịch bản tên chứa "loi" lỗi ở n2, còn lại qua; kịch bản tên "cham" chạy tới khi bị dừng.
func (f *fakeBackend) StartBatch(req batch.Request) (string, error) {
	items, err := batch.Resolve(req.Targets, req.Select)
	if err != nil {
		return "", err
	}
	f.batch = batch.Start("b1", items, func(ctx context.Context, it batch.Item) (batch.Row, bool) {
		switch {
		case strings.Contains(it.Name, "loi"):
			return batch.Row{State: batch.RowFail, Code: "not_found", Node: "n2", Error: "không thấy chữ", RunID: "r9"}, false
		case strings.Contains(it.Name, "cham"):
			<-ctx.Done()
			return batch.Row{State: batch.RowStopped}, true
		}
		return batch.Row{State: batch.RowSuccess}, false
	})
	return "b1", nil
}
func (f *fakeBackend) WaitBatch(ctx context.Context, _ string) (batch.Status, error) {
	return f.batch.Wait(ctx), nil
}
func (f *fakeBackend) StopBatch(id string) bool {
	if f.batch == nil || id != "b1" {
		return false
	}
	f.batch.Stop()
	return true
}

func TestRunBatch(t *testing.T) {
	cs, back := connect(t)
	for _, n := range []string{"a.json", "co-loi.json", "z-cham.json"} {
		_ = os.WriteFile(filepath.Join(back.dir, n), []byte("{}"), 0o644)
	}
	out, isErr := call(t, cs, "run_batch", map[string]any{"targets": []string{back.dir}, "waitS": 0})
	if isErr || out["batchId"] != "b1" || out["state"] != batch.StateRunning || out["hint"] == nil {
		t.Fatalf("lượt đang chạy (kịch bản cham chờ dừng): %v", out)
	}
	if out, _ := call(t, cs, "stop_run", map[string]any{"runId": "b1"}); out["stopped"] != true {
		t.Fatalf("stop_run batchId: %v", out)
	}
	out, _ = call(t, cs, "run_batch", map[string]any{"batchId": "b1"})
	failed := out["failed"].([]any)
	if out["state"] != batch.StateStopped || len(out["passed"].([]any)) != 1 || len(failed) != 2 {
		t.Fatalf("%v", out)
	}
	if f := failed[0].(map[string]any); f["name"] != "co-loi" || f["code"] != "not_found" || f["node"] != "n2" || f["runId"] != "r9" {
		t.Errorf("dòng lỗi: %v", f)
	}
	if _, isErr := call(t, cs, "run_batch", map[string]any{"targets": []string{"mau:khong-co"}}); !isErr {
		t.Error("mẫu không có phải báo lỗi")
	}
}
