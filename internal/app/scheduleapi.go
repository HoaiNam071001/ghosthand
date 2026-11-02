package app

import (
	"bytes"
	"context"
	"fmt"
	"image/png"
	"os"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/notify"
	"ghosthand/internal/schedule"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// Hẹn giờ (bước 22): bộ hẹn giờ chạy nền trong app (internal/schedule), tới giờ chạy kịch bản qua session như mọi
// nguồn khác; xong thì gửi thông báo (internal/notify) theo cài đặt của hẹn giờ. Event "schedule:changed" khi danh
// sách đổi (hẹn Một lần đã chạy thì tự bỏ), "schedule:error" khi tới giờ mà không chạy được.

// ScheduleError – event "schedule:error".
type ScheduleError struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}

func (a *App) startScheduler(ctx context.Context) {
	go schedule.Loop(ctx, store.Schedules, a.fireSchedule)
}

// ListSchedules – mọi hẹn giờ.
func (a *App) ListSchedules() []model.Schedule { return store.Schedules() }

// SetSchedule lưu hẹn giờ của file s.Path (đã có thì thay).
func (a *App) SetSchedule(s model.Schedule) error {
	if s.Path == "" {
		return fmt.Errorf("lưu kịch bản thành file trước rồi mới hẹn giờ")
	}
	s.Path = absPath(s.Path)
	if _, err := os.Stat(s.Path); err != nil {
		return fmt.Errorf("không thấy file %s", s.Path)
	}
	if err := s.Check(); err != nil {
		return err
	}
	if err := store.EditSchedules(func(m map[string]model.Schedule) { m[s.Path] = s }); err != nil {
		return err
	}
	a.emit("schedule:changed", nil)
	return nil
}

// RemoveSchedule bỏ hẹn giờ của file path.
func (a *App) RemoveSchedule(path string) error {
	if err := store.EditSchedules(func(m map[string]model.Schedule) { delete(m, absPath(path)) }); err != nil {
		return err
	}
	a.emit("schedule:changed", nil)
	return nil
}

// fireSchedule – tới giờ: chạy kịch bản; không chạy được (đang chạy kịch bản khác, file mất, chưa đồng ý thao tác
// nguy hiểm…) thì báo lỗi + gửi thông báo lỗi.
func (a *App) fireSchedule(s model.Schedule) {
	if s.Repeat == model.RepeatOnce {
		_ = a.RemoveSchedule(s.Path)
	}
	a.mu.Lock()
	a.schedRuns[s.Path] = s // ghi trước khi chạy – kịch bản ngắn có thể xong trước khi Start trả về
	a.mu.Unlock()
	if _, err := a.startScheduled(s); err != nil {
		a.mu.Lock()
		delete(a.schedRuns, s.Path)
		a.mu.Unlock()
		a.emit("schedule:error", ScheduleError{Path: s.Path, Error: err.Error()})
		a.notifyRun(s, session.Status{Script: s.Path, State: session.StateFail, Error: "không chạy được: " + err.Error()})
	}
}

func (a *App) startScheduled(s model.Schedule) (string, error) {
	sc, err := store.ReadScriptFile(s.Path)
	if err != nil {
		return "", err
	}
	values, err := presetValues(s.Path, s.Preset)
	if err != nil {
		return "", err
	}
	if s.Minimize && a.ctx != nil {
		runtime.WindowUnminimise(a.ctx) // thanh mini cần cửa sổ đang hiện
	}
	return a.sess.Start(sc, values, session.Options{Path: s.Path, Source: session.SourceSchedule, Preset: s.Preset})
}

// onRunEnd – session.OnEnd: lần chạy do hẹn giờ thì gửi thông báo, thu nhỏ lại nếu hẹn giờ yêu cầu.
func (a *App) onRunEnd(st session.Status, _ error) {
	if st.Source != session.SourceSchedule {
		return
	}
	a.mu.Lock()
	s, ok := a.schedRuns[st.Path]
	delete(a.schedRuns, st.Path)
	a.mu.Unlock()
	if !ok {
		return
	}
	a.notifyRun(s, st)
	if s.Minimize && a.ctx != nil {
		time.AfterFunc(1500*time.Millisecond, func() { runtime.WindowMinimise(a.ctx) }) // sau khi frontend về màn chính
	}
}

// notifyRun gửi thông báo nếu hẹn giờ có bật và kết quả khớp "Gửi khi".
func (a *App) notifyRun(s model.Schedule, st session.Status) {
	ok := st.State == session.StateSuccess
	if s.Notify == "" || s.Notify == model.NotifyNone || (s.NotifyOn == model.NotifyOnDone && !ok) || (s.NotifyOn == model.NotifyOnError && ok) {
		return
	}
	msg := notify.Message{Text: runText(st), Fields: map[string]any{"runId": st.RunID, "script": st.Script, "path": s.Path, "state": st.State, "error": st.Error, "durationMs": st.DurationMs}}
	if s.Screenshot {
		msg.Image = screenPNG()
	}
	go func() {
		if err := notify.Send(context.Background(), s.Notify, s.NotifyTarget, msg); err != nil {
			a.emit("schedule:error", ScheduleError{Path: s.Path, Error: err.Error()})
		}
	}()
}

func runText(st session.Status) string {
	sec := float64(st.DurationMs) / 1000
	switch st.State {
	case session.StateSuccess:
		return fmt.Sprintf("✅ %s – xong sau %.1f s", st.Script, sec)
	case session.StateStopped:
		return fmt.Sprintf("⏹ %s – đã dừng sau %.1f s", st.Script, sec)
	}
	return fmt.Sprintf("❌ %s – lỗi: %s", st.Script, st.Error)
}

// screenPNG – ảnh màn hình chính lúc này; lỗi (thiếu quyền chụp) → nil, vẫn gửi chữ.
func screenPNG() []byte {
	img, err := device.RobotgoScreen{}.Capture(device.MainScreen())
	if err != nil {
		return nil
	}
	var buf bytes.Buffer
	if png.Encode(&buf, img) != nil {
		return nil
	}
	return buf.Bytes()
}
