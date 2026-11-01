//go:build !darwin

// Package winfloat: chế độ nổi trên app toàn màn hình – chỉ cần trên macOS (Space riêng); Windows always-on-top đã đủ.
package winfloat

func PrepareLaunch() {}

func FollowActiveSpace() {}

func Set(on, focus bool) {}

// Minibar – Windows: chưa nổi lúc chạy (WindowSetAlwaysOnTop của Wails có thể giành focus – 58 D6, thử trên máy Windows).
func Minibar(float bool) {}

// CoverScreen – Windows: Wails đặt cửa sổ từ góc vùng làm việc, cỡ = cả màn → đã phủ màn (taskbar dưới);
// lệch khi taskbar trên / trái thì overlay tự sửa gốc toạ độ (coordMap.ts).
func CoverScreen() {}
