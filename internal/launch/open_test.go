package launch

import (
	"reflect"
	"runtime"
	"strings"
	"testing"
)

func TestOpenCommand(t *testing.T) {
	cases := []struct {
		goos, target, app string
		name              string
		args              []string
	}{
		{"darwin", "youtube.com/watch?v=1", "", "open", []string{"https://youtube.com/watch?v=1"}},
		{"darwin", "https://a.vn", "Google Chrome", "open", []string{"-a", "Google Chrome", "https://a.vn"}},
		{"darwin", "Spotify", "", "open", []string{"-a", "Spotify"}},
		{"darwin", "spotify:search:tinh", "", "open", []string{"spotify:search:tinh"}},
		{"darwin", "/Applications/Zalo.app", "", "open", []string{"/Applications/Zalo.app"}},
		{"windows", "https://a.vn/?q=1&p=2", "", "powershell", []string{"-NoProfile", "-NonInteractive", "-Command", "Start-Process -FilePath 'https://a.vn/?q=1&p=2'"}},
		{"windows", "a.vn", "Google Chrome", "powershell", []string{"-NoProfile", "-NonInteractive", "-Command", `Start-Process -FilePath 'chrome' -ArgumentList '"https://a.vn"'`}},
		{"windows", `C:\Program Files\O'Brien\x.exe`, "", "powershell", []string{"-NoProfile", "-NonInteractive", "-Command", `Start-Process -FilePath 'C:\Program Files\O''Brien\x.exe'`}},
		{"linux", "a.vn", "", "xdg-open", []string{"https://a.vn"}},
	}
	// file:// có query → qua trình duyệt mặc định (giữ ?…); không query → như thường
	if _, args := openCommand("windows", "file:///C:/a/q.html?ms=1", ""); !strings.Contains(args[3], "UserChoice") ||
		!strings.HasPrefix(args[3], "$u='file:///C:/a/q.html?ms=1';") {
		t.Errorf("file:// có query: %q", args[3])
	}
	if _, args := openCommand("windows", "file:///C:/a/q.html", ""); strings.Contains(args[3], "UserChoice") {
		t.Errorf("file:// không query không cần tìm trình duyệt: %q", args[3])
	}
	for _, c := range cases {
		name, args := openCommand(c.goos, c.target, c.app)
		if name != c.name || !reflect.DeepEqual(args, c.args) {
			t.Errorf("%s %q %q: có %s %q, muốn %s %q", c.goos, c.target, c.app, name, args, c.name, c.args)
		}
	}
}

func TestTargetKind(t *testing.T) {
	for target, want := range map[string]string{
		"facebook.com/abc": TargetURL, "https://x": TargetURL, "mailto:a@b.c": TargetURL, "localhost:3000": TargetURL,
		"/Users/a/x.pdf": TargetPath, `C:\x.exe`: TargetPath, "~/x.pdf": TargetPath,
		"Spotify": TargetApp, "Visual Studio Code": TargetApp,
		"notepad.exe": TargetApp, "Calc.EXE": TargetApp, "devmgmt.msc": TargetApp, "parroto.app": TargetURL,
	} {
		if got := TargetKind(target); got != want {
			t.Errorf("%q: %s, muốn %s", target, got, want)
		}
	}
}

func TestBrowserURL(t *testing.T) {
	cases := map[string]string{
		"youtube.com/watch?v=1":        "https://youtube.com/watch?v=1",
		"file:///tmp/a%20b/x.html":     "file:///tmp/a%20b/x.html",
		"/Users/a/sân thử/index.html":  "file:///Users/a/s%C3%A2n%20th%E1%BB%AD/index.html",
		"Spotify":                      "",
		"https://shop.vn/?q=a&b=2#đơn": "https://shop.vn/?q=a&b=2#đơn",
	}
	if runtime.GOOS == "windows" { // "/Users/…" không có ổ đĩa → Abs gắn ổ hiện tại
		delete(cases, "/Users/a/sân thử/index.html")
		cases[`C:\Users\a\sân thử\index.html`] = "file:///C:/Users/a/s%C3%A2n%20th%E1%BB%AD/index.html"
	}
	for in, want := range cases {
		if got := BrowserURL(in); got != want {
			t.Errorf("BrowserURL(%q) = %q, cần %q", in, got, want)
		}
	}
}
