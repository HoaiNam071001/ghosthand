package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Kịch bản AI tạo để thử (61 M5, model.ScriptMeta.Trial): chỉ nằm trong thư mục kịch bản của AI; lần dùng cuối = lúc
// ghi file (mtime) hoặc lúc mở / chạy (ghi ở trial-seen.json – mở không đổi file). Quá TrialDays ngày không dùng thì
// app bỏ vào Thùng rác.

// Trial – một kịch bản thử.
type Trial struct {
	Path     string `json:"path"`
	Name     string `json:"name"`
	LastUsed int64  `json:"lastUsed"` // unix ms
}

// TrialDaysDefault – số ngày không mở thì dọn khi MCPSettings.TrialDays = 0.
const TrialDaysDefault = 7

// TrialKeep – giữ kịch bản thử bao lâu kể từ lần dùng cuối; 0 = không dọn.
func (m MCPSettings) TrialKeep() time.Duration {
	switch {
	case m.TrialDays < 0:
		return 0
	case m.TrialDays == 0:
		return TrialDaysDefault * 24 * time.Hour
	}
	return time.Duration(m.TrialDays) * 24 * time.Hour
}

var trialMu sync.Mutex

func trialSeenFile() (string, error) {
	base, err := ConfigDir()
	return filepath.Join(base, "trial-seen.json"), err
}

func loadTrialSeen(file string) map[string]int64 {
	m := map[string]int64{}
	if b, err := os.ReadFile(file); err == nil {
		_ = json.Unmarshal(b, &m)
	}
	return m
}

func editTrialSeen(f func(map[string]int64)) {
	trialMu.Lock()
	defer trialMu.Unlock()
	file, err := trialSeenFile()
	if err != nil {
		return
	}
	m := loadTrialSeen(file)
	f(m)
	if b, err := json.Marshal(m); err == nil {
		_ = os.WriteFile(file, b, 0o644) // lỗi chỉ làm dọn sớm hơn theo mtime – không chặn mở / chạy
	}
}

// MarkTrialUsed – kịch bản thử path vừa được mở / chạy.
func MarkTrialUsed(path string) {
	editTrialSeen(func(m map[string]int64) { m[path] = time.Now().UnixMilli() })
}

// Trials – kịch bản thử trong thư mục dir (không đệ quy), dùng gần nhất trước.
func Trials(dir string) []Trial {
	file, _ := trialSeenFile()
	trialMu.Lock()
	seen := loadTrialSeen(file)
	trialMu.Unlock()
	return listTrials(dir, seen)
}

func listTrials(dir string, seen map[string]int64) []Trial {
	out := []Trial{}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return out
	}
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".json") {
			continue
		}
		p := filepath.Join(dir, e.Name())
		sc, err := ReadScriptFile(p)
		info, ierr := e.Info()
		if err != nil || ierr != nil || !sc.IsTrial() {
			continue
		}
		out = append(out, Trial{Path: p, Name: sc.Name, LastUsed: max(info.ModTime().UnixMilli(), seen[p])})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].LastUsed > out[j].LastUsed })
	return out
}

// StaleTrials – kịch bản thử không dùng quá keep tính tới now; keep 0 = không dọn.
func StaleTrials(list []Trial, keep time.Duration, now time.Time) []Trial {
	out := []Trial{}
	if keep <= 0 {
		return out
	}
	for _, t := range list {
		if now.Sub(time.UnixMilli(t.LastUsed)) > keep {
			out = append(out, t)
		}
	}
	return out
}

// ForgetTrials – bỏ dấu lần mở + Mở gần đây của các file đã dọn.
func ForgetTrials(paths []string) {
	editTrialSeen(func(m map[string]int64) {
		for _, p := range paths {
			delete(m, p)
		}
	})
	EditRecent(func(l []string) []string {
		for _, p := range paths {
			l = RemoveRecent(l, p)
		}
		return l
	})
}
