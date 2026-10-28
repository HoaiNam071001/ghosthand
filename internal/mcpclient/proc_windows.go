//go:build windows

package mcpclient

import (
	"os/exec"
	"syscall"
)

// Không bật cửa sổ console cho server stdio.
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
}
