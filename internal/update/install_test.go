package update

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPickAsset(t *testing.T) {
	assets := []Asset{
		{Name: "Ghosthand-1.0.1.dmg"}, {Name: "Ghosthand-1.0.1.dmg.sha256"},
		{Name: "Ghosthand-1.0.1-setup.exe"}, {Name: "Ghosthand-1.0.1-setup.exe.sha256"},
		{Name: "Ghosthand-1.0.1-portable.zip"}, {Name: "Ghosthand-1.0.1-portable.zip.sha256"},
	}
	for _, c := range []struct {
		goos      string
		installed bool
		want      string
	}{
		{"darwin", false, "Ghosthand-1.0.1.dmg"},
		{"windows", true, "Ghosthand-1.0.1-setup.exe"},
		{"windows", false, "Ghosthand-1.0.1-portable.zip"},
	} {
		f, s, err := PickAsset(assets, c.goos, c.installed)
		if err != nil || f.Name != c.want || s.Name != c.want+".sha256" {
			t.Errorf("%s installed=%v: %v %v %v", c.goos, c.installed, f.Name, s.Name, err)
		}
	}
	if _, _, err := PickAsset(assets[:1], "darwin", false); err == nil || !strings.Contains(err.Error(), "sha256") {
		t.Errorf("thiếu .sha256 phải từ chối: %v", err)
	}
	if _, _, err := PickAsset(nil, "windows", false); err == nil {
		t.Error("không có file nào phải báo lỗi")
	}
	if _, _, err := PickAsset(assets, "linux", false); err == nil {
		t.Error("linux chưa hỗ trợ")
	}
}

func TestDownloadVerifiesChecksum(t *testing.T) {
	body := []byte("noi dung file cai")
	sum := sha256.Sum256(body)
	good, bad := hex.EncodeToString(sum[:])+"  x.dmg\n", strings.Repeat("0", 64)+"\n"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/x.dmg":
			w.Write(body)
		case "/good.sha256":
			w.Write([]byte(good))
		case "/bad.sha256":
			w.Write([]byte(bad))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	old := allowedPrefix
	allowedPrefix = srv.URL
	defer func() { allowedPrefix = old }()

	dir := t.TempDir()
	var last int64
	path, err := Download(context.Background(), Asset{Name: "x.dmg", URL: srv.URL + "/x.dmg"}, Asset{Name: "good.sha256", URL: srv.URL + "/good.sha256"}, dir,
		func(done, total int64) { last = done })
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(path); string(got) != string(body) || last != int64(len(body)) {
		t.Errorf("nội dung / tiến độ sai: %q %d", got, last)
	}

	if _, err := Download(context.Background(), Asset{Name: "y.dmg", URL: srv.URL + "/x.dmg"}, Asset{Name: "bad.sha256", URL: srv.URL + "/bad.sha256"}, dir, nil); err == nil || !strings.Contains(err.Error(), "không khớp") {
		t.Errorf("sai mã phải từ chối: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "y.dmg")); err == nil {
		t.Error("file sai mã phải bị xoá")
	}
	if _, err := Download(context.Background(), Asset{Name: "x.dmg", URL: "https://evil.example/x.dmg"}, Asset{URL: srv.URL + "/good.sha256"}, dir, nil); err == nil {
		t.Error("địa chỉ ngoài repo phải bị chặn")
	}
}

func TestExtractExe(t *testing.T) {
	dir := t.TempDir()
	zp := filepath.Join(dir, "p.zip")
	f, _ := os.Create(zp)
	zw := zip.NewWriter(f)
	for name, content := range map[string]string{"../evil.txt": "x", "ghosthand.exe": "MZ-exe"} {
		w, _ := zw.Create(name)
		w.Write([]byte(content))
	}
	zw.Close()
	f.Close()
	dst := filepath.Join(dir, "new.exe")
	if err := ExtractExe(zp, "ghosthand.exe", dst); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(dst); string(b) != "MZ-exe" {
		t.Errorf("nội dung sai: %q", b)
	}
	if _, err := os.Stat(filepath.Join(dir, "..", "evil.txt")); err == nil {
		t.Error("không được giải file tên lạ")
	}
	if err := ExtractExe(zp, "khong-co.exe", dst); err == nil {
		t.Error("thiếu file phải báo lỗi")
	}
}

func TestAppBundle(t *testing.T) {
	if got := AppBundle("/Applications/Ghosthand.app/Contents/MacOS/ghosthand"); got != "/Applications/Ghosthand.app" {
		t.Errorf("got %q", got)
	}
	if got := AppBundle("/Users/x/go/bin/ghosthand"); got != "" {
		t.Errorf("không phải .app mà trả %q", got)
	}
}

func TestScriptsQuoteSafely(t *testing.T) {
	sh := MacSwapScript(42, "/Applications/It's.app", "/Applications/.new.app")
	if !strings.Contains(sh, `'/Applications/It'\''s.app'`) || !strings.Contains(sh, "kill -0 42") {
		t.Errorf("script mac: %s", sh)
	}
	ps := WinInstallScript(7, `C:\Temp\a'b-setup.exe`, `C:\P\g.exe`)
	if !strings.Contains(ps, `'C:\Temp\a''b-setup.exe'`) || !strings.Contains(ps, "Wait-Process -Id 7") || !strings.Contains(ps, "-Verb RunAs") {
		t.Errorf("script win cài: %s", ps)
	}
	pp := WinPortableScript(7, `C:\P\g.exe.new`, `C:\P\g.exe`)
	if !strings.Contains(pp, "Move-Item -Force") || !strings.Contains(pp, `Start-Process -FilePath 'C:\P\g.exe'`) {
		t.Errorf("script win portable: %s", pp)
	}
}
