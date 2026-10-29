// Package mcplib – thư viện MCP server gợi ý (bước 55 M6): danh sách chọn tay, bấm Thêm điền sẵn cấu hình ở Cài đặt.
// Thêm xong vẫn qua hộp hỏi quyền như mọi server (mcpgate.go) – thư viện không tự chạy gì.
package mcplib

import (
	"os/exec"
	"strings"
)

// Param – chỗ người dùng phải điền; ${Key} trong Args / URL được thay bằng giá trị.
type Param struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Placeholder string `json:"placeholder,omitempty"`
}

// Entry – một server gợi ý.
type Entry struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Desc        string            `json:"desc"`
	Kind        string            `json:"kind"` // stdio | http
	Command     string            `json:"command,omitempty"`
	Args        []string          `json:"args,omitempty"`
	URL         string            `json:"url,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"` // giá trị chỉ {{secret.<tên>}}
	Params      []Param           `json:"params,omitempty"`
	Secrets     []string          `json:"secrets,omitempty"` // tên bí mật cần tạo ở Cài đặt → Bí mật
	Needs       string            `json:"needs,omitempty"`   // chương trình cần có trên máy: npx | uvx
	Warn        string            `json:"warn,omitempty"`    // quyền cần cảnh báo
	ThirdParty  bool              `json:"thirdParty,omitempty"`
	Available   bool              `json:"available"`             // máy có Needs
	InstallHint string            `json:"installHint,omitempty"` // thiếu Needs thì cài thế nào
}

var hints = map[string]string{
	"npx": "Cần Node.js (https://nodejs.org) – cài xong mở lại Ghosthand.",
	"uvx": "Cần uv (https://docs.astral.sh/uv) – cài xong mở lại Ghosthand.",
}

var library = []Entry{
	{ID: "filesystem", Name: "Filesystem", Desc: "Đọc / ghi / tìm file trong thư mục bạn cho phép (server mẫu chính thức).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@modelcontextprotocol/server-filesystem", "${dir}"}, Needs: "npx",
		Params: []Param{{Key: "dir", Label: "Thư mục được phép", Placeholder: "/Users/ban/Documents"}},
		Warn:   "Tool ghi / xoá file chỉ trong thư mục đã chọn; app hỏi trước mỗi lần."},
	{ID: "fetch", Name: "Fetch", Desc: "Tải trang web về dạng chữ / Markdown (server mẫu chính thức).", Kind: "stdio",
		Command: "uvx", Args: []string{"mcp-server-fetch"}, Needs: "uvx", Warn: "Truy cập internet từ máy bạn."},
	{ID: "memory", Name: "Memory", Desc: "Bộ nhớ dạng đồ thị tri thức, giữ giữa các lần chạy (server mẫu chính thức).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@modelcontextprotocol/server-memory"}, Needs: "npx"},
	{ID: "time", Name: "Time", Desc: "Giờ hiện tại và đổi múi giờ (server mẫu chính thức).", Kind: "stdio",
		Command: "uvx", Args: []string{"mcp-server-time"}, Needs: "uvx"},
	{ID: "markitdown", Name: "MarkItDown", Desc: "PDF / docx / pptx / xlsx → Markdown (Microsoft).", Kind: "stdio",
		Command: "uvx", Args: []string{"markitdown-mcp"}, Needs: "uvx", Warn: "Đọc file bạn chỉ đường dẫn."},
	{ID: "github", Name: "GitHub", Desc: "Repo, issue, pull request qua server GitHub chính thức (từ xa).", Kind: "http",
		URL: "https://api.githubcopilot.com/mcp/", Headers: map[string]string{"Authorization": "Bearer {{secret.github_token}}"},
		Secrets: []string{"github_token"}, Warn: "Dùng token GitHub của bạn; tool ghi (tạo issue, PR…) app hỏi trước."},
}

// Entries – thư viện, kèm máy này có chương trình cần dùng chưa (look = exec.LookPath; test thay bản giả).
func Entries(look func(string) (string, error)) []Entry {
	if look == nil {
		look = exec.LookPath
	}
	out := make([]Entry, len(library))
	for i, e := range library {
		out[i] = e
		out[i].Available = true
		if e.Needs != "" {
			if _, err := look(e.Needs); err != nil {
				out[i].Available, out[i].InstallHint = false, hints[e.Needs]
			}
		}
	}
	return out
}

// Fill thay ${key} trong s bằng values.
func Fill(s string, values map[string]string) string {
	for k, v := range values {
		s = strings.ReplaceAll(s, "${"+k+"}", v)
	}
	return s
}
