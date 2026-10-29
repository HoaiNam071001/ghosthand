package main

import "ghosthand/internal/store"

// Node của tôi (bước 55 M5, mẫu của node Gọi tool MCP) – lưu ở customnodes.json cạnh settings.

// ListCustomNodes – mọi mẫu đã lưu.
func (a *App) ListCustomNodes() ([]store.CustomNode, error) { return store.ListCustomNodes() }

// SaveCustomNode thêm hoặc thay mẫu (ID trống = thêm).
func (a *App) SaveCustomNode(n store.CustomNode) (store.CustomNode, error) {
	return store.SaveCustomNode(n)
}

// DeleteCustomNode xoá mẫu.
func (a *App) DeleteCustomNode(id string) error { return store.DeleteCustomNode(id) }
