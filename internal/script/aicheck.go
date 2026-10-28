package script

import (
	"regexp"
	"strings"

	"ghosthand/internal/model"
)

// Node Hỏi AI (bước 31d): dữ liệu đủ để chạy. Key chỉ được là {{secret.<tên>}} – dán key thẳng vào kịch bản sẽ nằm
// trong file, lịch sử và có thể bị chia sẻ.
var aiKeyRe = regexp.MustCompile(`^\{\{\s*secret\.[A-Za-z][A-Za-z0-9_]*\s*\}\}$`)

func validateAskAI(i int, s model.Step) error {
	if strings.TrimSpace(s.Prompt) == "" {
		return stepErr(i, s, "prompt", "chưa nhập câu hỏi cho AI")
	}
	if k := strings.TrimSpace(s.AIKey); k != "" && !aiKeyRe.MatchString(k) {
		return stepErr(i, s, "aiKey", "key AI chỉ được ghi dạng {{secret.<tên>}} (lưu key ở Cài đặt → Bí mật), không dán key thẳng vào kịch bản")
	}
	if s.AIImage == model.AIImageFile && strings.TrimSpace(s.FilePath) == "" {
		return stepErr(i, s, "filePath", "chưa chọn file ảnh gửi cho AI")
	}
	return nil
}
