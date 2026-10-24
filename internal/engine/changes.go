package engine

import (
	"encoding/json"

	"ghosthand/internal/element"
)

// Thay đổi giao diện sau mỗi node (bước 43 A3) – chỉ khi AI xin chụp sau mỗi node (ShotEach): đọc cây phần tử của app
// trên cùng, so với lần đọc sau node trước. Lần đầu chỉ lấy mốc. Đọc cây lỗi (thiếu quyền, không cửa sổ) thì bỏ qua.

// treeChanges trả phần đổi so với lần đọc trước (nil = không có mốc / không đổi / không đọc được) và đặt mốc mới.
func (e *Engine) treeChanges() map[string]any {
	if !e.eachShot {
		return nil
	}
	nodes, err := e.elems.Elements("")
	if err != nil {
		return nil
	}
	prev := e.prevTree
	e.prevTree = nodes
	if prev == nil {
		return nil
	}
	c := element.Diff(prev, nodes)
	if c.Empty() {
		return nil
	}
	var out map[string]any
	b, _ := json.Marshal(c)
	_ = json.Unmarshal(b, &out)
	return out
}
