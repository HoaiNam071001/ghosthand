package store

import (
	"encoding/json"
	"os"
	"path/filepath"

	"ghosthand/internal/model"
)

// Ghim output node (bước 31c): kết quả một node được giữ trên máy theo kịch bản (cùng khoá với lịch sử chạy), KHÔNG
// ghi vào file kịch bản – chạy từ app thì node ghim không chạy mà trả luôn kết quả này.

func pinsFile(name, path string) (string, error) {
	base, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "pins", filepath.Base(RunsDir(base, name, path))+".json"), nil
}

// Pins – các node đã ghim của kịch bản, theo id node. Chưa có thì rỗng.
func Pins(name, path string) map[string]model.StepResult {
	out := map[string]model.StepResult{}
	file, err := pinsFile(name, path)
	if err != nil {
		return out
	}
	if b, err := os.ReadFile(file); err == nil {
		_ = json.Unmarshal(b, &out)
	}
	return out
}

// SetPin ghim kết quả r cho node r.NodeID (thay bản ghim cũ).
func SetPin(name, path string, r model.StepResult) error {
	return savePins(name, path, func(m map[string]model.StepResult) { m[r.NodeID] = r })
}

// ClearPin bỏ ghim node nodeID.
func ClearPin(name, path, nodeID string) error {
	return savePins(name, path, func(m map[string]model.StepResult) { delete(m, nodeID) })
}

func savePins(name, path string, edit func(map[string]model.StepResult)) error {
	file, err := pinsFile(name, path)
	if err != nil {
		return err
	}
	m := Pins(name, path)
	edit(m)
	if len(m) == 0 {
		if err := os.Remove(file); err != nil && !os.IsNotExist(err) {
			return err
		}
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
		return err
	}
	b, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return WriteFileAtomic(file, b)
}
