package update

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// webBase – trang web GitHub (không phải API); test đổi sang máy chủ giả.
var webBase = "https://github.com"

var assetHref = regexp.MustCompile(`href="(/` + regexp.QuoteMeta(Repo) + `/releases/download/[^"]+)"`)

// checkViaWeb – đường dự phòng khi api.github.com chặn (403 / 429: hết 60 lượt/giờ theo IP, hay gặp ở mạng công ty dùng chung IP).
// Trang /releases/latest chuyển hướng tới /releases/tag/<tag>, danh sách file lấy ở expanded_assets – không tính hạn mức API.
func checkViaWeb(ctx context.Context) (Info, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	get := func(u string) (*http.Response, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "ghosthand/"+Version)
		return client.Do(req)
	}
	resp, err := get(webBase + "/" + Repo + "/releases/latest")
	if err != nil {
		return Info{}, fmt.Errorf("không kết nối được GitHub: %w", err)
	}
	resp.Body.Close()
	loc := resp.Header.Get("Location")
	i := strings.LastIndex(loc, "/releases/tag/")
	if resp.StatusCode/100 != 3 || i < 0 {
		return Info{}, fmt.Errorf("GitHub trả mã %d", resp.StatusCode)
	}
	tag, _ := url.PathUnescape(loc[i+len("/releases/tag/"):])
	info := Info{Current: Version, Latest: strings.TrimPrefix(tag, "v"), URL: webBase + "/" + Repo + "/releases/tag/" + url.PathEscape(tag)}
	info.Newer = Newer(Version, info.Latest)
	resp, err = get(webBase + "/" + Repo + "/releases/expanded_assets/" + url.PathEscape(tag))
	if err != nil || resp.StatusCode != http.StatusOK {
		return info, nil // vẫn báo được có bản mới; thiếu file thì Install báo mở trang tải
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	seen := map[string]bool{}
	for _, m := range assetHref.FindAllStringSubmatch(string(body), -1) {
		if seen[m[1]] {
			continue
		}
		seen[m[1]] = true
		name, _ := url.PathUnescape(m[1][strings.LastIndex(m[1], "/")+1:])
		info.Assets = append(info.Assets, Asset{Name: name, URL: webBase + m[1]})
	}
	return info, nil
}
