package model

import (
	"slices"
	"strings"
)

// Thống kê lần chạy của một kịch bản (bước 28 R2) – tính từ lịch sử đã lưu (store.RunsOf), không cần cơ sở dữ liệu.

// RunStats – tóm tắt các lần chạy.
type RunStats struct {
	Runs       int         `json:"runs"`       // số lần đã lưu
	Success    int         `json:"success"`    // thành công
	Fail       int         `json:"fail"`       // thất bại
	Stopped    int         `json:"stopped"`    // người dùng dừng
	SuccessPct int         `json:"successPct"` // % thành công trên các lần chạy hết (không tính lần bị dừng); 0 khi chưa có
	AvgMs      int64       `json:"avgMs"`      // thời gian trung bình các lần thành công; 0 khi chưa có
	TopFails   []FailCount `json:"topFails"`   // node hay làm kịch bản thất bại nhất, nhiều trước (tối đa topFailN)
}

// FailCount – một node và số lần nó làm kịch bản thất bại.
type FailCount struct {
	Node  string `json:"node"` // id node (RunSummary.FailNode)
	Count int    `json:"count"`
}

const topFailN = 3

// StatsOf tính thống kê từ danh sách lần chạy (thứ tự bất kỳ).
func StatsOf(runs []RunSummary) RunStats {
	st := RunStats{Runs: len(runs), TopFails: []FailCount{}}
	var okMs int64
	fails := map[string]int{}
	for _, r := range runs {
		switch r.Status {
		case RunSuccess:
			st.Success++
			okMs += r.DurationMs
		case RunFail:
			st.Fail++
			if r.FailNode != "" {
				fails[r.FailNode]++
			}
		case RunStopped:
			st.Stopped++
		}
	}
	if done := st.Success + st.Fail; done > 0 {
		st.SuccessPct = (st.Success*100 + done/2) / done
	}
	if st.Success > 0 {
		st.AvgMs = okMs / int64(st.Success)
	}
	for n, c := range fails {
		st.TopFails = append(st.TopFails, FailCount{Node: n, Count: c})
	}
	slices.SortFunc(st.TopFails, func(a, b FailCount) int {
		if a.Count != b.Count {
			return b.Count - a.Count
		}
		return strings.Compare(a.Node, b.Node)
	})
	if len(st.TopFails) > topFailN {
		st.TopFails = st.TopFails[:topFailN]
	}
	return st
}
