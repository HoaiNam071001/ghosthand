package app

import (
	"testing"

	"ghosthand/internal/model"
)

func TestPickDisplay(t *testing.T) {
	ds := []model.Rect{{X: 0, Y: 0, W: 1920, H: 1080}, {X: 1920, Y: 406, W: 1512, H: 982}}
	same := []model.Rect{{X: 0, Y: 0, W: 1920, H: 1080}, {X: 1920, Y: 0, W: 1920, H: 1080}}
	cases := []struct {
		name  string
		ds    []model.Rect
		w, h  int
		mouse model.Point
		want  int
	}{
		{"cỡ khớp màn phụ", ds, 1512, 982, model.Point{X: 100, Y: 100}, 1},
		{"cỡ khớp màn chính", ds, 1920, 1080, model.Point{X: 2000, Y: 500}, 0},
		{"cùng cỡ → màn có chuột", same, 1920, 1080, model.Point{X: 2500, Y: 300}, 1},
		{"cỡ không khớp → màn có chuột", ds, 1280, 720, model.Point{X: 2000, Y: 500}, 1},
		{"không khớp gì → màn chính", ds, 1280, 720, model.Point{X: -50, Y: -50}, 0},
	}
	for _, c := range cases {
		if got := pickDisplay(c.ds, c.w, c.h, c.mouse); got != c.want {
			t.Errorf("%s: được %d, cần %d", c.name, got, c.want)
		}
	}
}

func TestDisplayAt(t *testing.T) {
	ds := []model.Rect{{X: 0, Y: 0, W: 1920, H: 1080}, {X: 1920, Y: 406, W: 1512, H: 982}}
	for _, c := range []struct {
		p    model.Point
		want int
	}{{model.Point{X: 960, Y: 540}, 0}, {model.Point{X: 2676, Y: 897}, 1}, {model.Point{X: 1919, Y: 1079}, 0}, {model.Point{X: 1920, Y: 406}, 1}, {model.Point{X: 2000, Y: 100}, -1}} {
		if got := displayAt(ds, c.p); got != c.want {
			t.Errorf("%v: %d, muốn %d", c.p, got, c.want)
		}
	}
}
