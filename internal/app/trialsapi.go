package app

import (
	"fmt"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/store"
)

// Kịch bản AI tạo để thử (61 M5): nhóm "AI thử" ở thư viện + tự vào Thùng rác sau TrialDays ngày không mở.

// TrialList – nhóm "AI thử" ở thư viện.
type TrialList struct {
	Items []store.Trial `json:"items"`
	Days  int           `json:"days"` // tự dọn sau bao ngày không mở; 0 = không dọn
}

// TrialScripts – kịch bản thử trong thư mục kịch bản của AI, dùng gần nhất trước.
func (a *App) TrialScripts() TrialList {
	dir, err := store.AIScriptsDir()
	if err != nil {
		return TrialList{Items: []store.Trial{}}
	}
	keep := store.CurrentSettings().MCP.TrialKeep()
	return TrialList{Items: store.Trials(dir), Days: int(keep / (24 * time.Hour))}
}

// cleanTrials – lúc mở app: kịch bản thử quá hạn vào Thùng rác, trừ file bản nháp đang trỏ tới (app sắp mở lại nó).
func (a *App) cleanTrials() {
	dir, err := store.AIScriptsDir()
	if err != nil {
		return
	}
	open := ""
	if d := store.LoadDraft(); d != nil {
		open = d.Path
	}
	paths := []string{}
	for _, t := range store.StaleTrials(store.Trials(dir), store.CurrentSettings().MCP.TrialKeep(), time.Now()) {
		if t.Path != open {
			paths = append(paths, t.Path)
		}
	}
	if len(paths) == 0 {
		return
	}
	if err := (device.SystemTrash{}).MoveToTrash(paths); err != nil {
		fmt.Println("không dọn được kịch bản AI thử:", err)
		return
	}
	store.ForgetTrials(paths)
}

// keepTrial – người dùng lưu tay kịch bản thử thì giữ lại (bỏ cờ).
func keepTrial(sc model.Script) model.Script {
	if sc.IsTrial() {
		m := *sc.Meta
		m.Trial = false
		sc.Meta = &m
	}
	return sc
}

// noteTrialUsed – kịch bản thử vừa được mở / chạy: lùi hạn dọn.
func noteTrialUsed(sc model.Script, path string) {
	if path != "" && sc.IsTrial() {
		store.MarkTrialUsed(path)
	}
}
