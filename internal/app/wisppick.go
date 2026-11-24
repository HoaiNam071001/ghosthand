package app

import (
	"context"
	"time"

	"ghosthand/internal/model"
	"ghosthand/internal/wisp"
)

// Chọn element trên Wisp (bước 65): người dùng bấm phần tử trong Wisp → event `wisp:pick` → frontend thêm node.

// WispPick – dữ liệu event `wisp:pick`. Warn: selector không khớp đúng 1 phần tử.
type WispPick struct {
	Step model.Step `json:"step"`
	Warn bool       `json:"warn"`
	URL  string     `json:"url"`
}

// StartWispPick bật / tắt chế độ chọn phần tử trên Wisp (cần Wisp đang mở + bật cổng). Nối riêng, không mở Wisp.
func (a *App) StartWispPick(on bool) error {
	a.mu.Lock()
	if a.wispPickB == nil {
		b := wisp.New(false)
		b.OnPick(a.onWispPick)
		a.wispPickB = b
	}
	b := a.wispPickB
	a.mu.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return b.Pick(ctx, on)
}

func (a *App) onWispPick(ev wisp.PickEvent) {
	if st, warn, ok := wisp.PickStep(ev); ok {
		a.emit("wisp:pick", WispPick{Step: st, Warn: warn, URL: ev.URL})
	}
}

// AckWispPick – frontend đã thêm node `ref`: Wisp hiện toast "Đã thêm …".
func (a *App) AckWispPick(ref string) {
	a.mu.Lock()
	b := a.wispPickB
	a.mu.Unlock()
	if b == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	b.PickDone(ctx, "Đã thêm "+ref)
}
