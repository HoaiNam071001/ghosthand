package store

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"sort"
)

// Đồng ý dùng MCP server ngoài (bước 55 M2): theo id server, gắn với dấu vân tay cấu hình (lệnh / URL / tham số / tên
// env + header) – đổi lệnh hay địa chỉ thì dấu vân tay đổi, phải hỏi lại. Tool ghi / xoá / mở ra ngoài có thêm danh
// sách "luôn cho tool này". Đổi giá trị bí mật không đổi dấu vân tay (giá trị không nằm trong cấu hình).

const mcpConsentFile = "mcp-consent.json"

type mcpConsent struct {
	Hash  string   `json:"hash"`
	Tools []string `json:"tools,omitempty"` // tool đã chọn "luôn cho phép"
}

// Fingerprint – dấu vân tay những gì server sẽ chạy / nối tới.
func (s MCPServer) Fingerprint() string {
	h := sha256.New()
	enc := json.NewEncoder(h)
	keys := func(m map[string]string) [][2]string {
		var out [][2]string
		for k, v := range m {
			out = append(out, [2]string{k, v})
		}
		sort.Slice(out, func(i, j int) bool { return out[i][0] < out[j][0] })
		return out
	}
	enc.Encode([]any{s.Kind, s.Command, s.Args, s.URL, keys(s.Env), keys(s.Headers)})
	return hex.EncodeToString(h.Sum(nil))[:16]
}

func loadMCPConsent(dir string) map[string]mcpConsent {
	all := map[string]mcpConsent{}
	if b, err := os.ReadFile(filepath.Join(dir, mcpConsentFile)); err == nil {
		_ = json.Unmarshal(b, &all) // hỏng = chưa đồng ý gì, hỏi lại cho an toàn
	}
	return all
}

func updateMCPConsent(fn func(all map[string]mcpConsent)) error {
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	all := loadMCPConsent(dir)
	fn(all)
	b, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return err
	}
	return WriteFileAtomic(filepath.Join(dir, mcpConsentFile), b)
}

// MCPServerTrusted – người dùng đã đồng ý cho server chạy với đúng cấu hình này chưa.
func MCPServerTrusted(s MCPServer) bool {
	dir, err := ConfigDir()
	if err != nil {
		return false
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	return loadMCPConsent(dir)[s.ID].Hash == s.Fingerprint()
}

// TrustMCPServer ghi nhớ đồng ý cho cấu hình hiện tại (xoá danh sách tool cũ nếu cấu hình đã đổi).
func TrustMCPServer(s MCPServer) error {
	return updateMCPConsent(func(all map[string]mcpConsent) {
		c := all[s.ID]
		if c.Hash != s.Fingerprint() {
			c = mcpConsent{Hash: s.Fingerprint()}
		}
		all[s.ID] = c
	})
}

// MCPToolAlways – tool đã được chọn "luôn cho phép" (chỉ có hiệu lực khi server còn được tin).
func MCPToolAlways(s MCPServer, tool string) bool {
	dir, err := ConfigDir()
	if err != nil {
		return false
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	c := loadMCPConsent(dir)[s.ID]
	return c.Hash == s.Fingerprint() && slices.Contains(c.Tools, tool)
}

// AlwaysAllowMCPTool ghi nhớ "luôn cho tool này"; server phải đã được tin (cùng dấu vân tay).
func AlwaysAllowMCPTool(s MCPServer, tool string) error {
	return updateMCPConsent(func(all map[string]mcpConsent) {
		c := all[s.ID]
		if c.Hash != s.Fingerprint() {
			c = mcpConsent{Hash: s.Fingerprint()}
		}
		if !slices.Contains(c.Tools, tool) {
			c.Tools = append(c.Tools, tool)
		}
		all[s.ID] = c
	})
}

// ForgetMCPConsent xoá đồng ý của server (xoá server).
func ForgetMCPConsent(id string) error {
	return updateMCPConsent(func(all map[string]mcpConsent) { delete(all, id) })
}
