package api

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/batch"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

type fakeBackend struct {
	quitErr error
	quits   int
	busy    bool
	last    RunRequest
	rev     int
}

func (f *fakeBackend) Run(req RunRequest) (string, error) {
	if f.busy {
		return "", session.ErrBusy
	}
	f.last = req
	return "r1", nil
}
func (f *fakeBackend) Stop(id string) bool { return id == "r1" }
func (f *fakeBackend) Status(id string) (session.Status, error) {
	if id != "" && id != "r1" {
		return session.Status{}, session.ErrNotFound
	}
	return session.Status{RunID: "r1", State: session.StateRunning}, nil
}
func (f *fakeBackend) Wait(context.Context, string) (session.Status, error) {
	return session.Status{RunID: "r1", State: session.StateSuccess}, nil
}
func (f *fakeBackend) ReadScript(string) (model.Script, int, error) {
	return model.NewScript(), f.rev, nil
}
func (f *fakeBackend) WriteScript(path string, _ model.Script, rev int) (int, error) {
	if rev != f.rev {
		return f.rev, &store.ConflictError{Path: path, Have: f.rev, Got: rev}
	}
	f.rev++
	return f.rev, nil
}

func (f *fakeBackend) StartBatch(req batch.Request) (string, []string, error) {
	if len(req.Targets) == 0 {
		return "", nil, errors.New("không có kịch bản nào")
	}
	return "b1", req.Targets, nil
}
func (f *fakeBackend) BatchStatus(id string) (batch.Status, error) {
	if id != "" && id != "b1" {
		return batch.Status{}, session.ErrNotFound
	}
	return batch.Status{ID: "b1", State: batch.StateDone, Total: 1, Rows: []batch.Row{{Name: "a", State: batch.RowSuccess}}}, nil
}
func (f *fakeBackend) StopBatch(id string) bool { return id == "b1" }

func (f *fakeBackend) Quit() error {
	if f.quitErr == nil {
		f.quits++
	}
	return f.quitErr
}

func start(t *testing.T) (*fakeBackend, *Hub, string) {
	t.Helper()
	back, hub := &fakeBackend{}, NewHub()
	l, err := New(back, hub).Listen(0, "tok")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	return back, hub, fmt.Sprintf("http://127.0.0.1:%d", l.Port)
}

func call(t *testing.T, method, url, token string, body any) (int, map[string]any) {
	t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req, _ := http.NewRequest(method, url, rd)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	out := map[string]any{}
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestAuthAndRun(t *testing.T) {
	back, _, base := start(t)
	if code, _ := call(t, "GET", base+"/health", "", nil); code != 200 {
		t.Fatalf("health không cần token: %d", code)
	}
	if code, _ := call(t, "GET", base+"/status", "sai", nil); code != 401 {
		t.Fatalf("sai token phải 401: %d", code)
	}
	code, out := call(t, "POST", base+"/run", "tok", RunRequest{Path: "/a.json", Preset: "Lan", Values: map[string]any{"M1": "x"}})
	if code != 200 || out["runId"] != "r1" || back.last.Preset != "Lan" {
		t.Fatalf("run: %d %v %+v", code, out, back.last)
	}
	if code, out = call(t, "POST", base+"/run", "tok", RunRequest{Path: "/a.json", Wait: true}); code != 200 || out["state"] != "success" {
		t.Fatalf("run wait: %d %v", code, out)
	}
	back.busy = true
	if code, out = call(t, "POST", base+"/run", "tok", RunRequest{Path: "/a.json"}); code != 409 || out["code"] != "busy" {
		t.Fatalf("đang chạy phải 409 busy: %d %v", code, out)
	}
	if code, out = call(t, "POST", base+"/run", "tok", RunRequest{}); code != 400 {
		t.Fatalf("thiếu path: %d %v", code, out)
	}
	if code, out = call(t, "GET", base+"/status?runId=zz", "tok", nil); code != 404 || out["code"] != "not_found" {
		t.Fatalf("runId lạ: %d %v", code, out)
	}
	if _, out = call(t, "POST", base+"/stop", "tok", map[string]string{"runId": "r1"}); out["stopped"] != true {
		t.Fatalf("stop: %v", out)
	}
}

func TestHostGuard(t *testing.T) {
	_, _, base := start(t)
	req, _ := http.NewRequest("GET", base+"/status", nil)
	req.Host = "evil.example:80" // DNS rebinding: trang web trỏ tên miền về 127.0.0.1
	req.Header.Set("Authorization", "Bearer tok")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 403 {
		t.Fatalf("Host lạ phải 403: %d", res.StatusCode)
	}
}

func TestScriptRevision(t *testing.T) {
	_, _, base := start(t)
	if code, out := call(t, "PUT", base+"/script", "tok", map[string]any{"path": "/a.json", "script": model.NewScript(), "revision": 0}); code != 200 || out["revision"] != 1.0 {
		t.Fatalf("ghi đúng revision: %d %v", code, out)
	}
	if code, out := call(t, "PUT", base+"/script", "tok", map[string]any{"path": "/a.json", "script": model.NewScript(), "revision": 0}); code != 409 || out["code"] != "conflict" || out["revision"] != 1.0 {
		t.Fatalf("revision cũ phải 409 conflict: %d %v", code, out)
	}
}

func TestEventsEndAfterRun(t *testing.T) {
	_, hub, base := start(t)
	req, _ := http.NewRequest("GET", base+"/events?runId=r1", nil)
	req.Header.Set("Authorization", "Bearer tok")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	go func() {
		time.Sleep(50 * time.Millisecond)
		hub.Publish("engine:progress", map[string]int{"step": 1})
		hub.Publish("run:ended", session.Status{RunID: "r1", State: session.StateSuccess})
	}()
	var names []string
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() {
		if n, ok := strings.CutPrefix(sc.Text(), "event: "); ok {
			names = append(names, n)
		}
	}
	if strings.Join(names, ",") != "status,engine:progress,run:ended" {
		t.Fatalf("event: %v", names)
	}
}

// 59 U2: thoát êm qua API – cần token; đang chạy / chưa lưu → 409 kèm mã để dev-install báo rõ.
func TestQuit(t *testing.T) {
	back, _, base := start(t)
	if code, _ := call(t, "POST", base+"/quit", "", nil); code != 401 {
		t.Fatalf("quit không token phải 401: %d", code)
	}
	if code, out := call(t, "POST", base+"/quit", "tok", nil); code != 200 || back.quits != 1 {
		t.Fatalf("quit: %d %v", code, out)
	}
	for _, c := range []struct {
		err  error
		code string
	}{{fmt.Errorf("đang chạy: %w", session.ErrBusy), "busy"}, {fmt.Errorf("%w – lưu lại rồi thoát", ErrUnsaved), "unsaved"}} {
		back.quitErr = c.err
		if code, out := call(t, "POST", base+"/quit", "tok", nil); code != 409 || out["code"] != c.code {
			t.Errorf("%v: %d %v", c.err, code, out)
		}
	}
	if _, out := call(t, "GET", base+"/health", "", nil); out["version"] != "dev" {
		t.Errorf("health thiếu version: %v", out)
	}
}

func TestBatch(t *testing.T) {
	_, _, base := start(t)
	if code, out := call(t, "POST", base+"/batch", "tok", batch.Request{Targets: []string{"/a.json"}}); code != 200 || out["batchId"] != "b1" {
		t.Fatalf("%d %v", code, out)
	}
	if code, _ := call(t, "POST", base+"/batch", "tok", batch.Request{}); code != 400 {
		t.Errorf("không có kịch bản: %d", code)
	}
	if code, out := call(t, "GET", base+"/batch?id=b1", "tok", nil); code != 200 || out["state"] != "done" {
		t.Errorf("%d %v", code, out)
	}
	if code, _ := call(t, "GET", base+"/batch?id=zz", "tok", nil); code != 404 {
		t.Errorf("lượt không có: %d", code)
	}
	if _, out := call(t, "POST", base+"/batch/stop", "tok", map[string]string{"batchId": "b1"}); out["stopped"] != true {
		t.Errorf("%v", out)
	}
}
