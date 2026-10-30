package browser

import "testing"

func TestCleanTabTitle(t *testing.T) {
	for in, want := range map[string]string{
		"Danh mục – Mức sử dụng bộ nhớ – 394 MB":  "Danh mục",
		"GoERP – Mức sử dụng bộ nhớ cao – 1.2 GB": "GoERP",
		"A – B – Memory usage – 261 MB":           "A – B",
		"Báo giá 2024 – bản nháp":                 "Báo giá 2024 – bản nháp",
		"GoERP Admin — PoC":                       "GoERP Admin — PoC",
	} {
		if got := cleanTabTitle(in); got != want {
			t.Errorf("cleanTabTitle(%q) = %q, muốn %q", in, got, want)
		}
	}
}

func TestOmniboxURL(t *testing.T) {
	for in, want := range map[string]string{
		"xanhsm.atlassian.net/wiki/x": "https://xanhsm.atlassian.net/wiki/x",
		"localhost:5173/a":            "http://localhost:5173/a",
		"192.168.1.5:8080":            "http://192.168.1.5:8080",
		"8.8.8.8":                     "https://8.8.8.8",
		"chrome://settings":           "chrome://settings",
		"file:///C:/a.html":           "file:///C:/a.html",
		"C:/Users/an/price-list.html": "file:///C:/Users/an/price-list.html",
		`D:\Tài liệu\a b.html`:        "file:///D:/Tài%20liệu/a%20b.html",
		"http://x.com":                "http://x.com",
		"about:blank":                 "about:blank",
		"":                            "",
		"đang gõ dở":                  "",
	} {
		if got := omniboxURL(in); got != want {
			t.Errorf("omniboxURL(%q) = %q, muốn %q", in, got, want)
		}
	}
}
