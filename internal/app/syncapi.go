package app

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/gdrive"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// Cài đặt → Đồng bộ (bước 54 C8). Đăng nhập Google, phạm vi, cụm mật khẩu cho bí mật, đồng bộ ngay.
// AI (MCP) không có đường nào tới đây – chỉ giao diện (decisions 54).

const syncLoginWait = 5 * time.Minute

// SyncLogin mở trình duyệt hệ thống để đăng nhập Google, chờ tới khi xong. Lần đầu tự bật kịch bản + cài đặt.
func (a *App) SyncLogin() error {
	ctx, cancel := context.WithTimeout(context.Background(), syncLoginWait)
	defer cancel()
	err := a.cloudAuth().Login(ctx, func(url string) error {
		runtime.BrowserOpenURL(a.ctx, url)
		return nil
	})
	if err != nil {
		return err
	}
	// tài khoản có thể khác lần trước: trạng thái cũ sẽ khiến cloud mới trông như "đã xoá hết" → bỏ, mọi file coi là mới
	if p, perr := syncFile(syncStateFile); perr == nil {
		_ = os.Remove(p)
	}
	if cfg := store.CurrentSettings().Sync; !cfg.Any() {
		cfg.Scripts, cfg.Settings = true, true
		_ = store.SetSync(cfg)
	}
	a.emitSyncStatus()
	return nil
}

// SyncLogout xoá token (và thu hồi quyền trên Google) + trạng thái đồng bộ. Dữ liệu trên máy và trên cloud giữ nguyên.
func (a *App) SyncLogout() error {
	err := a.cloudAuth().Logout(context.Background())
	if p, perr := syncFile(syncStateFile); perr == nil {
		_ = os.Remove(p)
	}
	a.cloudsync.mu.Lock()
	a.cloudsync.lastAt, a.cloudsync.lastErr, a.cloudsync.conflicts = time.Time{}, "", nil
	a.cloudsync.mu.Unlock()
	a.emitSyncStatus()
	return err
}

// GetSyncSettings – cấu hình đồng bộ của máy này.
func (a *App) GetSyncSettings() store.SyncSettings { return store.CurrentSettings().Sync }

// SetSyncSettings lưu cấu hình. Bật đồng bộ bí mật phải có cụm mật khẩu trước.
func (a *App) SetSyncSettings(c store.SyncSettings) error {
	if c.Secrets && syncPassphrase() == "" {
		return cloud.ErrNoPassphrase
	}
	if err := store.SetSync(c); err != nil {
		return err
	}
	a.emitSyncStatus()
	return nil
}

// SetSyncPassphrase đặt cụm mật khẩu mã hoá bí mật (cất trong keychain). Đã có bản mã trên cloud thì cụm mật khẩu phải
// mở được nó (máy mới vào nhóm); rotate = đổi cụm mật khẩu: mã hoá lại bằng salt mới và đẩy lên ở lượt đồng bộ kế.
func (a *App) SetSyncPassphrase(pass string, rotate bool) error {
	if len([]rune(pass)) < minPassphraseLen {
		return fmt.Errorf("cụm mật khẩu tối thiểu %d ký tự", minPassphraseLen)
	}
	if !rotate {
		if err := a.verifyPassphrase(pass); err != nil {
			return err
		}
	} else if err := a.verifyPassphrase(syncPassphrase()); err != nil && syncPassphrase() != "" {
		return fmt.Errorf("cụm mật khẩu hiện tại không mở được kho trên cloud, chưa thể đổi: %w", err)
	}
	if err := (secrets.System{}).Set(context.Background(), syncPassName, pass); err != nil {
		return err
	}
	if rotate {
		saveSalt(secrets.NewSalt())
		a.cloudsync.mu.Lock()
		a.cloudsync.skipVerify = true
		a.cloudsync.mu.Unlock()
	}
	a.emitSyncStatus()
	return nil
}

const minPassphraseLen = 8

// verifyPassphrase: có bản mã trên cloud thì pass phải mở được; chưa đăng nhập / chưa có bản mã thì bỏ qua.
func (a *App) verifyPassphrase(pass string) error {
	if pass == "" || !a.cloudAuth().LoggedIn(context.Background()) {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	blob, _, err := (&gdrive.Drive{Auth: a.cloudAuth()}).Get(ctx, cloud.SecretsPath)
	if errors.Is(err, cloud.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = secrets.Open(pass, blob)
	return err
}

// ClearSyncPassphrase xoá cụm mật khẩu khỏi máy và tắt đồng bộ bí mật. Bản mã trên cloud giữ nguyên.
func (a *App) ClearSyncPassphrase() error {
	cfg := store.CurrentSettings().Sync
	cfg.Secrets = false
	if err := store.SetSync(cfg); err != nil {
		return err
	}
	err := (secrets.System{}).Delete(context.Background(), syncPassName)
	a.emitSyncStatus()
	return err
}
