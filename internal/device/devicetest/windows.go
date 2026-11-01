package devicetest

import (
	"errors"
	"fmt"
	"sync"

	"ghosthand/internal/model"
)

// FakeWindows – cửa sổ giả (bước 26): thao tác đổi Wins và ghi Log ("focus 2", "bounds 2 0,0 800x600"…).
// Work = vùng làm việc trả cho mọi màn.
type FakeWindows struct {
	mu   sync.Mutex
	Wins []model.WindowInfo
	Work model.Rect
	Log  []string
}

var errGone = errors.New("cửa sổ không còn mở")

func (f *FakeWindows) List() ([]model.WindowInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]model.WindowInfo(nil), f.Wins...), nil
}

// with chạy fn trên cửa sổ id (đã khoá) và ghi log; không có → lỗi như bản thật.
func (f *FakeWindows) with(id uint64, log string, fn func(w *model.WindowInfo)) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := range f.Wins {
		if f.Wins[i].ID == id {
			f.Log = append(f.Log, log)
			fn(&f.Wins[i])
			return nil
		}
	}
	return errGone
}

// Focus như máy thật: bỏ thu nhỏ + chỉ cửa sổ này mang cờ Front (đang nhận phím).
func (f *FakeWindows) Focus(id uint64) error {
	return f.with(id, fmt.Sprintf("focus %d", id), func(w *model.WindowInfo) {
		for i := range f.Wins {
			f.Wins[i].Front = false
		}
		w.Minimized, w.Front = false, true
	})
}

func (f *FakeWindows) SetBounds(id uint64, r model.Rect) error {
	return f.with(id, fmt.Sprintf("bounds %d %d,%d %dx%d", id, r.X, r.Y, r.W, r.H), func(w *model.WindowInfo) {
		w.Box, w.Minimized = r, false
	})
}

func (f *FakeWindows) SetState(id uint64, state string) error {
	return f.with(id, fmt.Sprintf("%s %d", state, id), func(w *model.WindowInfo) { w.Minimized = state == "minimize" })
}

func (f *FakeWindows) Close(id uint64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, w := range f.Wins {
		if w.ID == id {
			f.Log = append(f.Log, fmt.Sprintf("close %d", id))
			f.Wins = append(f.Wins[:i], f.Wins[i+1:]...)
			return nil
		}
	}
	return errGone
}

func (f *FakeWindows) WorkArea(model.Rect) model.Rect { return f.Work }

// FakeApps – app giả: Quit / ForceQuit bỏ app khỏi Apps và ghi Log ("quit 10", "force 10"). AskSave: Quit chỉ ghi Log,
// app vẫn chạy (như app đang hỏi lưu).
type FakeApps struct {
	mu      sync.Mutex
	Apps    []model.AppInfo
	Log     []string
	AskSave bool
}

func (f *FakeApps) List() ([]model.AppInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]model.AppInfo(nil), f.Apps...), nil
}

func (f *FakeApps) Quit(pid int) error {
	if f.AskSave {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.Log = append(f.Log, fmt.Sprintf("quit %d", pid))
		return nil
	}
	return f.remove(pid, "quit")
}

func (f *FakeApps) ForceQuit(pid int) error { return f.remove(pid, "force") }

// SetWindows đổi số cửa sổ của tiến trình pid (app vừa mở cửa sổ) – an toàn khi engine đang đọc.
func (f *FakeApps) SetWindows(pid, n int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := range f.Apps {
		if f.Apps[i].PID == pid {
			f.Apps[i].Windows = n
		}
	}
}

func (f *FakeApps) remove(pid int, op string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, a := range f.Apps {
		if a.PID == pid {
			f.Log = append(f.Log, fmt.Sprintf("%s %d", op, pid))
			f.Apps = append(f.Apps[:i], f.Apps[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("không có tiến trình %d", pid)
}

// Show – cửa sổ mới hiện lên trên cùng (như app vừa mở).
func (f *FakeWindows) Show(w model.WindowInfo) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Wins = append([]model.WindowInfo{w}, f.Wins...)
}
