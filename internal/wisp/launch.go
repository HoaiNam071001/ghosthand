package wisp

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

// launchWait – chờ Wisp ghi ghosthand.json sau khi mở app (Electron khởi động + mở cổng).
const launchWait = 20 * time.Second

// appPaths – chỗ hay cài Wisp (Windows: bộ cài NSIS một người dùng của electron-builder / Program Files).
func appPaths(goos string, env func(string) string) []string {
	switch goos {
	case "darwin":
		return []string{"/Applications/Wisp.app", filepath.Join(env("HOME"), "Applications", "Wisp.app")}
	case "windows":
		var out []string
		for _, base := range []string{filepath.Join(env("LOCALAPPDATA"), "Programs"), env("ProgramFiles")} {
			if base != "" {
				out = append(out, filepath.Join(base, "Wisp", "Wisp.exe"))
			}
		}
		return out
	}
	return nil
}

// errNoApp – không tìm thấy Wisp trên máy.
var errNoApp = errors.New("không tìm thấy app Wisp trên máy – cài Wisp hoặc đổi Cài đặt → Trình duyệt sang Chrome của app")

// launchApp mở Wisp (không chờ). Đã mở sẵn thì hệ điều hành chỉ đưa lên trước.
func launchApp() error {
	for _, p := range appPaths(runtime.GOOS, os.Getenv) {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		var cmd *exec.Cmd
		if runtime.GOOS == "darwin" {
			cmd = exec.Command("open", "-g", p) // -g: không giành focus của người dùng
		} else {
			cmd = exec.Command(p)
		}
		if err := cmd.Start(); err != nil {
			return err
		}
		go func() { _ = cmd.Wait() }()
		return nil
	}
	return errNoApp
}

// waitInfo đọc ghosthand.json tới khi có (Wisp vừa mở) hoặc hết timeout.
func waitInfo(ctx context.Context, dir string, timeout time.Duration) (Info, error) {
	end := time.Now().Add(timeout)
	for {
		in, err := ReadInfo(dir, Alive)
		if err == nil || errors.Is(err, ErrOldAPI) || time.Now().After(end) {
			return in, err
		}
		select {
		case <-ctx.Done():
			return in, ctx.Err()
		case <-time.After(300 * time.Millisecond):
		}
	}
}
