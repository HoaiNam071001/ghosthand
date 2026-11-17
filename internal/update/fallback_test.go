package update

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCheckViaWeb(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/"+Repo+"/releases/latest", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/"+Repo+"/releases/tag/v9.0.1", http.StatusFound)
	})
	mux.HandleFunc("/"+Repo+"/releases/expanded_assets/v9.0.1", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<a href="/` + Repo + `/releases/download/v9.0.1/app.zip">x</a><a href="/` + Repo + `/releases/download/v9.0.1/app.zip.sha256">y</a>`))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()
	old := webBase
	webBase = srv.URL
	defer func() { webBase = old }()

	info, err := checkViaWeb(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if info.Latest != "9.0.1" || len(info.Assets) != 2 || info.Assets[1].Name != "app.zip.sha256" {
		t.Fatalf("sai: %+v", info)
	}
}

// Check với base rỗng + API trả 403 phải rơi sang đường web (lỗi thật gặp ở mạng công ty).
func TestCheckFallsBackOn403(t *testing.T) {
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusForbidden) }))
	defer api.Close()
	web := http.NewServeMux()
	web.HandleFunc("/"+Repo+"/releases/latest", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/"+Repo+"/releases/tag/v9.0.1", http.StatusFound)
	})
	web.HandleFunc("/"+Repo+"/releases/expanded_assets/v9.0.1", func(w http.ResponseWriter, r *http.Request) {})
	ws := httptest.NewServer(web)
	defer ws.Close()
	oa, ow := apiBase, webBase
	apiBase, webBase = api.URL, ws.URL
	defer func() { apiBase, webBase = oa, ow }()

	info, err := Check(context.Background(), "")
	if err != nil || info.Latest != "9.0.1" {
		t.Fatalf("info=%+v err=%v", info, err)
	}
}
