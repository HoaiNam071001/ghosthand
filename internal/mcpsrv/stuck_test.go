package mcpsrv

import (
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/session"
)

func failTrace(run, code string) session.Trace {
	var tr session.Trace
	tr.RunID, tr.State, tr.FailedStep = run, session.StateFail, "s2"
	tr.Results = []model.StepResult{{NodeID: "s2", Ref: "n2", Status: model.StatusFail, Error: &model.StepError{Code: code}}}
	return tr
}

func TestFailStreak(t *testing.T) {
	sc := model.Script{Steps: []model.Step{{ID: "s2", Ref: "n2", Type: model.StepWaitImage, FindText: "OK"}}}
	var f failStreak
	for i, run := range []string{"1", "2", "3"} {
		if n := f.note(failTrace(run, model.ErrTimeout), sc); n != i+1 {
			t.Fatalf("lần %d: n = %d", i+1, n)
		}
	}
	if n := f.note(failTrace("3", model.ErrTimeout), sc); n != 3 {
		t.Errorf("wait_run đọc lại cùng runId không được đếm thêm: %d", n)
	}
	// Kịch bản tạm gửi lại: id khác, vị trí thẻ khác – vẫn là cùng lỗi.
	moved := model.Script{Steps: []model.Step{{ID: "x9", Ref: "n2", Type: model.StepWaitImage, FindText: "OK", Pos: &model.Pos{X: 5}}}}
	tr := failTrace("4", model.ErrTimeout)
	tr.FailedStep, tr.Results[0].NodeID = "x9", "x9"
	if n := f.note(tr, moved); n != 4 {
		t.Errorf("đổi id / vị trí: n = %d", n)
	}
	// AI đổi tham số node → đếm lại từ đầu.
	sc.Steps[0].FindText = "Đồng ý"
	if n := f.note(failTrace("5", model.ErrTimeout), sc); n != 1 {
		t.Errorf("đổi tham số: n = %d", n)
	}
	var ok session.Trace
	ok.RunID, ok.State = "6", session.StateSuccess
	if n := f.note(ok, sc); n != 0 {
		t.Errorf("chạy thành công: n = %d", n)
	}
}
