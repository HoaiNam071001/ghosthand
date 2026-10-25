// Package update – báo có bản mới (không tự cài): hỏi GitHub Releases của repo, so với phiên bản đang chạy.
package update

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Version – phiên bản đang chạy, gắn lúc build (-ldflags "-X ghosthand/internal/update.Version=1.2.0"); "dev" = chưa gắn.
var Version = "dev"

// IsDev – bản tự build chưa gắn số phiên bản (không có tag git khi build cũng ra chuỗi rỗng).
func IsDev() bool { return Version == "" || Version == "dev" }

// Repo – nơi phát hành bản mới (owner/name trên GitHub).
const Repo = "HoaiNam071001/ghosthand"

// Info – kết quả một lần kiểm tra.
type Info struct {
	Current string  `json:"current"`
	Latest  string  `json:"latest"` // không kèm "v"
	URL     string  `json:"url"`    // trang tải của bản mới nhất
	Notes   string  `json:"notes"`  // ghi chú phát hành (cắt ngắn)
	Newer   bool    `json:"newer"`  // Latest mới hơn Current
	Assets  []Asset `json:"assets"` // file đính kèm Release – install.go chọn đúng file cho máy này
}

type release struct {
	Tag    string `json:"tag_name"`
	URL    string `json:"html_url"`
	Body   string `json:"body"`
	Assets []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
		Size int64  `json:"size"`
	} `json:"assets"`
}

const maxNotes = 600

// Check hỏi bản phát hành mới nhất. base rỗng = api.github.com (test truyền máy chủ giả). Repo chưa có bản phát hành
// hoặc là repo riêng tư → lỗi nói rõ, không coi là "đã mới nhất".
func Check(ctx context.Context, base string) (Info, error) {
	if base == "" {
		base = "https://api.github.com"
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/repos/"+Repo+"/releases/latest", nil)
	if err != nil {
		return Info{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "ghosthand/"+Version)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Info{}, fmt.Errorf("không kết nối được GitHub: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return Info{}, fmt.Errorf("chưa có bản phát hành nào trên GitHub (hoặc repo ở chế độ riêng tư)")
	}
	if resp.StatusCode != http.StatusOK {
		return Info{}, fmt.Errorf("GitHub trả mã %d", resp.StatusCode)
	}
	var r release
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return Info{}, fmt.Errorf("đọc phản hồi GitHub: %w", err)
	}
	latest := strings.TrimPrefix(r.Tag, "v")
	notes := r.Body
	if len([]rune(notes)) > maxNotes {
		notes = string([]rune(notes)[:maxNotes]) + "…"
	}
	info := Info{Current: Version, Latest: latest, URL: r.URL, Notes: notes, Newer: Newer(Version, latest)}
	for _, a := range r.Assets {
		info.Assets = append(info.Assets, Asset{Name: a.Name, URL: a.URL, Size: a.Size})
	}
	return info, nil
}

// Newer: latest > current theo số phiên bản (1.2.10 > 1.2.9). Bản "dev" hoặc chuỗi không đọc được → false (không nhắc).
func Newer(current, latest string) bool {
	c, ok1 := parse(current)
	l, ok2 := parse(latest)
	if !ok1 || !ok2 {
		return false
	}
	for i := range c {
		if l[i] != c[i] {
			return l[i] > c[i]
		}
	}
	return false
}

// parse đọc "v1.2.3" / "1.2" (thiếu phần thì coi là 0); đuôi "-rc1" bị bỏ.
func parse(v string) ([3]int, bool) {
	var out [3]int
	v = strings.TrimPrefix(strings.TrimSpace(v), "v")
	if i := strings.IndexAny(v, "-+"); i >= 0 {
		v = v[:i]
	}
	if v == "" {
		return out, false
	}
	parts := strings.Split(v, ".")
	if len(parts) > 3 {
		return out, false
	}
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 {
			return out, false
		}
		out[i] = n
	}
	return out, true
}
