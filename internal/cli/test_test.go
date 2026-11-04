package cli

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/batch"
)

func TestParseTest(t *testing.T) {
	req, err := ParseTest([]string{"test", "a.json", "mau:go-chu", "--samples", "--level=2", "--set", "M1=Lan", "--preset", "Bộ 1"})
	if err != nil {
		t.Fatal(err)
	}
	abs, _ := filepath.Abs("a.json")
	if len(req.Targets) != 2 || req.Targets[0] != abs || req.Targets[1] != "mau:go-chu" || !req.Samples || req.Level != 2 || req.Values["M1"] != "Lan" || req.Preset != "Bộ 1" {
		t.Fatalf("%+v", req)
	}
	for _, bad := range [][]string{{"test"}, {"test", "a", "--level", "4"}, {"test", "a", "--set", "x"}, {"test", "a", "--lạ"}} {
		if _, err := ParseTest(bad); err == nil || errors.Is(err, errHelp) {
			t.Errorf("%v phải lỗi", bad)
		}
	}
	if !IsCommand([]string{"test"}) {
		t.Error("IsCommand test")
	}
}

// batchApp – app giả cho lượt: lần hỏi đầu còn chạy, lần sau xong với một dòng lỗi.
func batchApp(t *testing.T, rows []batch.Row, state string) *httptest.Server {
	t.Helper()
	polls := 0
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte(`{"ok":true}`)) })
	mux.HandleFunc("POST /batch", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"batchId":"b1","names":["a","mau:go-chu"]}`))
	})
	mux.HandleFunc("GET /batch", func(w http.ResponseWriter, _ *http.Request) {
		polls++
		st := batch.Status{ID: "b1", State: batch.StateRunning, Total: len(rows), Rows: rows[:1]}
		if polls > 1 {
			st.State, st.Rows = state, rows
		}
		json.NewEncoder(w).Encode(st)
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func TestTestTable(t *testing.T) {
	rows := []batch.Row{{Name: "a", State: batch.RowSuccess, Ms: 1200}, {Name: "mau:go-chu", State: batch.RowFail, Code: "not_found", Node: "n3", Error: "không thấy chữ", Ms: 5000}}
	c := clientFor(batchApp(t, rows, batch.StateDone))
	c.poll = time.Millisecond
	var out, errOut bytes.Buffer
	code := c.Test(batch.Request{Targets: []string{"/a"}}, &out, &errOut)
	want := []string{"Chạy 2 kịch bản", "✓ a           1.2 s", "✗ mau:go-chu  5.0 s  not_found n3 – không thấy chữ", "Qua 1/2 · lỗi 1"}
	for _, w := range want {
		if !strings.Contains(out.String(), w) {
			t.Errorf("thiếu %q trong\n%s", w, out.String())
		}
	}
	if code != ExitFail || strings.Count(out.String(), "✓ a") != 1 {
		t.Errorf("mã %d / in trùng dòng:\n%s", code, out.String())
	}

	ok := []batch.Row{{Name: "a", State: batch.RowSuccess}, {Name: "b", State: batch.RowSuccess}}
	c = clientFor(batchApp(t, ok, batch.StateDone))
	c.poll = time.Millisecond
	if code := c.Test(batch.Request{Targets: []string{"/a"}}, &out, &errOut); code != ExitOK {
		t.Errorf("mọi kịch bản qua phải mã 0: %d", code)
	}
}
