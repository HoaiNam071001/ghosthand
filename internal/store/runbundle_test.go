package store

import (
	"archive/zip"
	"bytes"
	"image"
	"io"
	"strings"
	"testing"

	"ghosthand/internal/model"
)

func TestWriteRunBundle(t *testing.T) {
	dir := t.TempDir()
	rec := model.RunRecord{RunSummary: model.RunSummary{ID: "20261108-101010.000", Script: "Gửi tin"},
		Inputs:  map[string]any{"password": "abc12345", "ten": "Lan"},
		Results: []model.StepResult{{NodeID: "s1", Status: model.StatusFail, Shot: "1.png", Output: map[string]any{"body": `lỗi pa"ss1`}}}}
	if err := SaveRun(dir, rec, map[string]image.Image{"1.png": image.NewRGBA(image.Rect(0, 0, 2, 2))}); err != nil {
		t.Fatal(err)
	}
	sc := model.Script{Name: "Gửi tin", Steps: []model.Step{{ID: "s1", Type: "type", Text: "mk: Ghost-1234"}}}
	var buf bytes.Buffer
	vals := map[string]string{"mk": "Ghost-1234", "q": `pa"ss1`, "ngan": "ab"}
	if err := writeBundle(&buf, dir, rec.ID, sc, BundleInfo{App: "dev", OS: "windows"}, secretRedactor(vals)); err != nil {
		t.Fatal(err)
	}
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	files := map[string]string{}
	for _, f := range zr.File {
		r, _ := f.Open()
		b, _ := io.ReadAll(r)
		files[f.Name] = string(b)
	}
	for _, n := range []string{"info.json", "run.json", "script.json", "shots/1.png"} {
		if _, ok := files[n]; !ok {
			t.Fatalf("thiếu %s trong gói: %v", n, zr.File)
		}
	}
	all := files["run.json"] + files["script.json"]
	for _, leak := range []string{"Ghost-1234", `pa\"ss1`, "abc12345"} {
		if strings.Contains(all, leak) {
			t.Errorf("lộ %q trong gói", leak)
		}
	}
	if !strings.Contains(files["run.json"], `"ten": "Lan"`) || !strings.Contains(files["info.json"], `"os": "windows"`) {
		t.Errorf("che quá tay / thiếu info: %s %s", files["run.json"], files["info.json"])
	}
	if err := writeBundle(io.Discard, dir, "khong-co", sc, BundleInfo{}, secretRedactor(nil)); err == nil {
		t.Error("lần chạy không có phải báo lỗi")
	}
}

func TestBundleName(t *testing.T) {
	if got := BundleName("Gửi tin Zalo!", "20261108-101010.000"); got != "ghosthand-loi-gửi-tin-zalo-20261108-101010.000.zip" {
		t.Fatal(got)
	}
	if got := BundleName(" ! ", "1"); got != "ghosthand-loi-kich-ban-1.zip" {
		t.Fatal(got)
	}
}
