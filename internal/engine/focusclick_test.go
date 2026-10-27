package engine

import (
	"testing"

	"ghosthand/internal/model"
)

func TestWindowToFocus(t *testing.T) {
	chrome := model.WindowInfo{ID: 2, PID: 20, Box: model.Rect{X: 0, Y: 0, W: 800, H: 600}}
	term := model.WindowInfo{ID: 1, PID: 10, Box: model.Rect{X: 0, Y: 0, W: 400, H: 300}}
	self := model.WindowInfo{ID: 9, PID: 99, Box: model.Rect{X: 0, Y: 0, W: 1000, H: 1000}}
	cases := []struct {
		name string
		ws   []model.WindowInfo
		p    model.Point
		want uint64
	}{
		{"điểm nằm ở cửa sổ phía sau", []model.WindowInfo{term, chrome}, model.Point{X: 600, Y: 500}, 2},
		{"cửa sổ đã ở trước", []model.WindowInfo{chrome, term}, model.Point{X: 600, Y: 500}, 0},
		{"bỏ cửa sổ của app", []model.WindowInfo{self, chrome}, model.Point{X: 600, Y: 500}, 0},
		{"cửa sổ thu nhỏ không tính", []model.WindowInfo{{ID: 1, PID: 10, Minimized: true}, chrome}, model.Point{X: 5, Y: 5}, 0},
		{"không cửa sổ nào ở điểm", []model.WindowInfo{chrome}, model.Point{X: 900, Y: 900}, 0},
	}
	for _, c := range cases {
		w, ok := windowToFocus(c.ws, c.p, 99)
		if (c.want != 0) != ok || w.ID != c.want {
			t.Errorf("%s: được %d (%v), muốn %d", c.name, w.ID, ok, c.want)
		}
	}
}
