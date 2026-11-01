//go:build windows

package web

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
)

// detach – nhóm tiến trình riêng, không gắn console của app.
func detach(cmd *exec.Cmd) {
	const createNewProcessGroup, detachedProcess = 0x00000200, 0x00000008
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: createNewProcessGroup | detachedProcess}
}

// closeGently xin trình duyệt tự tắt: taskkill không /F gửi WM_CLOSE tới cửa sổ (Chrome lưu phiên, cookie rồi thoát).
func closeGently(pid int) error {
	k := exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/T")
	k.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	return k.Run()
}

// profileFree – Chrome đang dùng profile thì giữ khoá file lockfile (xoá được = đã tắt).
func profileFree(profile string) bool {
	err := os.Remove(filepath.Join(profile, "lockfile"))
	return err == nil || os.IsNotExist(err)
}
