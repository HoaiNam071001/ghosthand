package app

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"ghosthand/internal/cloud"
	"ghosthand/internal/store"
)

// Hỏi người dùng khi đồng bộ gặp xung đột (bước 54 C4): event "sync:conflict" → hộp thoại → AnswerSyncConflict.
// Không bao giờ tự ghi đè: không ai trả lời (hết giờ / đóng hộp) = bỏ qua, lần sau hỏi lại.

const syncAskTimeout = 10 * time.Minute

// Câu trả lời (AnswerSyncConflict).
const (
	syncLocal  = "local"  // giữ bản máy này
	syncRemote = "remote" // lấy bản cloud
	syncBoth   = "both"   // giữ cả hai (chỉ kịch bản)
	syncSkip   = "skip"
)

// SyncConflictAsk – nội dung hộp hỏi.
type SyncConflictAsk struct {
	ID            string `json:"id"`
	Path          string `json:"path"`          // đường dẫn trên cloud
	Name          string `json:"name"`          // tên hiển thị
	Kind          string `json:"kind"`          // script | settings | secrets
	Device        string `json:"device"`        // máy sửa cuối trên cloud
	RemoteTime    string `json:"remoteTime"`    // RFC3339
	LocalTime     string `json:"localTime"`     // RFC3339; "" nếu không biết
	LocalDeleted  bool   `json:"localDeleted"`  // máy này đã xoá
	RemoteDeleted bool   `json:"remoteDeleted"` // cloud đã xoá
	CanKeepBoth   bool   `json:"canKeepBoth"`   // chỉ kịch bản, và cả hai bên còn file
}

type syncGate struct {
	mu      sync.Mutex
	n       int
	pending map[string]chan string
}

func syncKind(p string) string {
	switch {
	case p == cloud.SettingsPath:
		return "settings"
	case p == cloud.SecretsPath:
		return "secrets"
	}
	return "script"
}

func syncDisplayName(p string) string {
	switch syncKind(p) {
	case "settings":
		return "Cài đặt"
	case "secrets":
		return "Kho bí mật"
	}
	return strings.TrimSuffix(strings.TrimPrefix(p, cloud.ScriptsDir), ".json")
}

// localModTime – giờ sửa file kịch bản ở máy (để người dùng so với giờ bên cloud); không biết thì "".
func localModTime(cloudPath string) string {
	if syncKind(cloudPath) != "script" {
		return ""
	}
	root, err := store.ScriptsDir()
	if err != nil {
		return ""
	}
	st, err := os.Stat(filepath.Join(root, filepath.FromSlash(strings.TrimPrefix(cloudPath, cloud.ScriptsDir))))
	if err != nil {
		return ""
	}
	return st.ModTime().Format(time.RFC3339)
}

// syncResolve – cloud.Resolver: hiện hộp hỏi và chờ trả lời.
func (a *App) syncResolve(c cloud.Conflict) cloud.Choice {
	g := &a.syncg
	ask := SyncConflictAsk{
		Path: c.Path, Name: syncDisplayName(c.Path), Kind: syncKind(c.Path), Device: c.Device,
		RemoteTime: c.RemoteTime.Format(time.RFC3339), LocalTime: localModTime(c.Path),
		LocalDeleted: c.LocalHash == "", RemoteDeleted: c.RemoteHash == "",
	}
	ask.CanKeepBoth = ask.Kind == "script" && !ask.LocalDeleted && !ask.RemoteDeleted
	g.mu.Lock()
	if g.pending == nil {
		g.pending = map[string]chan string{}
	}
	g.n++
	ask.ID = strconv.Itoa(g.n)
	ch := make(chan string, 1)
	g.pending[ask.ID] = ch
	g.mu.Unlock()
	defer func() {
		g.mu.Lock()
		delete(g.pending, ask.ID)
		g.mu.Unlock()
	}()

	a.showMain()
	a.emitUI("sync:conflict", ask)
	select {
	case ans := <-ch:
		switch ans {
		case syncLocal:
			return cloud.KeepLocal
		case syncRemote:
			return cloud.TakeRemote
		case syncBoth:
			return cloud.KeepBoth
		}
	case <-time.After(syncAskTimeout):
		a.emitUI("sync:conflict-timeout", ask.ID)
	}
	return cloud.Skip
}

// AnswerSyncConflict – người dùng trả lời hộp hỏi id: local | remote | both | skip.
func (a *App) AnswerSyncConflict(id, answer string) {
	a.syncg.mu.Lock()
	ch := a.syncg.pending[id]
	a.syncg.mu.Unlock()
	if ch != nil {
		select {
		case ch <- answer:
		default:
		}
	}
}
