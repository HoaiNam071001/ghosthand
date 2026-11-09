package app

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/gdrive"
	"ghosthand/internal/device"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// Đồng bộ cloud (bước 54 C8): ghép Library + cài đặt + kho bí mật thành một cloud.Local, chạy cloud.Syncer lên Google Drive.
// Lượt do người dùng bấm hỏi xung đột (syncgate.go); lượt tự động (mở app / sau khi lưu / theo chu kỳ) không bật hộp hỏi –
// xung đột để lại trong trạng thái, chờ người dùng bấm Đồng bộ ngay.

const (
	syncPassName   = "cloud-sync-passphrase" // mục keychain; không đi qua secrets.Store nên không hiện trong danh sách bí mật
	syncStateFile  = "cloud-state.json"
	syncSaltFile   = "cloud-secrets-salt"
	syncRunTimeout = 20 * time.Minute
)

// syncState – trạng thái đồng bộ trong tiến trình.
type syncState struct {
	mu         sync.Mutex
	auth       *gdrive.Auth
	running    bool
	lastTry    time.Time
	lastAt     time.Time
	lastErr    string
	sum        SyncSummary
	conflicts  []string
	missing    []string
	held       []string
	saveTimer  *time.Timer
	skipVerify bool // vừa đổi cụm mật khẩu: lượt kế đẩy bản mã mới, không so với bản cũ trên cloud
}

// SyncSummary – kết quả lượt gần nhất.
type SyncSummary struct {
	Pushed  int      `json:"pushed"`
	Pulled  int      `json:"pulled"`
	Deleted int      `json:"deleted"`
	Kept    []string `json:"kept,omitempty"`  // bản cloud đã lưu thành file riêng (giữ cả hai)
	Pulls   []string `json:"pulls,omitempty"` // đường dẫn cloud đã kéo về máy (giao diện nạp lại thứ đang mở)
}

// SyncStatus – trạng thái cho giao diện (Cài đặt → Đồng bộ, chấm trên thanh dưới).
type SyncStatus struct {
	HasClient     bool        `json:"hasClient"` // bản này có khoá đăng nhập Google
	LoggedIn      bool        `json:"loggedIn"`
	Running       bool        `json:"running"`
	LastAt        string      `json:"lastAt,omitempty"` // RFC3339
	LastError     string      `json:"lastError,omitempty"`
	Summary       SyncSummary `json:"summary"`
	Conflicts     []string    `json:"conflicts,omitempty"` // tên đang chờ giải quyết
	Missing       []string    `json:"missing,omitempty"`   // tệp đi kèm không đọc được
	Held          []string    `json:"held,omitempty"`      // hoãn vì đang soạn dở
	HasPassphrase bool        `json:"hasPassphrase"`
	Device        string      `json:"device"`
}

func (a *App) cloudAuth() *gdrive.Auth {
	s := &a.cloudsync
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.auth == nil {
		s.auth = &gdrive.Auth{Store: gdrive.KeychainTokens{Backend: secrets.System{}}}
	}
	return s.auth
}

func syncPassphrase() string {
	v, _ := secrets.System{}.Get(context.Background(), syncPassName)
	return v
}

func syncFile(name string) (string, error) {
	dir, err := store.ConfigDir()
	return filepath.Join(dir, name), err
}

func loadSalt() []byte {
	p, err := syncFile(syncSaltFile)
	if err != nil {
		return nil
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return nil
	}
	salt, _ := base64.StdEncoding.DecodeString(strings.TrimSpace(string(b)))
	return salt
}

func saveSalt(salt []byte) {
	if p, err := syncFile(syncSaltFile); err == nil {
		_ = store.WriteFileAtomic(p, []byte(base64.StdEncoding.EncodeToString(salt)))
	}
}

// SyncStatus – trạng thái hiện tại.
func (a *App) SyncStatus() SyncStatus {
	cfg := store.CurrentSettings().Sync
	st := SyncStatus{
		HasClient: gdrive.HasClient(), LoggedIn: a.cloudAuth().LoggedIn(context.Background()),
		HasPassphrase: syncPassphrase() != "", Device: cfg.DeviceName(),
	}
	s := &a.cloudsync
	s.mu.Lock()
	defer s.mu.Unlock()
	st.Running, st.LastError, st.Summary = s.running, s.lastErr, s.sum
	if !s.lastAt.IsZero() {
		st.LastAt = s.lastAt.Format(time.RFC3339)
	}
	st.Conflicts = append([]string(nil), s.conflicts...)
	st.Missing = append([]string(nil), s.missing...)
	st.Held = append([]string(nil), s.held...)
	return st
}

func (a *App) emitSyncStatus() { a.emitUI("sync:status", a.SyncStatus()) }

// heldPath – kịch bản đang soạn có thay đổi chưa lưu, dạng đường dẫn cloud ("" = không có).
func (a *App) heldPath(root string) string {
	a.mu.Lock()
	edit, dirty := a.editPath, a.dirty
	a.mu.Unlock()
	if !dirty || edit == "" {
		return ""
	}
	rel, err := filepath.Rel(root, edit)
	if err != nil || strings.HasPrefix(rel, "..") {
		return ""
	}
	return cloud.ScriptsDir + filepath.ToSlash(rel)
}

// buildSyncer dựng Syncer theo cài đặt. interactive = có hỏi xung đột.
func (a *App) buildSyncer(ctx context.Context, interactive bool) (*cloud.Syncer, *cloud.Library, error) {
	cfg := store.CurrentSettings().Sync
	if !cfg.Any() {
		return nil, nil, errors.New("chưa bật phần nào để đồng bộ")
	}
	root, err := store.ScriptsDir()
	if err != nil {
		return nil, nil, err
	}
	remote := &gdrive.Drive{Auth: a.cloudAuth()}
	lib := &cloud.Library{Root: root, Trash: device.SystemTrash{}}
	multi := &cloud.Multi{}
	if cfg.Scripts {
		multi.Add(lib, cloud.ScriptsDir, cloud.AssetsDir)
	}
	if cfg.Settings {
		multi.Add(cloud.SettingsLocal{
			Export: func() ([]byte, error) { return store.CurrentSettings().EncodePortable() },
			Import: store.ImportPortable,
		}, cloud.SettingsPath)
	}
	if cfg.Secrets {
		sl := &cloud.SecretsLocal{Store: store.Secrets(), Pass: syncPassphrase(), Salt: loadSalt(), OnSalt: saveSalt}
		if err := a.prepareSecrets(ctx, remote, sl); err != nil {
			return nil, nil, err
		}
		multi.Add(sl, cloud.SecretsPath)
	}
	statePath, err := syncFile(syncStateFile)
	if err != nil {
		return nil, nil, err
	}
	st, err := cloud.LoadState(statePath)
	if err != nil {
		return nil, nil, err
	}
	sy := &cloud.Syncer{
		Remote: remote, Local: multi, State: &st, Device: cfg.DeviceName(),
		Scope: cloud.Scope{Scripts: cfg.Scripts, Settings: cfg.Settings, Secrets: cfg.Secrets},
		Hold:  func(p string) bool { h := a.heldPath(root); return h != "" && strings.EqualFold(p, h) },
	}
	if interactive {
		sy.Resolve = a.syncResolve
	}
	return sy, lib, nil
}

// prepareSecrets: máy mới lấy salt của nhóm từ cloud; cụm mật khẩu phải mở được bản mã trên cloud (không thì dừng –
// nếu không, "giữ bản máy" sẽ ghi đè bản mã của nhóm bằng cụm mật khẩu khác).
func (a *App) prepareSecrets(ctx context.Context, remote cloud.Provider, sl *cloud.SecretsLocal) error {
	if sl.Pass == "" {
		return cloud.ErrNoPassphrase
	}
	a.cloudsync.mu.Lock()
	skip := a.cloudsync.skipVerify
	a.cloudsync.skipVerify = false
	a.cloudsync.mu.Unlock()
	if skip {
		return nil
	}
	blob, _, err := remote.Get(ctx, cloud.SecretsPath)
	if errors.Is(err, cloud.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if len(sl.Salt) == 0 {
		if salt, err := secrets.VaultSalt(blob); err == nil {
			sl.Salt = salt
			saveSalt(salt)
		}
	}
	if _, err := secrets.Open(sl.Pass, blob); err != nil {
		return fmt.Errorf("cụm mật khẩu không mở được kho bí mật trên cloud: %w", err)
	}
	return nil
}

// SyncNow đồng bộ ngay (người dùng bấm): chạy nền, kết quả qua event sync:status + sync:done. Đang chạy thì thôi.
func (a *App) SyncNow() error {
	if !a.cloudAuth().LoggedIn(context.Background()) {
		return gdrive.ErrNeedLogin
	}
	if !store.CurrentSettings().Sync.Any() {
		return errors.New("chưa bật phần nào để đồng bộ")
	}
	go a.runSync(true)
	return nil
}

func (a *App) runSync(interactive bool) {
	s := &a.cloudsync
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running, s.lastTry = true, time.Now()
	s.mu.Unlock()
	a.emitSyncStatus()

	ctx, cancel := context.WithTimeout(context.Background(), syncRunTimeout)
	defer cancel()
	res, missing, err := a.doSync(ctx, interactive)

	s.mu.Lock()
	s.running = false
	s.lastErr = ""
	if err != nil {
		s.lastErr = err.Error()
	} else {
		s.lastAt = time.Now()
	}
	s.sum = SyncSummary{
		Pushed: len(res.Pushed), Pulled: len(res.Pulled), Deleted: len(res.DeletedLocal) + len(res.DeletedRemote),
		Kept: res.Kept, Pulls: res.Pulled,
	}
	s.conflicts, s.missing, s.held = nil, missing, res.Held
	for _, c := range res.Conflicts {
		s.conflicts = append(s.conflicts, syncDisplayName(c.Path))
	}
	sum := s.sum
	s.mu.Unlock()
	a.emitSyncStatus()
	if res.Changed() {
		a.emitUI("sync:done", sum)
	}
}

func (a *App) doSync(ctx context.Context, interactive bool) (cloud.Result, []string, error) {
	sy, lib, err := a.buildSyncer(ctx, interactive)
	if err != nil {
		return cloud.Result{}, nil, err
	}
	res, runErr := sy.Run(ctx)
	if p, err := syncFile(syncStateFile); err == nil {
		if serr := sy.State.Save(p); serr != nil && runErr == nil {
			runErr = serr
		}
	}
	return res, lib.Missing(), runErr
}

// emitUI gửi event cho giao diện Wails, KHÔNG qua a.hub (SSE của API local): tên file, tên máy, lỗi đồng bộ không nên lộ cho
// chương trình / AI đang nghe API.
func (a *App) emitUI(event string, data any) {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, event, data)
	}
}
