package cloud

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Entry – một file trong manifest trên cloud.
type Entry struct {
	Hash   string    `json:"hash"`
	Ver    string    `json:"ver,omitempty"` // version của Provider ngay sau lần ghi cuối – lần ghi sau dùng làm ifMatch (không đè bản máy khác vừa đẩy)
	Device string    `json:"device"`        // tên máy sửa cuối
	Time   time.Time `json:"time"`
}

// Manifest – bảng hash của mọi file trên cloud (manifest.json). Hash lấy từ đây nên so sánh không cần tải file.
type Manifest struct {
	Version int              `json:"version"`
	Files   map[string]Entry `json:"files"`
}

const manifestVersion = 1

func newManifest() Manifest { return Manifest{Version: manifestVersion, Files: map[string]Entry{}} }

func decodeManifest(b []byte) (Manifest, error) {
	m := newManifest()
	if err := json.Unmarshal(b, &m); err != nil {
		return m, fmt.Errorf("manifest trên cloud hỏng: %w", err)
	}
	if m.Version > manifestVersion {
		return m, fmt.Errorf("cloud dùng định dạng đồng bộ mới hơn (v%d) – cập nhật Ghosthand", m.Version)
	}
	if m.Files == nil {
		m.Files = map[string]Entry{}
	}
	return m, nil
}

// Hash – băm nội dung (hex SHA-256).
func Hash(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

// State – bản cuối đã đồng bộ trên máy này (đường dẫn → hash): "bên thứ ba" của phép so ba bên. Lưu cạnh cấu hình.
type State struct {
	Files map[string]string `json:"files"`
}

// LoadState đọc state; chưa có file = chưa đồng bộ lần nào (mọi thứ đều "mới").
func LoadState(path string) (State, error) {
	s := State{Files: map[string]string{}}
	b, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	if err := json.Unmarshal(b, &s); err != nil {
		return State{Files: map[string]string{}}, fmt.Errorf("file trạng thái đồng bộ hỏng (%s): %w", filepath.Base(path), err)
	}
	if s.Files == nil {
		s.Files = map[string]string{}
	}
	return s, nil
}

// Save ghi state (ghi tạm rồi đổi tên).
func (s State) Save(path string) error {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
