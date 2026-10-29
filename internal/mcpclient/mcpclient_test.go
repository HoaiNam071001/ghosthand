package mcpclient_test

import (
	"context"
	"strings"
	"testing"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/mcpclient/mcpclienttest"
)

func newMgr(s *mcpclienttest.Server) *mcpclient.Manager { return &mcpclient.Manager{Dial: s.Dial} }

func TestListAndCall(t *testing.T) {
	s := &mcpclienttest.Server{}
	m := newMgr(s)
	defer m.CloseAll()
	cfg := mcpclient.Config{ID: "a", Kind: mcpclient.KindStdio, Command: "x"}
	tools, err := m.ListTools(context.Background(), cfg)
	if err != nil || len(tools) != 2 {
		t.Fatalf("tools=%v err=%v", tools, err)
	}
	var echo mcpclient.Tool
	for _, tl := range tools {
		if tl.Name == "echo" {
			echo = tl
		}
	}
	if !echo.ReadOnly || !strings.Contains(string(echo.InputSchema), "text") {
		t.Errorf("echo=%+v", echo)
	}
	res, err := m.CallTool(context.Background(), cfg, "echo", map[string]any{"text": "xin chào"})
	if err != nil || res.IsError || res.Text() != "xin chào" {
		t.Fatalf("res=%+v err=%v", res, err)
	}
	if s.Dials.Load() != 1 {
		t.Errorf("phải dùng lại kết nối, nối %d lần", s.Dials.Load())
	}
}

func TestToolErrorKeepsConnection(t *testing.T) {
	s := &mcpclienttest.Server{}
	m := newMgr(s)
	defer m.CloseAll()
	cfg := mcpclient.Config{ID: "a", Kind: mcpclient.KindStdio, Command: "x"}
	res, err := m.CallTool(context.Background(), cfg, "boom", map[string]any{"text": ""})
	if err != nil || !res.IsError || res.Text() != "hỏng" {
		t.Fatalf("res=%+v err=%v", res, err)
	}
	m.CallTool(context.Background(), cfg, "boom", map[string]any{"text": ""})
	if s.Dials.Load() != 1 {
		t.Errorf("tool báo lỗi không được làm mất kết nối")
	}
}

func TestProtocolErrorDropsConnection(t *testing.T) {
	s := &mcpclienttest.Server{}
	m := newMgr(s)
	defer m.CloseAll()
	cfg := mcpclient.Config{ID: "a", Kind: mcpclient.KindStdio, Command: "x"}
	_, err := m.CallTool(context.Background(), cfg, "khong-co", nil)
	if e, ok := err.(*mcpclient.Error); !ok || e.Code != mcpclient.CodeCall {
		t.Fatalf("err=%v", err)
	}
	if _, err := m.CallTool(context.Background(), cfg, "echo", map[string]any{"text": "a"}); err != nil {
		t.Fatal(err)
	}
	if s.Dials.Load() != 2 {
		t.Errorf("sau lỗi giao thức phải nối lại, nối %d lần", s.Dials.Load())
	}
}

func TestConfigChangeReconnects(t *testing.T) {
	s := &mcpclienttest.Server{}
	m := newMgr(s)
	defer m.CloseAll()
	cfg := mcpclient.Config{ID: "a", Kind: mcpclient.KindStdio, Command: "x"}
	m.ListTools(context.Background(), cfg)
	cfg.Command = "y"
	m.ListTools(context.Background(), cfg)
	if s.Dials.Load() != 2 {
		t.Errorf("đổi lệnh phải nối lại, nối %d lần", s.Dials.Load())
	}
	m.Disconnect("a")
	m.ListTools(context.Background(), cfg)
	if s.Dials.Load() != 3 {
		t.Errorf("sau Disconnect phải nối lại")
	}
}

func TestValidate(t *testing.T) {
	bad := []mcpclient.Config{
		{Kind: "stdio"},
		{Kind: "http", URL: "ftp://x"},
		{Kind: "lạ"},
	}
	for _, c := range bad {
		if _, err := mcpclient.Dial(context.Background(), c); err == nil {
			t.Errorf("%+v phải lỗi", c)
		} else if e := err.(*mcpclient.Error); e.Code != mcpclient.CodeConfig {
			t.Errorf("%+v mã %s", c, e.Code)
		}
	}
}

// Server stdio thật: lệnh không tồn tại → lỗi nối có cấu trúc, không treo.
func TestStdioMissingCommand(t *testing.T) {
	_, err := mcpclient.Dial(context.Background(), mcpclient.Config{Kind: mcpclient.KindStdio, Command: "ghosthand-khong-co-lenh-nay"})
	e, ok := err.(*mcpclient.Error)
	if !ok || e.Code != mcpclient.CodeConnect {
		t.Fatalf("err=%v", err)
	}
}

func TestRefreshStatus(t *testing.T) {
	s := &mcpclienttest.Server{}
	m := newMgr(s)
	defer m.CloseAll()
	cfg := mcpclient.Config{ID: "a", Kind: mcpclient.KindStdio, Command: "x"}
	if st := m.StatusOf("a"); st.State != mcpclient.StateIdle {
		t.Fatalf("chưa nối: %+v", st)
	}
	st := m.Refresh(context.Background(), cfg, nil)
	if st.State != mcpclient.StateOK || len(st.Tools) != 2 || m.StatusOf("a").State != mcpclient.StateOK {
		t.Fatalf("st=%+v", st)
	}
	m.Refresh(context.Background(), cfg, nil)
	if s.Dials.Load() != 2 {
		t.Errorf("Tải lại phải nối mới, nối %d lần", s.Dials.Load())
	}
	m.Forget("a")
	if m.StatusOf("a").State != mcpclient.StateIdle {
		t.Errorf("Forget phải xoá trạng thái")
	}
}

func TestRefreshErrorRedacted(t *testing.T) {
	m := &mcpclient.Manager{}
	defer m.CloseAll()
	bad := mcpclient.Config{ID: "b", Kind: mcpclient.KindStdio} // thiếu lệnh
	st := m.Refresh(context.Background(), bad, strings.ToUpper)
	if st.State != mcpclient.StateError || st.Code != mcpclient.CodeConfig || st.Err != strings.ToUpper(st.Err) || st.Err == "" {
		t.Fatalf("st=%+v", st)
	}
}
