package main

import (
	"testing"

	"ghosthand/internal/model"
)

func TestStageTarget(t *testing.T) {
	wins := []model.WindowInfo{
		{ID: 1, PID: 7, App: "Ghosthand", Front: true}, // app này (thanh mini / cửa sổ chính)
		{ID: 2, PID: 3, App: "Code", Title: "main.go"},
		{ID: 3, PID: 4, App: "Google Chrome", Title: "(1) Messenger"},
	}
	cases := []struct {
		name  string
		wins  []model.WindowInfo
		focus *model.WindowInfo
		want  uint64
	}{
		{"app này ở trước → cửa sổ ngay dưới", wins, nil, 2},
		{"cửa sổ khác mang cờ Front", append([]model.WindowInfo{}, wins[1], model.WindowInfo{ID: 3, PID: 4, App: "Google Chrome", Front: true}), nil, 3},
		{"chạy tiếp: tiêu đề đổi vẫn lấy cửa sổ cùng app", wins, &model.WindowInfo{App: "Google Chrome", Title: "Messenger"}, 3},
		{"không có cửa sổ nào khác", wins[:1], nil, 0},
	}
	for _, c := range cases {
		w, err := stageTarget(c.wins, c.focus, 7)
		if err != nil || w.ID != c.want {
			t.Errorf("%s: %d %v, muốn %d", c.name, w.ID, err, c.want)
		}
	}
	if _, err := stageTarget(wins, &model.WindowInfo{App: "Zalo"}, 7); err == nil {
		t.Error("cửa sổ lúc lỗi đã đóng mà không báo lỗi")
	}
}
