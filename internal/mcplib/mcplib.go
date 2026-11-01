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
	Group       string            `json:"group"` // nhóm hiển thị, theo thứ tự xuất hiện trong library
	Kind        string            `json:"kind"`  // stdio | http
	Command     string            `json:"command,omitempty"`
	Args        []string          `json:"args,omitempty"`
	URL         string            `json:"url,omitempty"`
	Env         map[string]string `json:"env,omitempty"`     // giá trị chỉ {{secret.<tên>}}
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
