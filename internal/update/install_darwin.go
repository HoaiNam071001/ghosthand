package update

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// Installed – chỉ có ý nghĩa trên Windows (bản cài hay bản không cài đặt).
func Installed() bool { return false }

// Install (macOS): mở .dmg, chép Ghosthand.app ra cạnh app đang chạy (ditto giữ nguyên chữ ký), rồi chạy script nền chờ
// app thoát để thay + mở lại. Lỗi ở bước chép trả về ngay (app vẫn chạy bản cũ); app tự thoát do người gọi.
func Install(dmg string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	app := AppBundle(exe)
	if app == "" {
		return fmt.Errorf("app không chạy từ gói .app (chế độ dev) – không tự cập nhật được")
	}
	staged := filepath.Join(filepath.Dir(app), ".Ghosthand-update.app")
	if err := os.RemoveAll(staged); err != nil {
		return fmt.Errorf("không ghi được vào %s (cần quyền ghi thư mục chứa app): %w", filepath.Dir(app), err)
	}
	mnt, err := os.MkdirTemp("", "ghosthand-mnt")
	if err != nil {
		return err
	}
	defer os.Remove(mnt)
	if out, err := exec.Command("hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mnt, dmg).CombinedOutput(); err != nil {
		return fmt.Errorf("không mở được file cài: %v %s", err, out)
	}
	defer exec.Command("hdiutil", "detach", mnt, "-quiet", "-force").Run()
	found, _ := filepath.Glob(filepath.Join(mnt, "*.app"))
	if len(found) == 0 {
		return fmt.Errorf("file cài không có app bên trong")
	}
	if out, err := exec.Command("ditto", found[0], staged).CombinedOutput(); err != nil {
		os.RemoveAll(staged)
		return fmt.Errorf("không chép được bản mới vào %s: %v %s", filepath.Dir(app), err, out)
	}
	cmd := exec.Command("/bin/sh", "-c", MacSwapScript(os.Getpid(), app, staged))
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true} // sống tiếp sau khi app thoát
	return cmd.Start()
}
