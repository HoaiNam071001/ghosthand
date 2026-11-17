//go:build !windows

package taskbadge

// macOS / Linux: chưa có dấu trên icon (Dock badge để sau) – thanh mini + viền đã báo trạng thái.
func platformApply(Kind) {}
