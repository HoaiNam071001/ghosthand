package app

import (
	"context"
	"time"

	"ghosthand/internal/store"
)

// Tự đồng bộ (bước 54 C8): khi mở app, sau khi lưu kịch bản, theo chu kỳ. Chỉ chạy khi đã đăng nhập và có bật phần nào;
// lượt tự động không hỏi xung đột (syncrun.go).

const (
	syncSaveDelay = 5 * time.Second
	syncOpenDelay = 3 * time.Second
	syncTickEvery = 30 * time.Second
)

func (a *App) autoSyncReady() (store.SyncSettings, bool) {
	cfg := store.CurrentSettings().Sync
	return cfg, cfg.Any() && a.cloudAuth().LoggedIn(context.Background())
}

func (a *App) startAutoSync(ctx context.Context) {
	go func() {
		select {
		case <-ctx.Done():
			return
		case <-time.After(syncOpenDelay):
		}
		if cfg, ok := a.autoSyncReady(); ok && cfg.OnOpen {
			a.runSync(false)
		}
		t := time.NewTicker(syncTickEvery)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
			}
			cfg, ok := a.autoSyncReady()
			if !ok || cfg.IntervalMin <= 0 {
				continue
			}
			a.cloudsync.mu.Lock()
			due := time.Since(a.cloudsync.lastTry) >= time.Duration(cfg.IntervalMin)*time.Minute
			a.cloudsync.mu.Unlock()
			if due {
				a.runSync(false)
			}
		}
	}()
}

// syncSoon – sau khi lưu kịch bản: đợi vài giây (gộp nhiều lần lưu) rồi đồng bộ.
func (a *App) syncSoon() {
	cfg, ok := a.autoSyncReady()
	if !ok || !cfg.OnSave || !cfg.Scripts {
		return
	}
	s := &a.cloudsync
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.saveTimer != nil {
		s.saveTimer.Stop()
	}
	s.saveTimer = time.AfterFunc(syncSaveDelay, func() { a.runSync(false) })
}
