package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

const draftFile = "draft.json"

// Draft – bản nháp tự lưu: kịch bản đang soạn kèm file nó thuộc về, mở lại app thì khôi phục nguyên trạng.
type Draft struct {
	Script  model.Script `json:"script"`
	Path    string       `json:"path"`    // file đang mở, "" = chưa lưu lần nào
	Dirty   bool         `json:"dirty"`   // có thay đổi chưa lưu xuống file
	SavedAt int64        `json:"savedAt"` // thời điểm ghi nháp, unix ms
}

func SaveDraft(d Draft) error {
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	d.SavedAt = time.Now().UnixMilli()
	b, err := encodeDraft(d)
	if err != nil {
		return err
	}
	return WriteFileAtomic(filepath.Join(dir, draftFile), b)
}

func encodeDraft(d Draft) ([]byte, error) {
	d.Script.Version = model.ScriptVersion
	return json.Marshal(d)
}

func LoadDraft() *Draft {
	dir, err := ConfigDir()
	if err != nil {
		return nil
	}
	return loadDraft(dir)
}

func loadDraft(dir string) *Draft {
	b, err := os.ReadFile(filepath.Join(dir, draftFile))
	if err != nil {
		return nil
	}
	var raw struct {
		Draft
		Script json.RawMessage `json:"script"`
	}
	if json.Unmarshal(b, &raw) != nil {
		return nil
	}
	sc, err := script.DecodeScript(raw.Script)
	if err != nil {
		fmt.Println("bỏ qua bản nháp:", err)
		return nil
	}
	d := raw.Draft
	d.Script = sc
	return &d
}
