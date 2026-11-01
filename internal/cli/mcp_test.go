package cli

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"ghosthand/internal/api"
	"ghosthand/internal/mcpsrv"
	"ghosthand/internal/model"
	"ghosthand/internal/store"
)

// emptyBackend – app không có kịch bản nào (tool chạy / xem màn hình không dùng trong test này – nhúng interface cho đủ kiểu).
type emptyBackend struct {
	mcpsrv.Backend
	dir string
}

func (b emptyBackend) Enabled() bool                   { return true }
func (b emptyBackend) ToolAllowed(string, string) bool { return true }
func (b emptyBackend) Recent() []string                { return nil }
func (b emptyBackend) Editor() mcpsrv.Editor           { return mcpsrv.Editor{} }
func (b emptyBackend) ScriptsDir() (string, error)     { return b.dir, nil }
func (b emptyBackend) ReadScript(string) (model.Script, int, error) {
	return model.Script{}, 0, os.ErrNotExist
}
func (b emptyBackend) WriteScript(string, model.Script, int) (int, error) {
	return 0, errors.New("không ghi")
}
func (b emptyBackend) OpenInApp(string) error     { return nil }
func (b emptyBackend) Displays() []mcpsrv.Display { return nil }

func TestMCPProxy(t *testing.T) {
	srv := api.New(nil, api.NewHub())
	srv.Handle("/mcp", mcpsrv.New(emptyBackend{dir: t.TempDir()}).Handler())
	l, err := srv.Listen(0, "tok")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	c := &Client{Info: func() (store.APIInfo, error) { return store.APIInfo{Port: l.Port, Token: "tok"}, nil }, HTTP: http.DefaultClient,
		Launch: func() error { return errors.New("không được mở") }}

	in := strings.Join([]string{
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}`,
		`{"jsonrpc":"2.0","method":"notifications/initialized"}`,
		`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`,
		`{"jsonrpc":"2.0","id":"x","method":"tools/call","params":{"name":"list_scripts","arguments":{}}}`,
	}, "\n")
	var out, errOut bytes.Buffer
	if code := c.MCP(strings.NewReader(in), &out, &errOut); code != ExitOK {
		t.Fatal(code)
	}
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) != 3 { // notification không có trả lời
		t.Fatalf("stdout:\n%s\nstderr: %s", out.String(), errOut.String())
	}
	var list struct {
		ID     int `json:"id"`
		Result struct{ Tools []struct{ Name string } }
	}
	if err := json.Unmarshal([]byte(lines[1]), &list); err != nil || list.ID != 2 || len(list.Result.Tools) < 8 {
		t.Errorf("tools/list: %s", lines[1])
	}
	if !strings.Contains(lines[2], `"id":"x"`) || !strings.Contains(lines[2], "scripts") {
		t.Errorf("tools/call: %s", lines[2])
	}
}

func TestMCPNoApp(t *testing.T) {
	c := &Client{Info: func() (store.APIInfo, error) { return store.APIInfo{}, os.ErrNotExist }, HTTP: http.DefaultClient,
		Launch: func() error { return nil }, WaitApp: 30 * time.Millisecond, poll: 10 * time.Millisecond}
	var out, errOut bytes.Buffer
	c.MCP(strings.NewReader(`{"jsonrpc":"2.0","id":7,"method":"tools/list"}`+"\n"+`{"jsonrpc":"2.0","method":"notifications/x"}`), &out, &errOut)
	if s := strings.TrimSpace(out.String()); !strings.Contains(s, `"id":7`) || !strings.Contains(s, "không nối được app") || strings.Count(s, "\n") != 0 {
		t.Errorf("không có app → lỗi JSON-RPC cho request, bỏ qua notification: %s", s)
	}
	if !IsMCP([]string{"--mcp"}) || IsMCP([]string{"run"}) {
		t.Error("IsMCP")
	}
}

func TestInitClient(t *testing.T) {
	init := []byte(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"cursor"}}}`)
	if got := initClient(init, ""); got != "cursor" {
		t.Errorf("initialize: %q", got)
	}
	if got := initClient([]byte(`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`), "cursor"); got != "cursor" {
		t.Errorf("dòng khác phải giữ tên cũ: %q", got)
	}
}

// 59 U4: app mở lại giữa phiên (cập nhật – cổng + token mới) → proxy chờ app lên rồi gửi lại, AI không thấy lỗi.
func TestMCPSurvivesRestart(t *testing.T) {
	listen := func(tok string) *api.Listener {
		srv := api.New(nil, api.NewHub())
		srv.Handle("/mcp", mcpsrv.New(emptyBackend{dir: t.TempDir()}).Handler())
		l, err := srv.Listen(0, tok)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { l.Close() })
		return l
	}
	var mu sync.Mutex
	info := store.APIInfo{}
	setInfo := func(i store.APIInfo) { mu.Lock(); info = i; mu.Unlock() }
	l1 := listen("a")
	setInfo(store.APIInfo{Port: l1.Port, Token: "a"})
	c := &Client{Info: func() (store.APIInfo, error) { mu.Lock(); defer mu.Unlock(); return info, nil }, HTTP: http.DefaultClient,
		Launch: func() error { return errors.New("không được mở") }, RestartWait: 5 * time.Second, WaitApp: 50 * time.Millisecond}

	inR, inW := io.Pipe()
	outR, outW := io.Pipe()
	done := make(chan struct{})
	go func() { c.MCP(inR, outW, io.Discard); outW.Close(); close(done) }()
	lines := bufio.NewScanner(outR)
	send := func(msg string) string {
		go inW.Write([]byte(msg + "\n"))
		if !lines.Scan() {
			t.Fatal("không có trả lời")
		}
		return lines.Text()
	}
	if got := send(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`); !strings.Contains(got, "list_scripts") {
		t.Fatalf("trước khi mở lại: %s", got)
	}
	l1.Close()
	setInfo(store.APIInfo{})
	time.AfterFunc(600*time.Millisecond, func() {
		l2 := listen("b")
		setInfo(store.APIInfo{Port: l2.Port, Token: "b"})
	})
	if got := send(`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`); !strings.Contains(got, `"id":2`) || !strings.Contains(got, "list_scripts") {
		t.Fatalf("sau khi mở lại: %s", got)
	}
	inW.Close()
	<-done
}
