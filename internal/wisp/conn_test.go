package wisp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// fakeWisp – cổng giả: kiểm token, trả lời lệnh theo handle, đẩy một sự kiện sau subscribe.
func fakeWisp(t *testing.T, handle func(cmd string, args map[string]any) (any, *CmdError)) (Info, func(int)) {
	t.Helper()
	conns := make(chan *websocket.Conn, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		ws, err := (&websocket.Upgrader{}).Upgrade(w, r, nil)
		if err != nil {
			return
		}
		conns <- ws
		for {
			var msg struct {
				ID   int64          `json:"id"`
				Cmd  string         `json:"cmd"`
				Args map[string]any `json:"args"`
			}
			if ws.ReadJSON(&msg) != nil {
				return
			}
			res, cerr := handle(msg.Cmd, msg.Args)
			if cerr != nil {
				_ = ws.WriteJSON(map[string]any{"id": msg.ID, "ok": false, "error": cerr})
			} else {
				_ = ws.WriteJSON(map[string]any{"id": msg.ID, "ok": true, "result": res})
			}
			if msg.Cmd == "subscribe" {
				_ = ws.WriteJSON(map[string]any{"event": "dialog", "data": map[string]any{"tab": 2, "type": "alert", "message": "Xin chào"}})
			}
		}
	}))
	t.Cleanup(srv.Close)
	port, _ := strconv.Atoi(srv.URL[strings.LastIndex(srv.URL, ":")+1:])
	closeWith := func(code int) {
		ws := <-conns
		_ = ws.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(code, ""), time.Now().Add(time.Second))
		_ = ws.Close()
	}
	return Info{Port: port, Token: "tok", API: API}, closeWith
}

func TestConnCallAndEvents(t *testing.T) {
	in, closeWith := fakeWisp(t, func(cmd string, args map[string]any) (any, *CmdError) {
		switch cmd {
		case "tabs":
			return []map[string]any{{"id": 2, "url": "https://a/", "active": true}}, nil
		case "click":
			return nil, &CmdError{Code: "covered", Detail: "div che"}
		}
		return map[string]any{}, nil
	})
	ctx := context.Background()
	events := make(chan string, 1)
	c, err := Dial(ctx, in, func(name string, data json.RawMessage) { events <- name + " " + string(data) })
	if err != nil {
		t.Fatal(err)
	}
	var tabs []tabEntry
	if err := c.Call(ctx, "tabs", map[string]any{}, &tabs); err != nil || len(tabs) != 1 || tabs[0].ID != 2 {
		t.Fatalf("tabs: %+v %v", tabs, err)
	}
	if err := c.Call(ctx, "click", map[string]any{}, nil); codeOf(err) != "covered" {
		t.Errorf("lỗi lệnh: %v", err)
	}
	_ = c.Call(ctx, "subscribe", map[string]any{"events": []string{"dialog"}}, nil)
	select {
	case e := <-events:
		if !strings.HasPrefix(e, "dialog ") || !strings.Contains(e, "Xin chào") {
			t.Errorf("sự kiện: %s", e)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("không nhận sự kiện")
	}
	closeWith(closeByUser)
	var ec *ErrClosed
	for i := 0; i < 50 && c.Err() == nil; i++ {
		time.Sleep(20 * time.Millisecond)
	}
	if err := c.Call(ctx, "tabs", nil, nil); !errors.As(err, &ec) || !ec.ByUser {
		t.Errorf("người dùng ngắt (4000): %v", err)
	}
}

func TestDialBadToken(t *testing.T) {
	in, _ := fakeWisp(t, nil)
	in.Token = "sai"
	if _, err := Dial(context.Background(), in, nil); err == nil || !strings.Contains(err.Error(), "token") {
		t.Errorf("token sai: %v", err)
	}
}
