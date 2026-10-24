// Package record – ghi macro (bước 24): sự kiện chuột / phím thô → kịch bản con (chuỗi node nối cạnh success).
// Thuần tuý, không đụng thiết bị: bắt sự kiện ở main (hotkey.go), nhúng kết quả bằng script.Embed.
package record

import (
	"fmt"
	"strings"
	"time"

	"ghosthand/internal/model"
)

type Kind int

const (
	MouseDown Kind = iota
	MouseUp
	Wheel
	KeyDown
	KeyUp
)

// Event – một sự kiện thô. At = thời điểm tính từ lúc bắt đầu ghi; X, Y = toạ độ màn hình.
type Event struct {
	Kind   Kind
	At     time.Duration
	X, Y   int
	Button string // left | right | center
	Dir    string // Wheel: up | down
	Key    string // tên phím theo robotgo (a, enter, shift…)
}

const (
	dragMinPx    = 6                      // di chuột ≥ ngần này giữa nhấn và thả = kéo, nhỏ hơn = click
	multiClick   = 500 * time.Millisecond // hai click cùng chỗ cách nhau < ngần này gộp thành click nhiều lần
	scrollMerge  = 600 * time.Millisecond // các nấc cuộn cùng hướng cách nhau < ngần này gộp một node
	minDelay     = 100                    // ms – DelayAfter nhỏ nhất của node ghi được
	maxDelay     = 60000
	delayRoundMs = 50
)

var modifierNames = map[string]string{"shift": "shift", "ctrl": "ctrl", "alt": "alt", "cmd": "cmd"}

// normKey bỏ tiền tố phải (rshift…) và đổi tên khác robotgo.
func normKey(k string) string {
	k = strings.ToLower(k)
	if len(k) > 4 && k[0] == 'r' {
		if _, ok := modifierNames[k[1:]]; ok {
			k = k[1:]
		}
	}
	if k == "escape" {
		return "esc"
	}
	return k
}

type builder struct {
	steps   []model.Step
	starts  []time.Duration // thời điểm bắt đầu / kết thúc từng node, để tính DelayAfter
	ends    []time.Duration
	mods    map[string]bool
	down    map[string]Event // nút chuột đang giữ
	text    []rune
	textAt  time.Duration
	textEnd time.Duration
	screen  model.Rect
}

// Build ghép sự kiện (theo thứ tự thời gian) thành kịch bản con. screen = khung toạ độ của kịch bản đích
// (toạ độ điểm ghi tính từ góc khung). Không có hành động nào → kịch bản rỗng.
func Build(events []Event, screen model.Rect) model.Script {
	b := &builder{mods: map[string]bool{}, down: map[string]Event{}, screen: screen}
	for _, e := range events {
		switch e.Kind {
		case MouseDown:
			b.flushText()
			b.down[e.Button] = e
		case MouseUp:
			b.mouseUp(e)
		case Wheel:
			b.flushText()
			b.wheel(e)
		case KeyDown:
			b.keyDown(e)
		case KeyUp:
			delete(b.mods, normKey(e.Key))
		}
	}
	b.flushText()
	return b.script()
}

func (b *builder) add(s model.Step, from, to time.Duration) {
	b.steps = append(b.steps, s)
	b.starts = append(b.starts, from)
	b.ends = append(b.ends, to)
}

func (b *builder) newStep(t string) model.Step {
	s, _ := model.NewStep(t)
	s.Ref = fmt.Sprintf("n%d", len(b.steps)+1)
	s.DelayAfter = minDelay
	return s
}

func (b *builder) point(x, y int) model.Point {
	return model.Point{X: x - b.screen.X, Y: y - b.screen.Y}
}

func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func (b *builder) mouseUp(e Event) {
	d, ok := b.down[e.Button]
	if !ok {
		return
	}
	delete(b.down, e.Button)
	if abs(e.X-d.X) < dragMinPx && abs(e.Y-d.Y) < dragMinPx {
		b.click(d, e)
		return
	}
	s := b.newStep(model.StepDrag)
	s.Button = e.Button
	s.Points = []model.Point{b.point(d.X, d.Y), b.point(e.X, e.Y)}
	s.DragMs = min(max(int((e.At-d.At).Milliseconds()), 100), 5000)
	b.add(s, d.At, e.At)
}

func (b *builder) click(d, e Event) {
	if n := len(b.steps); n > 0 {
		p := &b.steps[n-1]
		if p.Type == model.StepClick && p.Button == e.Button && d.At-b.ends[n-1] < multiClick &&
			abs(p.Points[0].X-(d.X-b.screen.X)) < dragMinPx && abs(p.Points[0].Y-(d.Y-b.screen.Y)) < dragMinPx {
			p.Clicks++
			b.ends[n-1] = e.At
			return
		}
	}
	s := b.newStep(model.StepClick)
	s.Button = e.Button
	s.Points = []model.Point{b.point(d.X, d.Y)}
	b.add(s, d.At, e.At)
}

func (b *builder) wheel(e Event) {
	if n := len(b.steps); n > 0 {
		p := &b.steps[n-1]
		if p.Type == model.StepScroll && p.Direction == e.Dir && e.At-b.ends[n-1] < scrollMerge {
			p.Amount++
			b.ends[n-1] = e.At
			return
		}
	}
	s := b.newStep(model.StepScroll)
	s.Direction, s.Amount = e.Dir, 1
	s.Points = []model.Point{b.point(e.X, e.Y)}
	b.add(s, e.At, e.At)
}

// keyDown: phím in được (không kèm ctrl / alt / cmd) gom vào một node Gõ chữ; còn lại thành node Phím.
func (b *builder) keyDown(e Event) {
	k := normKey(e.Key)
	if _, isMod := modifierNames[k]; isMod {
		b.mods[k] = true
		return
	}
	if r, ok := b.printable(k); ok {
		if len(b.text) == 0 {
			b.textAt = e.At
		}
		b.text = append(b.text, r)
		b.textEnd = e.At
		return
	}
	b.flushText()
	s := b.newStep(model.StepKey)
	s.Keys = []string{k}
	for _, m := range []string{"cmd", "ctrl", "alt", "shift"} {
		if b.mods[m] {
			s.Modifiers = append(s.Modifiers, m)
		}
	}
	b.add(s, e.At, e.At)
}

func (b *builder) printable(k string) (rune, bool) {
	if b.mods["ctrl"] || b.mods["alt"] || b.mods["cmd"] {
		return 0, false
	}
	if k == "space" {
		return ' ', true
	}
	rs := []rune(k)
	if len(rs) != 1 {
		return 0, false
	}
	r := rs[0]
	if b.mods["shift"] {
		if r < 'a' || r > 'z' {
			return 0, false // shift + số / dấu: layout bàn phím quyết định ký tự – ghi thành phím kèm shift
		}
		return r - 32, true
	}
	return r, true
}

func (b *builder) flushText() {
	if len(b.text) == 0 {
		return
	}
	s := b.newStep(model.StepText)
	s.Text = string(b.text)
	b.add(s, b.textAt, b.textEnd)
	b.text = nil
}

// script nối node thành chuỗi success, DelayAfter = khoảng nghỉ thật tới node kế (làm tròn 50 ms).
func (b *builder) script() model.Script {
	sc := model.NewScript()
	sc.Name = "Ghi macro"
	for i := range b.steps {
		s := b.steps[i]
		s.ID = fmt.Sprintf("r%d", i+1)
		s.Pos = &model.Pos{X: i * 240}
		if i+1 < len(b.steps) {
			gap := int((b.starts[i+1] - b.ends[i]).Milliseconds())
			s.DelayAfter = min(max((gap+delayRoundMs/2)/delayRoundMs*delayRoundMs, minDelay), maxDelay)
			sc.Edges = append(sc.Edges, model.Edge{ID: fmt.Sprintf("re%d", i+1), From: s.ID, Port: "success", To: fmt.Sprintf("r%d", i+2)})
		}
		sc.Steps = append(sc.Steps, s)
	}
	if len(sc.Steps) > 0 {
		sc.Start = sc.Steps[0].ID
	}
	return sc
}
