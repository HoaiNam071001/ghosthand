package mcpsrv

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (f *fakeBackend) CheckUpdate(context.Context) (UpdateStatus, error) {
	return UpdateStatus{Current: "1.0.0", Latest: "1.1.0", Newer: true, LastError: f.updateErr}, nil
}

func (f *fakeBackend) InstallUpdate(context.Context) (string, error) {
	if f.updateDeny {
		return "", errors.New("người dùng không cho AI cập nhật app")
	}
	f.installs++
	return "1.1.0", nil
}

func callUpdate(t *testing.T, cs *mcp.ClientSession, action string) (string, bool) {
	t.Helper()
	r, err := cs.CallTool(context.Background(), &mcp.CallToolParams{Name: "update_app", Arguments: map[string]any{"action": action}})
	if err != nil {
		t.Fatal(err)
	}
	return r.Content[0].(*mcp.TextContent).Text, r.IsError
}

func TestUpdateApp(t *testing.T) {
	cs, back := connect(t)
	back.updateErr = "sha256 không khớp"
	if text, isErr := callUpdate(t, cs, "check"); isErr || !strings.Contains(text, `"latest":"1.1.0"`) || !strings.Contains(text, "sha256") {
		t.Fatalf("check: %v %s", isErr, text)
	}
	if text, isErr := callUpdate(t, cs, "install"); isErr || back.installs != 1 || !strings.Contains(text, "app_info") {
		t.Fatalf("install: %v %s (installs %d)", isErr, text, back.installs)
	}
	back.updateDeny = true
	if _, isErr := callUpdate(t, cs, "install"); !isErr {
		t.Fatal("bị từ chối phải là lỗi")
	}
	if _, isErr := callUpdate(t, cs, "xoá"); !isErr {
		t.Fatal("action lạ phải là lỗi")
	}
}
