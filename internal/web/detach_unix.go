//go:build !windows

package web

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

// detach – phiên riêng: tín hiệu tắt app (Ctrl+C khi wails dev) không lan sang trình duyệt.
func detach(cmd *exec.Cmd) { cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true} }

// closeGently xin trình duyệt tự tắt (SIGTERM – Chrome lưu phiên, cookie rồi thoát).
func closeGently(pid int) error { return syscall.Kill(pid, syscall.SIGTERM) }

// profileFree – Chrome đang dùng profile giữ symlink SingletonLock → "<máy>-<pid>"; tắt bằng SIGTERM có khi để sót
// symlink, nên như Chrome: pid trong khoá không còn sống là profile đã nhả.
func profileFree(profile string) bool {
	link, err := os.Readlink(filepath.Join(profile, "SingletonLock"))
	if err != nil {
		return true
	}
	pid, err := strconv.Atoi(link[strings.LastIndex(link, "-")+1:])
	return err != nil || syscall.Kill(pid, 0) != nil
}
