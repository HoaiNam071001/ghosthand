package browser

import (
	"net"
	"regexp"
	"strings"
)

// Chữ UIA của trình duyệt Windows → tiêu đề / URL như AppleScript trả (bước 43 B1w). Hàm thuần để test mọi hệ.

// memorySuffix – Chrome / Edge thêm vào tên tab "– Mức sử dụng bộ nhớ – 394 MB" (tuỳ ngôn ngữ) khi rê chuột / tab nặng.
var memorySuffix = regexp.MustCompile(`\s+[–—-]\s+[^–—]*\s+[–—-]\s+\d+(?:[.,]\d+)?\s*(?:KB|MB|GB)$`)

// drivePath – ô địa chỉ hiện file trên máy dạng "C:/Users/…" (bỏ file:///).
var drivePath = regexp.MustCompile(`^[A-Za-z]:[/\\]`)

// cleanTabTitle bỏ phần chú thích bộ nhớ khỏi tên tab UIA.
func cleanTabTitle(name string) string {
	return memorySuffix.ReplaceAllString(strings.TrimSpace(name), "")
}

// omniboxURL – ô địa chỉ giấu "https://" nên thêm lại: máy trong mạng nội bộ / localhost là http, còn lại https.
// Chữ đã có scheme (chrome://, file:///, http://) giữ nguyên; file trên máy hiện là đường dẫn "C:/…" → file:///C:/…;
// ô đang trống hoặc đang gõ dở (có khoảng trắng) → "".
func omniboxURL(v string) string {
	v = strings.TrimSpace(v)
	if drivePath.MatchString(v) {
		return "file:///" + strings.NewReplacer(`\`, "/", " ", "%20").Replace(v)
	}
	if v == "" || strings.ContainsAny(v, " \t") {
		return ""
	}
	if i := strings.Index(v, "://"); i > 0 {
		return v
	}
	if strings.HasPrefix(v, "about:") {
		return v
	}
	host := v
	if i := strings.IndexAny(host, "/?#"); i >= 0 {
		host = host[:i]
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	if host == "localhost" || net.ParseIP(host) != nil && isPrivateHost(host) {
		return "http://" + v
	}
	return "https://" + v
}

func isPrivateHost(h string) bool {
	ip := net.ParseIP(h)
	return ip.IsLoopback() || ip.IsPrivate()
}
