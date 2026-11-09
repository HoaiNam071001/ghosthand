package cloud_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/cloudtest"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

func writeScript(t *testing.T, path string, mut func(*model.Script)) {
	t.Helper()
	s, err := model.NewStep(model.StepForEach)
	if err != nil {
		t.Fatal(err)
	}
	s.ID, s.Ref = "s1", "n1"
	sc := model.NewScript()
	sc.Name = filepath.Base(path)
	sc.Steps = []model.Step{s}
	sc.Start = "s1"
	mut(&sc)
	b, err := script.EncodeScript(sc)
	if err != nil {
		t.Fatal(err)
	}
	os.MkdirAll(filepath.Dir(path), 0o755)
	if err := os.WriteFile(path, b, 0o644); err != nil {
		t.Fatal(err)
	}
}

func readScript(t *testing.T, path string) model.Script {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	sc, err := script.DecodeScript(b)
	if err != nil {
		t.Fatal(err)
	}
	return sc
}

func libSync(t *testing.T, remote cloud.Provider, lib *cloud.Library, st *cloud.State, dev string) cloud.Result {
	t.Helper()
	s := &cloud.Syncer{Remote: remote, Local: lib, State: st, Device: dev, Scope: all}
	res, err := s.Run(context.Background())
	if err != nil {
		t.Fatalf("%s: %v", dev, err)
	}
	return res
}

func TestLibraryAssetsTravelBetweenMachines(t *testing.T) {
	remote := cloudtest.New()
	rootA, rootB := t.TempDir(), t.TempDir()
	csv := filepath.Join(t.TempDir(), "khach.csv")
	os.WriteFile(csv, []byte("ten,sdt\nAn,090\n"), 0o644)
	writeScript(t, filepath.Join(rootA, "nhom", "gui.json"), func(sc *model.Script) {
		sc.Steps[0].ListFrom, sc.Steps[0].FilePath = model.ListFile, csv
	})
	stA, stB := cloud.State{}, cloud.State{}
	libA, libB := &cloud.Library{Root: rootA}, &cloud.Library{Root: rootB}

	res := libSync(t, remote, libA, &stA, "A")
	if len(res.Pushed) != 2 || len(libA.Missing()) != 0 {
		t.Fatalf("A phải đẩy kịch bản + 1 tệp CSV: %+v", res)
	}
	// trên cloud kịch bản không còn đường dẫn riêng máy A
	if got := string(remote.Raw("scripts/nhom/gui.json")); strings.Contains(got, filepath.Base(filepath.Dir(csv))) || !strings.Contains(got, "assets/") {
		t.Fatalf("đường dẫn trên cloud chưa mang đi được: %s", got)
	}

	libSync(t, remote, libB, &stB, "B")
	sc := readScript(t, filepath.Join(rootB, "nhom", "gui.json"))
	p := sc.Steps[0].FilePath
	if !strings.HasPrefix(p, filepath.Join(rootB, "assets")) {
		t.Fatalf("máy B phải trỏ vào thư mục của B: %s", p)
	}
	if b, err := os.ReadFile(p); err != nil || string(b) != "ten,sdt\nAn,090\n" {
		t.Fatalf("máy B không có tệp CSV: %v", err)
	}
	// ổn định: B quét lại cùng hash, không đẩy gì; A cũng không nhận gì
	if res := libSync(t, remote, libB, &stB, "B"); res.Changed() {
		t.Fatalf("B đẩy lại sau khi nhận: %+v", res)
	}
	if res := libSync(t, remote, libA, &stA, "A"); res.Changed() {
		t.Fatalf("A đổi sau khi B nhận: %+v", res)
	}
}

func TestLibraryMissingAssetReported(t *testing.T) {
	root := t.TempDir()
	gone := filepath.Join(t.TempDir(), "mat.csv")
	writeScript(t, filepath.Join(root, "x.json"), func(sc *model.Script) {
		sc.Steps[0].ListFrom, sc.Steps[0].FilePath = model.ListFile, gone
	})
	lib := &cloud.Library{Root: root}
	remote := cloudtest.New()
	st := cloud.State{}
	res := libSync(t, remote, lib, &st, "A")
	if len(res.Pushed) != 1 || len(lib.Missing()) != 1 || !strings.Contains(lib.Missing()[0], "mat.csv") {
		t.Fatalf("phải đẩy kịch bản và báo tệp thiếu: %+v %v", res, lib.Missing())
	}
}

func TestLibraryRejectsHostilePaths(t *testing.T) {
	lib := &cloud.Library{Root: t.TempDir()}
	for _, p := range []string{"scripts/../../x.json", "scripts/a/../../b.json", "scripts//x.json", "assets/../x", `scripts/a\b.json`, "scripts/C:/x.json", "scripts/x.exe", "settings.json", "/etc/passwd"} {
		if err := lib.Write(p, []byte("{}")); err == nil {
			t.Errorf("Write(%q) phải bị từ chối", p)
		}
		if err := lib.Remove(p); err == nil {
			t.Errorf("Remove(%q) phải bị từ chối", p)
		}
	}
}

func TestLibraryIgnoresAssetsDirAndNonJSON(t *testing.T) {
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "assets", "ab"), 0o755)
	os.WriteFile(filepath.Join(root, "assets", "ab", "x.json"), []byte("{}"), 0o644)
	os.WriteFile(filepath.Join(root, "ghi-chu.txt"), []byte("x"), 0o644)
	h, err := (&cloud.Library{Root: root}).Hashes()
	if err != nil || len(h) != 0 {
		t.Fatalf("chỉ kịch bản .json mới đồng bộ: %v %v", h, err)
	}
}

func TestLibraryUnreadableScriptSyncsAsRawFile(t *testing.T) {
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "hong.json"), []byte("không phải json"), 0o644)
	remote := cloudtest.New()
	st := cloud.State{}
	res := libSync(t, remote, &cloud.Library{Root: root}, &st, "A")
	if len(res.Pushed) != 1 || string(remote.Raw("scripts/hong.json")) != "không phải json" {
		t.Fatalf("file hỏng phải đi nguyên văn: %+v", res)
	}
}
