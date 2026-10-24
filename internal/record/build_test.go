package record

import (
	"testing"
	"time"

	"ghosthand/internal/model"
)

const ms = time.Millisecond

func TestBuildClickDragDelay(t *testing.T) {
	sc := Build([]Event{
		{Kind: MouseDown, At: 0, X: 110, Y: 220, Button: "left"},
		{Kind: MouseUp, At: 50 * ms, X: 112, Y: 221, Button: "left"},
		{Kind: MouseDown, At: 1050 * ms, X: 10, Y: 20, Button: "left"},
		{Kind: MouseUp, At: 1450 * ms, X: 300, Y: 20, Button: "left"},
	}, model.Rect{X: 100, Y: 200, W: 800, H: 600})
	if len(sc.Steps) != 2 || len(sc.Edges) != 1 || sc.Start != "r1" {
		t.Fatalf("steps %d edges %d start %q", len(sc.Steps), len(sc.Edges), sc.Start)
	}
	c, d := sc.Steps[0], sc.Steps[1]
	if c.Type != model.StepClick || c.Points[0].X != 10 || c.Points[0].Y != 20 || c.DelayAfter != 1000 {
		t.Errorf("click: %+v", c)
	}
	if d.Type != model.StepDrag || d.Points[1].X != 200 || d.DragMs != 400 {
		t.Errorf("drag: %+v", d)
	}
}

func TestBuildDoubleClickMerges(t *testing.T) {
	click := func(at time.Duration) []Event {
		return []Event{{Kind: MouseDown, At: at, X: 5, Y: 5, Button: "left"}, {Kind: MouseUp, At: at + 30*ms, X: 5, Y: 5, Button: "left"}}
	}
	sc := Build(append(click(0), click(200*ms)...), model.Rect{})
	if len(sc.Steps) != 1 || sc.Steps[0].Clicks != 2 {
		t.Fatalf("%+v", sc.Steps)
	}
}

func TestBuildTextAndKeys(t *testing.T) {
	key := func(at time.Duration, k string, down bool) Event {
		kind := KeyUp
		if down {
			kind = KeyDown
		}
		return Event{Kind: kind, At: at, Key: k}
	}
	sc := Build([]Event{
		key(0, "shift", true), key(10*ms, "h", true), key(20*ms, "h", false), key(30*ms, "shift", false),
		key(100*ms, "i", true), key(110*ms, "space", true),
		key(2000*ms, "ctrl", true), key(2010*ms, "s", true), key(2020*ms, "s", false), key(2030*ms, "ctrl", false),
		key(3000*ms, "enter", true),
	}, model.Rect{})
	if len(sc.Steps) != 3 {
		t.Fatalf("%+v", sc.Steps)
	}
	if sc.Steps[0].Text != "Hi " || sc.Steps[0].DelayAfter != 1900 {
		t.Errorf("text: %+v", sc.Steps[0])
	}
	if k := sc.Steps[1]; k.Keys[0] != "s" || len(k.Modifiers) != 1 || k.Modifiers[0] != "ctrl" {
		t.Errorf("combo: %+v", k)
	}
	if sc.Steps[2].Keys[0] != "enter" {
		t.Errorf("enter: %+v", sc.Steps[2])
	}
}

func TestBuildScrollMerge(t *testing.T) {
	w := func(at time.Duration) Event { return Event{Kind: Wheel, At: at, Dir: "down", X: 1, Y: 2} }
	sc := Build([]Event{w(0), w(100 * ms), w(200 * ms)}, model.Rect{})
	if len(sc.Steps) != 1 || sc.Steps[0].Amount != 3 {
		t.Fatalf("%+v", sc.Steps)
	}
}

func TestBuildEmpty(t *testing.T) {
	if sc := Build(nil, model.Rect{}); len(sc.Steps) != 0 || sc.Start != "" {
		t.Fatalf("%+v", sc)
	}
}
