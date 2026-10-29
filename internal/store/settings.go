// Package store – dữ liệu app lưu trên máy (không thuộc file kịch bản): cấu hình, file mở gần đây, giá trị input lần
// trước, lịch sử chạy. Mọi thứ trong ConfigDir().
package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
)

// Cấu hình app (không thuộc kịch bản), lưu ở os.UserConfigDir()/ghosthand/settings.json.
// Bản nháp tự lưu (draft.json, storage.go ở root) nằm cùng thư mục.

const (
	ThemeLight  = "light"
	ThemeDark   = "dark"
	ThemeSystem = "system"
)

type Settings struct {
	Theme   string          `json:"theme"`            // light | dark | system
	Recent  []string        `json:"recent,omitempty"` // file kịch bản mở / lưu gần đây, mới nhất trước (storage.go)
	API     APISettings     `json:"api"`
	MCP     MCPSettings     `json:"mcp"`
	Storage StorageSettings `json:"storage"`
	Overlay OverlaySettings `json:"overlay"`
	// MCPServers – MCP server ngoài app nối tới (bước 55, mcpservers.go)
	MCPServers []MCPServer `json:"mcpServers,omitempty"`
}

// MCPSettings – cho AI kết nối qua MCP (bước 31): bật mặc định; route /mcp chạy trên cùng cổng API local.
// Công tắc AI 4 mức (31b): Enabled = false → Tắt; còn lại theo Run: edit (chỉ soạn) | ask (chạy, hỏi trước – mặc định) | auto (tự chạy).
type MCPSettings struct {
	Enabled        bool                `json:"enabled"`
	Run            string              `json:"run,omitempty"`            // "" = ask
	MaxMinutes     int                 `json:"maxMinutes,omitempty"`     // trần thời gian mỗi lượt AI chạy; 0 = AIMaxMinutes
	OffTools       []string            `json:"offTools,omitempty"`       // tool tắt mặc định cho mọi AI (31b2)
	Clients        map[string][]string `json:"clients,omitempty"`        // tên loại AI → danh sách tool tắt riêng (thay hẳn mặc định)
	HideCaptureDot bool                `json:"hideCaptureDot,omitempty"` // true = không hiện chấm đỏ trên thanh mini khi AI chụp / đọc màn hình (31c)
	NodePref       string              `json:"nodePref,omitempty"`       // ưu tiên node cho AI (44): "" / vision | web
}

// Ưu tiên node cho AI (MCPSettings.NodePref, bước 44): vision = node ảnh / chữ (mặc định); web = thử trang trên Chrome
// của app trước, không captcha thì dùng node web.
const (
	NodePrefVision = "vision"
	NodePrefWeb    = "web"
)

// NodePreference – ưu tiên đã chuẩn hoá ("" / lạ → vision).
func (m MCPSettings) NodePreference() string {
	if m.NodePref == NodePrefWeb {
		return NodePrefWeb
	}
	return NodePrefVision
}

// SetNodePref đổi riêng ưu tiên node (AI gọi qua MCP – không đè phần cài đặt MCP khác).
func SetNodePref(p string) error {
	if p != NodePrefVision && p != NodePrefWeb {
		return fmt.Errorf("ưu tiên node không hợp lệ: %q (vision | web)", p)
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s := loadSettings(dir)
	s.MCP.NodePref = p
	return saveSettings(dir, s)
}

// Mức chạy của AI (MCPSettings.Run).
const (
	AIRunEdit = "edit"
	AIRunAsk  = "ask"
	AIRunAuto = "auto"
)

// AIMaxMinutes – trần mặc định mỗi lượt AI chạy.
const AIMaxMinutes = 10

// RunMode – mức chạy đã chuẩn hoá ("" / lạ → ask).
func (m MCPSettings) RunMode() string {
	if m.Run == AIRunEdit || m.Run == AIRunAuto {
		return m.Run
	}
	return AIRunAsk
}

// Limit – trần phút mỗi lượt AI chạy.
func (m MCPSettings) Limit() int {
	if m.MaxMinutes > 0 {
		return m.MaxMinutes
	}
	return AIMaxMinutes
}

// SetMCP lưu cài đặt MCP.
func SetMCP(m MCPSettings) error {
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	s := loadSettings(dir)
	s.MCP = m
	return saveSettings(dir, s)
}

// APISettings – API local cho chương trình khác (bước 22): tắt mặc định; kênh cho CLI luôn bật (api.json).
type APISettings struct {
	Enabled bool   `json:"enabled"`
	Port    int    `json:"port"`
	Token   string `json:"token,omitempty"`
}

// DefaultAPIPort – cổng mặc định của API cho chương trình khác.
const DefaultAPIPort = 47800

// SetAPI lưu cài đặt API; token trống thì tạo mới. Trả cài đặt đã lưu.
func SetAPI(a APISettings) (APISettings, error) {
	if a.Port <= 0 || a.Port > 65535 {
		a.Port = DefaultAPIPort
	}
	if a.Token == "" {
		a.Token = NewToken()
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return a, err
	}
	s := loadSettings(dir)
	s.API = a
	return a, saveSettings(dir, s)
}

func defaultSettings() Settings {
	return Settings{Theme: ThemeSystem, API: APISettings{Port: DefaultAPIPort}, MCP: MCPSettings{Enabled: true}}
}

const settingsFile = "settings.json"

// ConfigDir: thư mục cấu hình của app, tạo nếu chưa có.
// BrowserProfile – profile riêng của Chrome của app (node web, bước 25d): người dùng đăng nhập trang một lần, profile nhớ.
func BrowserProfile() (string, error) {
	base, err := ConfigDir()
	return filepath.Join(base, "browser-profile"), err
}

func ConfigDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "ghosthand")
	return dir, os.MkdirAll(dir, 0o755)
}

// loadSettings đọc cấu hình trong dir; chưa có file hoặc giá trị lạ → mặc định (không báo lỗi để app vẫn mở được).
func loadSettings(dir string) Settings {
	s := defaultSettings()
	b, err := os.ReadFile(filepath.Join(dir, settingsFile))
	if err != nil {
		return s
	}
	if json.Unmarshal(b, &s) != nil || !validTheme(s.Theme) {
		s.Theme = ThemeSystem
	}
	return s
}

func saveSettings(dir string, s Settings) error {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return WriteFileAtomic(filepath.Join(dir, settingsFile), b)
}

// WriteFileAtomic ghi file tạm cạnh file đích rồi đổi tên – tắt app giữa chừng không làm hỏng file cũ.
func WriteFileAtomic(path string, b []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func validTheme(t string) bool { return t == ThemeLight || t == ThemeDark || t == ThemeSystem }

// CurrentSettings trả cấu hình đã lưu (mặc định nếu chưa có / không đọc được thư mục cấu hình).
func CurrentSettings() Settings {
	dir, err := ConfigDir()
	if err != nil {
		return defaultSettings()
	}
	return loadSettings(dir)
}

// SetTheme lưu theme: light | dark | system.
func SetTheme(theme string) error {
	if !validTheme(theme) {
		return fmt.Errorf("theme không hợp lệ: %q", theme)
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return fmt.Errorf("không mở được thư mục cấu hình: %w", err)
	}
	s := loadSettings(dir)
	s.Theme = theme
	if err := saveSettings(dir, s); err != nil {
		return fmt.Errorf("không lưu được cấu hình: %w", err)
	}
	return nil
}

// OffToolsFor – tool tắt cho loại AI client: ghi đè riêng nếu có, không thì mặc định chung.
func (m MCPSettings) OffToolsFor(client string) []string {
	if off, ok := m.Clients[client]; ok && client != "" {
		return off
	}
	return m.OffTools
}

// ToolAllowed – loại AI client được gọi tool này không.
func (m MCPSettings) ToolAllowed(client, tool string) bool {
	return !slices.Contains(m.OffToolsFor(client), tool)
}
