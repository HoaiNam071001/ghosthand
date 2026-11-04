package script

import (
	"os"
	"path/filepath"
	"testing"

	"ghosthand/internal/model"
)

func TestShellFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "x.sh")
	if err := os.WriteFile(f, []byte("echo a"), 0o644); err != nil {
		t.Fatal(err)
	}
	for cmd, want := range map[string]string{
		"sh x.sh":            f,
		"bash -e x.sh arg1":  f,
		"/bin/zsh " + f:      f,
		"./x.sh":             f,
		"python3 missing.py": "", // file không có
		"ls -la":             "", // lệnh có sẵn
		"sh x.sh; rm -rf ~":  "", // nhiều lệnh – không đoán
		"sh x.sh | tee log":  "",
		`sh "x.sh"`:          "",
		"echo $HOME":         "",
		"sh":                 "",
	} {
		if got, h := shellFile(cmd, dir); got != want || (want != "" && h == "") {
			t.Errorf("%q → %q %q, muốn %q", cmd, got, h, want)
		}
	}
}

func TestDangerOpsShellFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "run.sh")
	os.WriteFile(f, []byte("echo 1"), 0o644)
	sc := model.Script{Steps: []model.Step{shellStep(func(s *model.Step) { s.Script, s.FilePath = "sh run.sh", dir })}}
	ops, fp := DangerOps(sc)
	if ops[0].File != f || ops[0].FileHash == "" {
		t.Fatalf("op %+v", ops[0])
	}
	os.WriteFile(f, []byte("echo 2"), 0o644)
	if _, fp2 := DangerOps(sc); fp2 == fp {
		t.Error("sửa file script sau khi đồng ý mà dấu vân tay không đổi")
	}
	sc.Steps[0].ShellLang = model.ShellAppleScript
	if ops, _ := DangerOps(sc); ops[0].File != "" {
		t.Error("AppleScript: Script là mã, không tìm file")
	}
}
