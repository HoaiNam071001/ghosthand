package store

import (
	"fmt"
	"net/url"
	"strings"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/secrets"
)

// MCPServer – một MCP server ngoài mà app nối tới (bước 55). Env / Header chỉ nhận {{secret.<tên>}}: token không nằm
// trong settings.json (giá trị thật ở kho bí mật).
type MCPServer struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Kind    string            `json:"kind"` // stdio | http | sse
	Command string            `json:"command,omitempty"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
	URL     string            `json:"url,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Enabled bool              `json:"enabled"`
}

// Check kiểm tra dữ liệu người dùng nhập (không chạy gì).
func (s MCPServer) Check() error {
	if strings.TrimSpace(s.Name) == "" {
		return fmt.Errorf("server MCP cần có tên")
	}
	if err := s.Config().Validate(); err != nil {
		return err
	}
	if s.Kind != mcpclient.KindStdio {
		if u, err := url.Parse(s.URL); err != nil || u.Host == "" {
			return fmt.Errorf("địa chỉ server không hợp lệ: %q", s.URL)
		}
	}
	for _, m := range []map[string]string{s.Env, s.Headers} {
		for k, v := range m {
			if strings.TrimSpace(k) == "" {
				return fmt.Errorf("tên biến môi trường / header không được để trống")
			}
			if len(secrets.Refs(v)) == 0 {
				return fmt.Errorf("giá trị của %q phải dùng {{secret.<tên>}} (lưu ở Cài đặt → Bí mật) – không ghi token thẳng vào cấu hình", k)
			}
		}
	}
	return nil
}

// Config – cấu hình nối, còn nguyên {{secret.*}} (ExpandSecrets thay giá trị thật).
func (s MCPServer) Config() mcpclient.Config {
	return mcpclient.Config{ID: s.ID, Kind: s.Kind, Command: s.Command, Args: s.Args, Env: s.Env, URL: s.URL, Headers: s.Headers}
}

// SecretNames – các bí mật server này dùng.
func (s MCPServer) SecretNames() []string {
	var vs []string
	for _, m := range []map[string]string{s.Env, s.Headers} {
		for _, v := range m {
			vs = append(vs, v)
		}
	}
	return secrets.Refs(append(vs, s.Command, s.URL)...)
}

// SaveMCPServer thêm (ID trống → tạo mới) hoặc thay server cùng ID. Trả server đã lưu.
func SaveMCPServer(s MCPServer) (MCPServer, error) {
	if err := s.Check(); err != nil {
		return s, err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return s, err
	}
	cur := loadSettings(dir)
	cur.MCPServers, s = upsertMCPServer(cur.MCPServers, s)
	return s, saveSettings(dir, cur)
}

func upsertMCPServer(list []MCPServer, s MCPServer) ([]MCPServer, MCPServer) {
	if s.ID == "" {
		s.ID = newMCPServerID(list)
	}
	for i := range list {
		if list[i].ID == s.ID {
			list[i] = s
			return list, s
		}
	}
	return append(list, s), s
}

func newMCPServerID(list []MCPServer) string {
	for n := len(list) + 1; ; n++ {
		id := fmt.Sprintf("s%d", n)
		if _, ok := findMCPServer(list, id); !ok {
			return id
		}
	}
}

func findMCPServer(list []MCPServer, id string) (MCPServer, bool) {
	for _, s := range list {
		if s.ID == id {
			return s, true
		}
	}
	return MCPServer{}, false
}

// MCPServerByID – server đã cấu hình theo id.
func MCPServerByID(id string) (MCPServer, bool) {
	return findMCPServer(CurrentSettings().MCPServers, id)
}

// DeleteMCPServer xoá server khỏi cấu hình (không có id này thì thôi).
func DeleteMCPServer(id string) error {
	settingsMu.Lock()
	defer settingsMu.Unlock()
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	cur := loadSettings(dir)
	out := cur.MCPServers[:0]
	for _, s := range cur.MCPServers {
		if s.ID != id {
			out = append(out, s)
		}
	}
	cur.MCPServers = out
	return saveSettings(dir, cur)
}
