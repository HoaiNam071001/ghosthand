package wisp

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDataDir(t *testing.T) {
	env := func(m map[string]string) func(string) string { return func(k string) string { return m[k] } }
	if d := DataDir("darwin", env(map[string]string{"HOME": "/Users/a"})); d != filepath.Join("/Users/a", "Library", "Application Support", "Wisp") {
		t.Errorf("mac: %s", d)
	}
	if d := DataDir("windows", env(map[string]string{"APPDATA": `C:\U\AppData\Roaming`})); !strings.HasSuffix(d, "Wisp") {
		t.Errorf("windows: %s", d)
	}
	if d := DataDir("darwin", env(map[string]string{"WISP_USER_DATA": "/tmp/dev"})); d != "/tmp/dev" {
		t.Errorf("WISP_USER_DATA: %s", d)
	}
}

func TestReadInfo(t *testing.T) {
	dir := t.TempDir()
	alive := func(int) bool { return true }
	if _, err := ReadInfo(dir, alive); !errors.Is(err, ErrNotRunning) {
		t.Errorf("chưa có file: %v", err)
	}
	write := func(s string) { _ = os.WriteFile(filepath.Join(dir, infoFile), []byte(s), 0o600) }
	write(`{"port":51234,"token":"abc","pid":42,"version":"3.0.0","api":1}`)
	in, err := ReadInfo(dir, alive)
	if err != nil || in.Port != 51234 || in.Token != "abc" {
		t.Errorf("đọc: %+v %v", in, err)
	}
	if _, err := ReadInfo(dir, func(int) bool { return false }); !errors.Is(err, ErrNotRunning) {
		t.Errorf("pid đã tắt (file sót): %v", err)
	}
	write(`{"port":1,"token":"x","api":2,"version":"4.0.0"}`)
	if _, err := ReadInfo(dir, alive); !errors.Is(err, ErrOldAPI) || !strings.Contains(err.Error(), "cập nhật Ghosthand") {
		t.Errorf("api mới hơn: %v", err)
	}
	write(`hỏng`)
	if _, err := ReadInfo(dir, alive); !errors.Is(err, ErrNotRunning) {
		t.Errorf("file hỏng: %v", err)
	}
}
