package wisp

import "os"

// Alive – tiến trình pid còn chạy (Windows: FindProcess mở handle, lỗi khi không còn tiến trình).
func Alive(pid int) bool {
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	_ = p.Release()
	return true
}
