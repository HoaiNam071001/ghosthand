package script

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// UserPath – đường dẫn người dùng gõ: tuyệt đối giữ nguyên, ~ / đường dẫn tương đối tính từ thư mục người dùng (app
// không có thư mục làm việc rõ ràng – chạy từ Finder / Start). Engine (node đọc / ghi file) và gói kịch bản dùng chung.
func UserPath(p string) (string, error) {
	p = strings.TrimSpace(p)
	if filepath.IsAbs(p) {
		return p, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("không tìm thấy thư mục người dùng: %w", err)
	}
	if p == "~" || strings.HasPrefix(p, "~/") || strings.HasPrefix(p, `~\`) {
		p = p[1:]
	}
	return filepath.Join(home, p), nil
}
