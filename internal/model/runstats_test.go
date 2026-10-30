package model

import "testing"

func TestStatsOf(t *testing.T) {
	runs := []RunSummary{
		{Status: RunSuccess, DurationMs: 1000},
		{Status: RunSuccess, DurationMs: 3000},
		{Status: RunFail, FailNode: "s3"},
		{Status: RunFail, FailNode: "s5"},
		{Status: RunFail, FailNode: "s3"},
		{Status: RunFail}, // lỗi không gắn node (kịch bản sai)
		{Status: RunStopped, DurationMs: 99999},
		{Status: RunFail, FailNode: "s9"},
		{Status: RunFail, FailNode: "s1"},
	}
	st := StatsOf(runs)
	if st.Runs != 9 || st.Success != 2 || st.Fail != 6 || st.Stopped != 1 {
		t.Fatalf("đếm sai %+v", st)
	}
	if st.SuccessPct != 25 || st.AvgMs != 2000 {
		t.Errorf("tỷ lệ / trung bình %+v", st)
	}
	want := []FailCount{{"s3", 2}, {"s1", 1}, {"s5", 1}}
	if len(st.TopFails) != 3 || st.TopFails[0] != want[0] || st.TopFails[1] != want[1] || st.TopFails[2] != want[2] {
		t.Errorf("node hay lỗi %+v", st.TopFails)
	}
	if e := StatsOf(nil); e.Runs != 0 || e.SuccessPct != 0 || e.TopFails == nil {
		t.Errorf("rỗng %+v", e)
	}
}
