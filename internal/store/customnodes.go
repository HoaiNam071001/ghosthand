package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Node của tôi (bước 55 M5): mẫu lưu sẵn của node Gọi tool MCP – tên, icon, server + tool + đối số đã điền. Kịch bản
// chỉ lưu node mcpTool thường (+ tên), không tham chiếu mẫu này, nên mở được ở máy chưa có mẫu / server.
// Đối số chỉ chứa giá trị cố định; ô để trống là chỗ người dùng điền sau khi thả node vào canvas.

const customNodesFile = "customnodes.json"

type CustomNode struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Icon   string `json:"icon,omitempty"` // tên icon trong bộ có sẵn của app (frontend kiểm)
	Server string `json:"server"`
	Tool   string `json:"tool"`
	Args   string `json:"args,omitempty"` // JSON object; giá trị nhận {{biến}}, không ghi token (dùng {{secret.*}})
}

// Check – dữ liệu người dùng nhập. Token dán thẳng vào đối số bị từ chối ở bước chạy (secrets) nên không soi ở đây.
func (n CustomNode) Check() error {
	switch {
	case strings.TrimSpace(n.Name) == "":
		return fmt.Errorf("node của tôi cần có tên")
	case strings.TrimSpace(n.Server) == "" || strings.TrimSpace(n.Tool) == "":
		return fmt.Errorf("node của tôi cần server và tool MCP")
	}
	if a := strings.TrimSpace(n.Args); a != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(a), &m); err != nil {
			return fmt.Errorf("đối số phải là JSON object")
		}
	}
	return nil
}

func loadCustomNodes(dir string) []CustomNode {
	var list []CustomNode
	if b, err := os.ReadFile(filepath.Join(dir, customNodesFile)); err == nil {
		_ = json.Unmarshal(b, &list) // hỏng = danh sách trống; không chặn app
	}
	return list
}

// ListCustomNodes – mọi node của tôi, theo thứ tự lưu.
func ListCustomNodes() ([]CustomNode, error) {
	dir, err := ConfigDir()
	if err != nil {
		return nil, err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	return loadCustomNodes(dir), nil
}

func writeCustomNodes(dir string, list []CustomNode) error {
	b, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return WriteFileAtomic(filepath.Join(dir, customNodesFile), b)
}

// SaveCustomNode thêm (ID trống → tạo mới) hoặc thay node cùng ID. Trả node đã lưu.
func SaveCustomNode(n CustomNode) (CustomNode, error) {
	if err := n.Check(); err != nil {
		return n, err
	}
	dir, err := ConfigDir()
	if err != nil {
		return n, err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	list := loadCustomNodes(dir)
	list, n = upsertCustomNode(list, n)
	return n, writeCustomNodes(dir, list)
}

func upsertCustomNode(list []CustomNode, n CustomNode) ([]CustomNode, CustomNode) {
	if n.ID == "" {
		for i := len(list) + 1; ; i++ {
			id := fmt.Sprintf("c%d", i)
			if !hasCustomNode(list, id) {
				n.ID = id
				break
			}
		}
	}
	for i := range list {
		if list[i].ID == n.ID {
			list[i] = n
			return list, n
		}
	}
	return append(list, n), n
}

func hasCustomNode(list []CustomNode, id string) bool {
	for _, n := range list {
		if n.ID == id {
			return true
		}
	}
	return false
}

// DeleteCustomNode xoá mẫu (không có id này thì thôi).
func DeleteCustomNode(id string) error {
	dir, err := ConfigDir()
	if err != nil {
		return err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	list := loadCustomNodes(dir)
	out := list[:0]
	for _, n := range list {
		if n.ID != id {
			out = append(out, n)
		}
	}
	return writeCustomNodes(dir, out)
}
