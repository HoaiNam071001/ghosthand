package cli

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// 59 U2: quit chờ tới khi /health tắt; app từ chối thì báo lý do + ExitFail; app không mở = xong.
func TestQuit(t *testing.T) {
	var down atomic.Bool
	refuse := false
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		if down.Load() {
			w.WriteHeader(503)
			return
		}
		w.Write([]byte(`{"ok":true}`))
	})
	mux.HandleFunc("POST /quit", func(w http.ResponseWriter, _ *http.Request) {
		if refuse {
			w.WriteHeader(409)
			w.Write([]byte(`{"error":"kịch bản đang chạy – dừng lại rồi thoát","code":"busy"}`))
			return
		}
		w.Write([]byte(`{"quitting":true}`))
		time.AfterFunc(300*time.Millisecond, func() { down.Store(true) })
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := clientFor(srv)

	refuse = true
	var out, errOut bytes.Buffer
	if code := c.Quit(&out, &errOut); code != ExitFail || !strings.Contains(errOut.String(), "đang chạy") {
		t.Fatalf("từ chối: %d %s", code, errOut.String())
	}
	refuse = false
	out.Reset()
	if code := c.Quit(&out, &errOut); code != ExitOK || !strings.Contains(out.String(), "đã thoát") {
		t.Fatalf("thoát: %d %s %s", code, out.String(), errOut.String())
	}
	out.Reset()
	if code := c.Quit(&out, &errOut); code != ExitOK || !strings.Contains(out.String(), "không mở") {
		t.Fatalf("app tắt sẵn: %d %s", code, out.String())
	}
}
