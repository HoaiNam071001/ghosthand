package main

import (
	"fmt"
	"os"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/runborder"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// Chuẩn bị màn hình cho lần chạy: thu thanh mini + đưa cửa sổ đích lên (57 B1–B2), viền lúc đang chạy (58 D2).

// stageRun – trước lần chạy từ AI / hẹn giờ / CLI / API (57 B1, B2, session.Deps.Stage): cửa sổ chính đang mở thì thu về
// thanh mini như bấm Chạy trong app (không đè lên app đích), rồi đưa cửa sổ đích lên trước – thanh mini vừa hiện làm app
// này lên trước, không đưa lại thì phím gõ vào Ghosthand.
func (a *App) stageRun(focus *model.WindowInfo) error {
	ws := device.SystemWindows{}
	before, err := ws.List()
	if err != nil {
		return nil // hệ không cho đọc cửa sổ – chạy như cũ
	}
	target, err := stageTarget(before, focus, os.Getpid())
	if err != nil {
		return err
	}
	a.mu.Lock()
	shrink := a.mode == ModeMain
	a.mu.Unlock()
	if shrink {
		if err := a.SetWindowMode(ModeMinibar); err != nil {
			return err
		}
	}
	if target.ID != 0 {
		// chờ thanh mini hiện xong (frontend cũng thu khi nhận run:started) – hiện cửa sổ đưa app này lên trước
		time.Sleep(200 * time.Millisecond)
		_ = ws.Focus(target.ID) // không đưa lên được thì node có onlyInWindow vẫn chặn, node khác chạy như cũ
	}
	return nil
}

// stageTarget – cửa sổ cần đưa lên trước: focus (app + tiêu đề, tiêu đề đổi thì cửa sổ cùng app); không có focus thì
// cửa sổ đang ở trước, app này đang ở trước thì cửa sổ ngay dưới. ID 0 = không có gì để đưa lên.
func stageTarget(wins []model.WindowInfo, focus *model.WindowInfo, self int) (model.WindowInfo, error) {
	others := make([]model.WindowInfo, 0, len(wins))
	for _, w := range wins {
		if w.PID != self {
			others = append(others, w)
		}
	}
	if focus != nil {
		for _, title := range []string{focus.Title, ""} {
			if i, _ := model.MatchWindow(others, focus.App, title, ""); i >= 0 {
				return others[i], nil
			}
		}
		return model.WindowInfo{}, fmt.Errorf("cửa sổ đang ở trước lúc lỗi (%s – %q) đã đóng – chưa thao tác gì; mở lại (node Mở / Cửa sổ) rồi chạy", focus.App, focus.Title)
	}
	for _, w := range others {
		if w.Front && !w.Minimized {
			return w, nil
		}
	}
	for _, w := range others {
		if !w.Minimized {
			return w, nil
		}
	}
	return model.WindowInfo{}, nil
}

// showBorder – viền quanh màn hình theo việc lần chạy đang làm (58 D2, session.OnActivity): hiện trên màn đang có
// chuột (chỗ engine vừa / sắp thao tác), xong / lỗi / dừng hoặc Cài đặt tắt thì ẩn.
func (a *App) showBorder(act session.Activity) {
	px := runborder.Px(store.CurrentSettings().Overlay.Border)
	look, ok := runborder.LookFor(act.Doing)
	if px == 0 || !ok {
		runborder.Hide()
		return
	}
	x, y := device.Location()
	runborder.Show(x, y, px, look)
}
