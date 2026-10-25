package update

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNewer(t *testing.T) {
	cases := []struct {
		cur, latest string
		want        bool
	}{
		{"1.0.0", "1.0.1", true},
		{"1.2.9", "1.2.10", true},
		{"1.2.0", "v1.10.0", true},
		{"1.0.0", "1.0.0", false},
		{"2.0.0", "1.9.9", false},
		{"1.0", "1.0.1", true},
		{"dev", "1.0.0", false},
		{"1.0.0", "", false},
		{"1.0.0", "abc", false},
		{"1.0.0-rc1", "1.0.1", true},
	}
	for _, c := range cases {
		if got := Newer(c.cur, c.latest); got != c.want {
			t.Errorf("Newer(%q, %q) = %v, muốn %v", c.cur, c.latest, got, c.want)
		}
	}
}

func TestCheck(t *testing.T) {
	old := Version
	Version = "1.0.0"
	defer func() { Version = old }()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/"+Repo+"/releases/latest" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte(`{"tag_name":"v1.1.0","html_url":"https://github.com/x/releases/tag/v1.1.0","body":"` + strings.Repeat("a", 700) + `"}`))
	}))
	defer srv.Close()
	info, err := Check(context.Background(), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if !info.Newer || info.Latest != "1.1.0" || info.Current != "1.0.0" || !strings.HasSuffix(info.Notes, "…") {
		t.Errorf("kết quả sai: %+v", info)
	}

	none := httptest.NewServer(http.NotFoundHandler())
	defer none.Close()
	if _, err := Check(context.Background(), none.URL); err == nil || !strings.Contains(err.Error(), "chưa có bản phát hành") {
		t.Errorf("404 phải báo chưa có bản phát hành: %v", err)
	}
}
