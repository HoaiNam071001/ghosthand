package store

import (
	"fmt"
	"slices"
	"strings"

	"ghosthand/internal/ai"
	"ghosthand/internal/secrets"
)

// Nhà cung cấp AI mặc định cho node Hỏi AI (bước 31d, Cài đặt → Hỏi AI): node để trống loại / địa chỉ / model / key thì
// lấy ở đây. Key chỉ là một {{secret.<tên>}} – không ghi key thẳng vào settings.json.
type AISettings struct {
	Kind    string `json:"kind,omitempty"` // ai.Kinds; "" = openai
	BaseURL string `json:"baseUrl,omitempty"`
	Model   string `json:"model,omitempty"`
	Key     string `json:"key,omitempty"` // "" hoặc đúng một {{secret.<tên>}}
}

// Check kiểm tra dữ liệu người dùng nhập.
func (a AISettings) Check() error {
	if !slices.Contains(ai.Kinds, a.Kind) {
		return fmt.Errorf("nhà cung cấp AI không hợp lệ: %q", a.Kind)
	}
	if k := strings.TrimSpace(a.Key); k != "" {
		if refs := secrets.Refs(k); len(refs) != 1 || k != "{{secret."+refs[0]+"}}" {
			return fmt.Errorf("key AI chỉ được ghi dạng {{secret.<tên>}} (lưu key ở Cài đặt → Bí mật)")
		}
	}
	if u := strings.TrimSpace(a.BaseURL); u != "" && !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
		return fmt.Errorf("địa chỉ AI cần bắt đầu bằng http:// hoặc https://")
	}
	return nil
}

// Config – dạng cho engine (key còn là {{secret.*}}, engine thay giá trị thật).
func (a AISettings) Config() ai.Config {
	return ai.Config{Kind: a.Kind, BaseURL: a.BaseURL, Model: a.Model, Key: strings.TrimSpace(a.Key)}
}

// SetAI lưu nhà cung cấp AI mặc định.
func SetAI(a AISettings) (AISettings, error) {
	if err := a.Check(); err != nil {
		return a, err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return a, err
	}
	s := loadSettings(dir)
	s.AI = a
	return a, saveSettings(dir, s)
}
