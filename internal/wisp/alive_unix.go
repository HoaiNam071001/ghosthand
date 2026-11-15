//go:build !windows

package wisp

import (
	"os"
	"syscall"
)

// Alive – tiến trình pid còn chạy (signal 0 chỉ kiểm, không gửi gì; EPERM = có nhưng của người dùng khác).
func Alive(pid int) bool {
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = p.Signal(syscall.Signal(0))
	return err == nil || err == syscall.EPERM
}
