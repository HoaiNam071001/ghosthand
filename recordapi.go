package main

import (
	"errors"
	"sync"
	"time"

	hook "github.com/robotn/gohook"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/record"
	"ghosthand/internal/script"
)

// Ghi macro (bước 24): bắt chuột / phím toàn cục bằng vòng hook của hotkey.go, F9 dừng. Ghép node ở internal/record,
// nhúng vào kịch bản đang soạn bằng script.Embed (cùng đường với Nhúng kịch bản).

const recordStopKey = "f9"

// recorder – trạng thái một lần ghi; hotkey.go gọi feed từ goroutine nghe phím.
type recorder struct {
	mu     sync.Mutex
	on     bool
	t0     time.Time
	events []record.Event
	done   []record.Event // lần ghi vừa xong, chờ FinishRecording
}

var rec recorder

func (r *recorder) active() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.on
}

// feed nhận sự kiện hook khi đang ghi; trả true nếu là phím dừng.
func (r *recorder) feed(ev hook.Event) (stop bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.on {
		return false
	}
	e := record.Event{At: time.Since(r.t0)}
	switch ev.Kind {
	case hook.MouseDown, hook.MouseUp:
		e.Kind = record.MouseDown
		if ev.Kind == hook.MouseUp {
			e.Kind = record.MouseUp
		}
		e.Button = map[uint16]string{1: "left", 2: "right", 3: "center"}[ev.Button]
		if e.Button == "" {
			return false
		}
		e.X, e.Y = device.Location()
	case hook.MouseWheel:
		e.Kind = record.Wheel
		e.Dir = "down"
		if ev.Rotation < 0 {
			e.Dir = "up"
		}
		e.X, e.Y = device.Location()
	case hook.KeyDown, hook.KeyUp:
		e.Key = hook.RawcodeToKeychar(ev.Rawcode)
		if e.Key == "" {
			return false
		}
		if e.Key == recordStopKey {
			return ev.Kind == hook.KeyDown
		}
		e.Kind = record.KeyDown
		if ev.Kind == hook.KeyUp {
			e.Kind = record.KeyUp
		}
	default:
		return false
	}
	r.events = append(r.events, e)
	return false
}

// StartRecording bắt đầu ghi: thu nhỏ cửa sổ app để không ghi cú bấm vào chính nó. F9 dừng (event "record:done").
func (a *App) StartRecording() error {
	if a.sess.Running() != "" {
		return errors.New("đang chạy kịch bản – dừng trước khi ghi")
	}
	rec.mu.Lock()
	if rec.on {
		rec.mu.Unlock()
		return errors.New("đang ghi rồi")
	}
	rec.on, rec.t0, rec.events, rec.done = true, time.Now(), nil, nil
	rec.mu.Unlock()
	runtime.WindowMinimise(a.ctx)
	return nil
}

// StopRecording dừng ghi (nút trên app khi cửa sổ còn thấy); sự kiện record:done báo frontend lấy kết quả.
func (a *App) StopRecording() { a.endRecording() }

func (a *App) endRecording() {
	rec.mu.Lock()
	if !rec.on {
		rec.mu.Unlock()
		return
	}
	rec.on, rec.done = false, rec.events
	rec.events = nil
	rec.mu.Unlock()
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
	runtime.EventsEmit(a.ctx, "record:done")
}

// FinishRecording ghép lần ghi vừa xong thành node và nhúng vào parent (khung nhóm). Nodes = 0 nếu không ghi được gì.
func (a *App) FinishRecording(parent model.Script) (script.EmbedResult, error) {
	rec.mu.Lock()
	events := rec.done
	rec.done = nil
	rec.mu.Unlock()
	screen := device.MainScreen()
	child := record.Build(events, script.Bounds(model.Script{}, screen))
	if len(child.Steps) == 0 {
		return script.EmbedResult{}, nil
	}
	child.Name = "Ghi " + time.Now().Format("15:04:05")
	return script.Embed(parent, child, screen, "ghi macro")
}
