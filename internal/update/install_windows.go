package update

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// Installed – chạy từ bản cài (bộ cài NSIS đặt uninstall.exe cạnh exe) hay bản không cài đặt.
func Installed() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	_, err = os.Stat(filepath.Join(filepath.Dir(exe), "uninstall.exe"))
	return err == nil
}

// Install (Windows): bản cài → chạy setup.exe im lặng sau khi app thoát; bản không cài đặt → giải exe mới từ zip, thay
// exe cũ sau khi app thoát. Cả hai qua script PowerShell nền rồi mở lại app; app tự thoát do người gọi.
func Install(file string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	script := ""
	if Installed() {
		script = WinInstallScript(os.Getpid(), file, exe)
	} else {
		newExe := exe + ".new"
		if err := ExtractExe(file, "ghosthand.exe", newExe); err != nil {
			return fmt.Errorf("không giải được bản mới: %w", err)
		}
		script = WinPortableScript(os.Getpid(), newExe, exe)
	}
	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x00000008 | 0x00000200} // DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
	return cmd.Start()
}
