package pack

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

func step(t *testing.T, typ, id string, f func(*model.Step)) model.Step {
	t.Helper()
	s, err := model.NewStep(typ)
	if err != nil {
		t.Fatal(err)
	}
	s.ID, s.Ref = id, "n"+id[1:]
	f(&s)
	return s
}

func TestExportImportRoundTrip(t *testing.T) {
	src := t.TempDir()
	csv := filepath.Join(src, "khach.csv")
	os.WriteFile(csv, []byte("ten,sdt\nAn,090\n"), 0o644)
	img := filepath.Join(src, "logo.png")
	os.WriteFile(img, []byte("PNG"), 0o644)
	sc := model.NewScript()
	sc.Name = "Gửi tin: khách"
	sc.Steps = []model.Step{
		step(t, model.StepForEach, "s1", func(s *model.Step) { s.ListFrom, s.FilePath = model.ListFile, csv }),
		step(t, model.StepClipboard, "s2", func(s *model.Step) { s.ClipOp, s.FilePath = model.ClipImage, img }),
		step(t, model.StepAskAI, "s3", func(s *model.Step) { s.AIImage, s.FilePath = model.AIImageFile, csv }), // cùng file → một bản
		step(t, model.StepClipboard, "s4", func(s *model.Step) { s.ClipOp, s.FilePath = model.ClipImage, filepath.Join(src, "khong-co.png") }),
		step(t, model.StepForEach, "s5", func(s *model.Step) { s.ListFrom, s.FilePath = model.ListFile, "{{vars.file}}" }),
		step(t, model.StepScreenshot, "s6", func(s *model.Step) { s.SaveDir = src }), // file ghi ra – không đóng gói
	}
	sc.Start = "s1"
	zipPath := filepath.Join(t.TempDir(), "goi.zip")
	res, err := Export(sc, zipPath)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(res.Files, ",") != "khach.csv,logo.png" || len(res.Missing) != 1 {
		t.Fatalf("xuất %+v", res)
	}

	dest := t.TempDir()
	os.WriteFile(filepath.Join(dest, "Gửi tin- khách.json"), []byte("{}"), 0o644) // trùng tên → -2
	in, err := Import(zipPath, dest)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(in.Path) != "Gửi tin- khách-2.json" || len(in.Files) != 2 {
		t.Fatalf("nhập %+v", in)
	}
	b, _ := os.ReadFile(in.Path)
	got, err := script.DecodeScript(b)
	if err != nil {
		t.Fatal(err)
	}
	files := filepath.Join(dest, "Gửi tin- khách-2-files")
	if got.Steps[0].FilePath != filepath.Join(files, "khach.csv") || got.Steps[2].FilePath != got.Steps[0].FilePath {
		t.Errorf("đường dẫn mới %q / %q", got.Steps[0].FilePath, got.Steps[2].FilePath)
	}
	if data, _ := os.ReadFile(got.Steps[1].FilePath); string(data) != "PNG" {
		t.Errorf("ảnh chưa giải nén: %q", data)
	}
	if got.Steps[3].FilePath != filepath.Join(src, "khong-co.png") || got.Steps[4].FilePath != "{{vars.file}}" {
		t.Errorf("file thiếu / có biến phải giữ nguyên: %q %q", got.Steps[3].FilePath, got.Steps[4].FilePath)
	}
}

func TestImportRejectsBadZip(t *testing.T) {
	dir := t.TempDir()
	write := func(name string, entries map[string]string) string {
		p := filepath.Join(dir, name)
		f, _ := os.Create(p)
		zw := zip.NewWriter(f)
		for n, c := range entries {
			w, _ := zw.Create(n)
			w.Write([]byte(c))
		}
		zw.Close()
		f.Close()
		return p
	}
	if _, err := Import(write("trong.zip", map[string]string{"a.txt": "x"}), dir); err == nil {
		t.Error("thiếu script.json phải báo lỗi")
	}
	b, _ := script.EncodeScript(model.NewScript())
	dest := t.TempDir()
	res, err := Import(write("slip.zip", map[string]string{"script.json": string(b), "files/../../ra-ngoai.txt": "x", "files/a/b.txt": "x", "files/ok.txt": "x"}), dest)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(res.Files, ",") != "ok.txt" {
		t.Errorf("chỉ nhận file phẳng trong files/: %v", res.Files)
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(dest), "ra-ngoai.txt")); err == nil {
		t.Error("zip slip ghi ra ngoài thư mục")
	}
}
