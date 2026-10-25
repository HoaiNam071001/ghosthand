package update

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Asset – một file đính kèm Release.
type Asset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

// allowedPrefix – chỉ tải file từ Release của repo này (test đổi sang máy chủ giả).
var allowedPrefix = "https://github.com/" + Repo + "/releases/download/"

// PickAsset chọn file cài cho hệ điều hành goos: macOS = .dmg; Windows = bộ cài (-setup.exe) khi app đang chạy từ bản
// cài (installed), không thì bản không cài đặt (-portable.zip). Phải có kèm "<tên>.sha256" – không có thì không chọn
// (không cài file không kiểm tra được).
func PickAsset(assets []Asset, goos string, installed bool) (file, sum Asset, err error) {
	suffix := map[string]string{"darwin": ".dmg", "windows": "-portable.zip"}[goos]
	if goos == "windows" && installed {
		suffix = "-setup.exe"
	}
	if suffix == "" {
		return file, sum, fmt.Errorf("hệ điều hành %s chưa hỗ trợ tự cập nhật", goos)
	}
	for _, a := range assets {
		if strings.HasSuffix(a.Name, suffix) {
			file = a
		}
	}
	if file.Name == "" {
		return file, sum, fmt.Errorf("bản mới chưa có file %s cho máy này – mở trang tải để lấy tay", suffix)
	}
	for _, a := range assets {
		if a.Name == file.Name+".sha256" {
			return file, a, nil
		}
	}
	return file, sum, fmt.Errorf("bản mới thiếu file kiểm tra %s.sha256 – không tự cài, mở trang tải để lấy tay", file.Name)
}

// Download tải file về dir, kiểm sha256 theo file sum rồi trả đường dẫn. progress(done, total) gọi định kỳ.
func Download(ctx context.Context, file, sum Asset, dir string, progress func(done, total int64)) (string, error) {
	want, err := fetchSum(ctx, sum)
	if err != nil {
		return "", err
	}
	resp, err := get(ctx, file.URL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, filepath.Base(file.Name))
	out, err := os.Create(path)
	if err != nil {
		return "", err
	}
	h := sha256.New()
	total := resp.ContentLength
	if total <= 0 {
		total = file.Size
	}
	_, err = io.Copy(io.MultiWriter(out, h), &countReader{r: resp.Body, total: total, fn: progress})
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(path)
		return "", fmt.Errorf("tải lỗi giữa chừng: %w", err)
	}
	if got := hex.EncodeToString(h.Sum(nil)); got != want {
		os.Remove(path)
		return "", fmt.Errorf("file tải về không khớp mã kiểm tra (sha256) – không cài")
	}
	return path, nil
}

func get(ctx context.Context, url string) (*http.Response, error) {
	if !strings.HasPrefix(url, allowedPrefix) {
		return nil, fmt.Errorf("địa chỉ tải không thuộc Release của Ghosthand: %s", url)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "ghosthand/"+Version)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("không tải được: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("máy chủ trả mã %d khi tải %s", resp.StatusCode, filepath.Base(url))
	}
	return resp, nil
}

// fetchSum đọc mã sha256 (64 ký tự hex đầu file; chấp nhận cả dạng "mã  tên-file").
func fetchSum(ctx context.Context, a Asset) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	resp, err := get(ctx, a.URL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1024))
	if err != nil {
		return "", err
	}
	f := strings.Fields(string(b))
	if len(f) == 0 || len(f[0]) != 64 {
		return "", fmt.Errorf("file kiểm tra %s sai định dạng", a.Name)
	}
	return strings.ToLower(f[0]), nil
}

type countReader struct {
	r           io.Reader
	done, total int64
	last        time.Time
	fn          func(done, total int64)
}

func (c *countReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.done += int64(n)
	if c.fn != nil && (err != nil || time.Since(c.last) > 150*time.Millisecond) {
		c.last = time.Now()
		c.fn(c.done, c.total)
	}
	return n, err
}

// ExtractExe lấy đúng một file exe trong zip ra dst (không giải nén tên khác – không lo zip slip).
func ExtractExe(zipPath, name, dst string) error {
	zr, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer zr.Close()
	for _, f := range zr.File {
		if f.Name != name {
			continue
		}
		in, err := f.Open()
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, in); err != nil {
			out.Close()
			return err
		}
		return out.Close()
	}
	return fmt.Errorf("zip không có %s", name)
}

// AppBundle trả đường dẫn .app chứa file chạy exe (macOS: …/Ghosthand.app/Contents/MacOS/ghosthand); "" nếu không chạy
// từ .app (vd wails dev).
func AppBundle(exe string) string {
	const mark = ".app/Contents/MacOS/"
	if i := strings.Index(exe, mark); i >= 0 {
		return exe[:i+len(".app")]
	}
	return ""
}

func shQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'" }
func psQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }

// MacSwapScript – chạy sau khi app thoát: thay app cũ bằng bản đã chép sẵn (newApp), lỗi thì trả lại bản cũ, rồi mở lại.
func MacSwapScript(pid int, app, newApp string) string {
	old := app + ".old"
	return fmt.Sprintf(`while kill -0 %d 2>/dev/null; do sleep 0.3; done
rm -rf %[3]s
if mv %[2]s %[3]s && mv %[4]s %[2]s; then rm -rf %[3]s; else [ -e %[2]s ] || mv %[3]s %[2]s; fi
open %[2]s
`, pid, shQuote(app), shQuote(old), shQuote(newApp))
}

// WinInstallScript (PowerShell) – chờ app thoát, chạy bộ cài im lặng (xin quyền quản trị – UAC), rồi mở lại app.
func WinInstallScript(pid int, setup, exe string) string {
	return fmt.Sprintf(`Wait-Process -Id %d -ErrorAction SilentlyContinue
Start-Process -FilePath %s -ArgumentList '/S' -Verb RunAs -Wait
Start-Process -FilePath %s
`, pid, psQuote(setup), psQuote(exe))
}

// WinPortableScript (PowerShell) – chờ app thoát, đè exe cũ bằng exe mới (thử lại vì Windows nhả khoá file chậm), mở lại.
func WinPortableScript(pid int, newExe, exe string) string {
	return fmt.Sprintf(`Wait-Process -Id %d -ErrorAction SilentlyContinue
for ($i = 0; $i -lt 50; $i++) { try { Move-Item -Force -LiteralPath %s -Destination %s -ErrorAction Stop; break } catch { Start-Sleep -Milliseconds 300 } }
Start-Process -FilePath %s
`, pid, psQuote(newExe), psQuote(exe), psQuote(exe))
}
