// Package devicetest – thiết bị giả cho test (engine, failsafe): ghi lại thao tác chuột / phím thay vì làm thật.
package devicetest

import (
	"fmt"
	"strings"
	"sync"

	"ghosthand/internal/element"
)

// FakeInput ghi lại các lệnh dưới dạng chuỗi thay vì điều khiển chuột thật; Lines() trả lại để so.
type FakeInput struct {
	mu   sync.Mutex
	log  []string
	x, y int // vị trí chuột giả (Location)
}

func (f *FakeInput) add(format string, a ...any) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.log = append(f.log, fmt.Sprintf(format, a...))
	return nil
}

func (f *FakeInput) Move(x, y int) error { f.at(x, y); return f.add("move %d,%d", x, y) }

// MoveStep ghi "step x,y" – test đường di chuột giống người đếm / bỏ qua các dòng này.
func (f *FakeInput) MoveStep(x, y int) error { f.at(x, y); return f.add("step %d,%d", x, y) }

func (f *FakeInput) Location() (int, int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.x, f.y
}

func (f *FakeInput) at(x, y int) {
	f.mu.Lock()
	f.x, f.y = x, y
	f.mu.Unlock()
}

func (f *FakeInput) Drag(x, y int, b string) error {
	f.at(x, y)
	return f.add("drag %d,%d %s", x, y, b)
}

func (f *FakeInput) Toggle(b string, down bool) error { return f.add("toggle %s %v", b, down) }

func (f *FakeInput) Click(b string, double bool) error { return f.add("click %s %v", b, double) }

func (f *FakeInput) TypeStr(s string) error { return f.add("type %s", s) }

func (f *FakeInput) Scroll(d string) error { return f.add("scroll %s", d) }

func (f *FakeInput) KeyToggle(k string, down bool, mods []string) error {
	if !down {
		return f.add("up %s", k)
	}
	return f.add("down %s [%s]", k, strings.Join(mods, "+"))
}

func (f *FakeInput) Lines() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.log...)
}

// FakeClipboard – clipboard giả: giữ chữ / đường dẫn ảnh đã ghi.
type FakeClipboard struct {
	mu    sync.Mutex
	Text  string
	Image string // đường dẫn file PNG ghi lần cuối
	Err   error  // != nil: mọi lệnh trả lỗi này
}

func (c *FakeClipboard) ReadText() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Text, c.Err
}

func (c *FakeClipboard) WriteText(t string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.Err == nil {
		c.Text = t
	}
	return c.Err
}

func (c *FakeClipboard) WriteImage(p string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.Err == nil {
		c.Image = p
	}
	return c.Err
}

// FakeTrash – Thùng rác giả: ghi lại file được "xoá" (không đụng file thật), số lần dọn.
type FakeTrash struct {
	mu      sync.Mutex
	Trashed []string
	Emptied int
	Err     error
}

func (t *FakeTrash) MoveToTrash(paths []string) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.Err == nil {
		t.Trashed = append(t.Trashed, paths...)
	}
	return t.Err
}

func (t *FakeTrash) EmptyTrash() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.Err == nil {
		t.Emptied++
	}
	return t.Err
}

// FakeAudio – âm lượng giả (không đổi loa thật).
type FakeAudio struct {
	mu    sync.Mutex
	Level int
	Muted bool
	Err   error
}

func (a *FakeAudio) Volume() (int, bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.Level, a.Muted, a.Err
}

func (a *FakeAudio) SetVolume(l int) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.Err == nil {
		a.Level, a.Muted = l, false
	}
	return a.Err
}

func (a *FakeAudio) SetMuted(m bool) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.Err == nil {
		a.Muted = m
	}
	return a.Err
}

// FakeElements – cây phần tử giả: mỗi lần Elements trả khung tiếp theo trong Frames (hết thì giữ khung cuối), Err ≠ nil
// thì báo lỗi đó; ScrollTo ghi lại index vào Scrolled.
type FakeElements struct {
	Frames   [][]element.Node
	Err      error
	Apps     []string // app đã hỏi theo thứ tự
	Scrolled []int
	Acts     []string // "index:act:value" theo thứ tự gọi Act
	ActErr   error
	DocText  map[int]string // chữ DocTexts trả theo index
	n        int
}

func (f *FakeElements) Elements(app string) ([]element.Node, error) {
	f.Apps = append(f.Apps, app)
	if f.Err != nil {
		return nil, f.Err
	}
	if len(f.Frames) == 0 {
		return nil, nil
	}
	fr := f.Frames[min(f.n, len(f.Frames)-1)]
	f.n++
	return fr, nil
}

func (f *FakeElements) Act(app string, index int, act, value string) error {
	f.Acts = append(f.Acts, fmt.Sprintf("%d:%s:%s", index, act, value))
	return f.ActErr
}

// DocTexts trả DocText[index] (trống = cây đã có chữ).
func (f *FakeElements) DocTexts(app string, indices []int, selection bool) ([]string, error) {
	out := make([]string, len(indices))
	for i, idx := range indices {
		out[i] = f.DocText[idx]
	}
	return out, nil
}

func (f *FakeElements) ScrollTo(app string, index int) error {
	f.Scrolled = append(f.Scrolled, index)
	return nil
}
