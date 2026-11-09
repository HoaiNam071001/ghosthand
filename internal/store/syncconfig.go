package store

import (
	"fmt"
	"os"
	"strings"
)

// SyncSettings – cấu hình đồng bộ cloud của RIÊNG máy này (bước 54 C8): bật phần nào, khi nào tự đồng bộ.
// Mỗi máy tự chọn nên không mang đi (syncsettings.go).
type SyncSettings struct {
	Scripts     bool   `json:"scripts,omitempty"`     // kịch bản + tệp đi kèm
	Settings    bool   `json:"settings,omitempty"`    // cài đặt mang đi được
	Secrets     bool   `json:"secrets,omitempty"`     // kho bí mật (bản mã) – tắt mặc định
	OnOpen      bool   `json:"onOpen,omitempty"`      // đồng bộ khi mở app
	OnSave      bool   `json:"onSave,omitempty"`      // đồng bộ sau khi lưu kịch bản
	IntervalMin int    `json:"intervalMin,omitempty"` // đồng bộ mỗi N phút; 0 = tắt
	Device      string `json:"device,omitempty"`      // tên máy hiện cho máy khác thấy ("" = tên máy tính)
}

const (
	SyncMinInterval = 5
	SyncMaxInterval = 24 * 60
)

// DeviceName – tên máy dùng trong hộp xung đột và tên file "giữ cả hai".
func (s SyncSettings) DeviceName() string {
	if d := strings.TrimSpace(s.Device); d != "" {
		return d
	}
	if h, err := os.Hostname(); err == nil && h != "" {
		return h
	}
	return "máy này"
}

// Any – có phần nào được bật không.
func (s SyncSettings) Any() bool { return s.Scripts || s.Settings || s.Secrets }

// Check – giá trị hợp lệ. Tên máy không được có ký tự làm hỏng tên file ("tên (máy).json").
func (s SyncSettings) Check() error {
	if s.IntervalMin != 0 && (s.IntervalMin < SyncMinInterval || s.IntervalMin > SyncMaxInterval) {
		return fmt.Errorf("chu kỳ đồng bộ phải từ %d đến %d phút (hoặc 0 = tắt)", SyncMinInterval, SyncMaxInterval)
	}
	if len([]rune(s.Device)) > 40 || strings.ContainsAny(s.Device, `/\:*?"<>|()`+"\n\r") {
		return fmt.Errorf("tên máy tối đa 40 ký tự, không có các ký tự / \\ : * ? \" < > | ( )")
	}
	return nil
}

// SetSync lưu cấu hình đồng bộ.
func SetSync(c SyncSettings) error {
	if err := c.Check(); err != nil {
		return err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s := loadSettings(dir)
	s.Sync = c
	return saveSettings(dir, s)
}

// ImportPortable ghi phần cài đặt mang đi từ cloud vào cài đặt của máy (phần riêng máy giữ nguyên).
func ImportPortable(data []byte) error {
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s, err := loadSettings(dir).ApplyPortable(data)
	if err != nil {
		return err
	}
	return saveSettings(dir, s)
}
