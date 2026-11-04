package envcheck

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

// Profile – thư mục dữ liệu (User Data) của một trình duyệt họ Chromium.
type Profile struct {
	Browser string // tên hiện cho người dùng
	Dir     string // thư mục chứa Local State + các profile
}

// Profiles – trình duyệt thường của người dùng theo hệ điều hành + Chrome của app (appProfile – profile riêng, "" = bỏ).
func Profiles(appProfile string) []Profile {
	out := []Profile{}
	switch runtime.GOOS {
	case "darwin":
		if h, err := os.UserHomeDir(); err == nil {
			base := filepath.Join(h, "Library", "Application Support")
			out = append(out, Profile{"Google Chrome", filepath.Join(base, "Google", "Chrome")},
				Profile{"Microsoft Edge", filepath.Join(base, "Microsoft Edge")},
				Profile{"Brave", filepath.Join(base, "BraveSoftware", "Brave-Browser")},
				Profile{"Cốc Cốc", filepath.Join(base, "CocCoc", "Browser")})
		}
	case "windows":
		if base := os.Getenv("LOCALAPPDATA"); base != "" {
			out = append(out, Profile{"Google Chrome", filepath.Join(base, "Google", "Chrome", "User Data")},
				Profile{"Microsoft Edge", filepath.Join(base, "Microsoft", "Edge", "User Data")},
				Profile{"Brave", filepath.Join(base, "BraveSoftware", "Brave-Browser", "User Data")},
				Profile{"Cốc Cốc", filepath.Join(base, "CocCoc", "Browser", "User Data")})
		}
	}
	if appProfile != "" {
		out = append(out, Profile{"Chrome của app", appProfile})
	}
	return out
}

// DownloadPrompts – tên các trình duyệt đang bật "hỏi nơi lưu mỗi tệp" ở profile dùng gần nhất. Không cài / đọc lỗi
// thì bỏ qua (không chắc thì không cảnh báo).
func DownloadPrompts(ps []Profile, read func(string) ([]byte, error)) []string {
	out := []string{}
	for _, p := range ps {
		if promptsDownload(p.Dir, read) {
			out = append(out, p.Browser)
		}
	}
	return out
}

func promptsDownload(dir string, read func(string) ([]byte, error)) bool {
	name := "Default"
	if b, err := read(filepath.Join(dir, "Local State")); err == nil {
		var ls struct {
			Profile struct {
				LastUsed string `json:"last_used"`
			} `json:"profile"`
		}
		if json.Unmarshal(b, &ls) == nil && ls.Profile.LastUsed != "" {
			name = ls.Profile.LastUsed
		}
	}
	b, err := read(filepath.Join(dir, name, "Preferences"))
	if err != nil {
		return false
	}
	var pref struct {
		Download struct {
			Prompt bool `json:"prompt_for_download"`
		} `json:"download"`
	}
	return json.Unmarshal(b, &pref) == nil && pref.Download.Prompt
}
