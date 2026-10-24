package main

import (
	hook "github.com/robotn/gohook"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
)

// startHotkeys nghe phím toàn cục (kể cả khi app không được focus). Gọi trong startup.
//   - F8: đang chạy → dừng; không chạy → emit "hotkey:f8start" để frontend chạy kịch bản đang soạn
//   - F10: đang chạy → chạy node kế rồi dừng (debug, StepScript)
//   - F6: lưu vị trí chuột hiện tại thành điểm mới – emit "hotkey:f6" (Point); bỏ qua khi đang chạy
//
// macOS: cần quyền Accessibility; F6 / F8 / F10 mặc định là phím media nên phải bấm kèm fn.
func (a *App) startHotkeys() {
	f6 := hook.KeycharToRawcode("f6")
	f8 := hook.KeycharToRawcode("f8")
	f10 := hook.KeycharToRawcode("f10")
	evs := hook.Start()
	go func() {
		for ev := range evs {
			if rec.active() {
				if rec.feed(ev) {
					a.endRecording()
				}
				continue
			}
			switch {
			case ev.Kind == hook.HookDisabled:
				runtime.EventsEmit(a.ctx, "hotkey:error", "Không nghe được phím toàn cục – kiểm tra quyền Accessibility")
			case ev.Kind == hook.KeyDown && ev.Rawcode == f8:
				if a.sess.Running() != "" {
					a.sess.StopWith(session.StopByF8)
				} else {
					runtime.EventsEmit(a.ctx, "hotkey:f8start")
				}
			case ev.Kind == hook.KeyDown && ev.Rawcode == f10 && a.sess.Running() != "":
				a.StepScript()
			case ev.Kind == hook.KeyDown && ev.Rawcode == f6 && a.sess.Running() == "":
				x, y := device.Location()
				runtime.EventsEmit(a.ctx, "hotkey:f6", model.Point{X: x, Y: y})
			}
		}
	}()
}

func (a *App) stopHotkeys() {
	hook.End()
}
