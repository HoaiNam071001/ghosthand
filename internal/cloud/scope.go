package cloud

import "strings"

// Scope – phần dữ liệu được đồng bộ (4 công tắc ở Cài đặt → Đồng bộ). Bí mật mặc định tắt (decisions 54).
type Scope struct {
	Scripts  bool `json:"scripts"`  // kịch bản + tệp đi kèm
	Settings bool `json:"settings"` // cài đặt mang đi được
	Secrets  bool `json:"secrets"`  // kho bí mật (bản mã)
}

// Includes – đường dẫn trên cloud có thuộc phạm vi không. manifest.json không thuộc phạm vi nào (engine tự quản).
func (s Scope) Includes(path string) bool {
	switch {
	case strings.HasPrefix(path, ScriptsDir), strings.HasPrefix(path, AssetsDir):
		return s.Scripts
	case path == SettingsPath:
		return s.Settings
	case path == SecretsPath:
		return s.Secrets
	}
	return false
}

// Tệp đi kèm đặt tên theo nội dung (assets/<hash>/<tên>) nên máy nào cũng dùng chung, không bao giờ xung đột;
// một kịch bản thôi dùng không có nghĩa máy khác cũng thôi → không xoá tệp đi kèm khi đồng bộ (dọn là việc riêng).
func keepOnDelete(path string) bool { return strings.HasPrefix(path, AssetsDir) }
