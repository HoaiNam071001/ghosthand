package update

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// Chạy thật script thay app (macOS): app cũ bị thay bằng bản mới, `open` giả ghi lại việc mở lại.
func TestMacSwapScriptRuns(t *testing.T) {
	dir := t.TempDir()
	app, staged := filepath.Join(dir, "Ghosthand.app"), filepath.Join(dir, ".Ghosthand-update.app")
	for p, v := range map[string]string{app: "cu", staged: "moi"} {
		os.MkdirAll(p, 0o755)
		os.WriteFile(filepath.Join(p, "v"), []byte(v), 0o644)
	}
	bin := filepath.Join(dir, "bin")
	os.MkdirAll(bin, 0o755)
	opened := filepath.Join(dir, "opened")
	os.WriteFile(filepath.Join(bin, "open"), []byte("#!/bin/sh\necho \"$1\" > "+opened+"\n"), 0o755)

	// pid đã thoát → script chạy ngay
	dead := exec.Command("true")
	dead.Run()
	cmd := exec.Command("/bin/sh", "-c", MacSwapScript(dead.Process.Pid, app, staged))
	cmd.Env = append(os.Environ(), "PATH="+bin+":"+os.Getenv("PATH"))
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%v %s", err, out)
	}
	if b, _ := os.ReadFile(filepath.Join(app, "v")); string(b) != "moi" {
		t.Errorf("app chưa được thay: %q", b)
	}
	for _, gone := range []string{staged, app + ".old"} {
		if _, err := os.Stat(gone); err == nil {
			t.Errorf("còn sót %s", gone)
		}
	}
	if b, _ := os.ReadFile(opened); string(b) != app+"\n" {
		t.Errorf("không mở lại app: %q", b)
	}
}
