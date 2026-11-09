package store

import (
	"strings"
	"testing"
)

func TestSyncSettingsCheck(t *testing.T) {
	ok := []SyncSettings{{}, {IntervalMin: 5}, {IntervalMin: SyncMaxInterval}, {Device: "MAY-VAN-PHONG"}}
	for _, c := range ok {
		if err := c.Check(); err != nil {
			t.Errorf("%+v phải hợp lệ: %v", c, err)
		}
	}
	bad := []SyncSettings{{IntervalMin: 1}, {IntervalMin: -3}, {IntervalMin: SyncMaxInterval + 1}, {Device: "a/b"}, {Device: "máy (2)"}, {Device: strings.Repeat("x", 41)}}
	for _, c := range bad {
		if c.Check() == nil {
			t.Errorf("%+v phải bị từ chối", c)
		}
	}
}

func TestSyncDeviceNameFallsBack(t *testing.T) {
	if got := (SyncSettings{Device: "  Máy A "}).DeviceName(); got != "Máy A" {
		t.Errorf("tên máy: %q", got)
	}
	if (SyncSettings{}).DeviceName() == "" {
		t.Error("không đặt tên thì phải lấy tên máy tính, không được rỗng")
	}
}

// Cài đặt kéo từ cloud chỉ đổi phần mang đi; phần riêng máy (kể cả Sync của chính máy này) giữ nguyên.
func TestApplyPortableKeepsSyncConfig(t *testing.T) {
	s := defaultSettings()
	s.Sync = SyncSettings{Scripts: true, Secrets: true, IntervalMin: 30}
	b, _ := Settings{Theme: ThemeDark}.EncodePortable()
	got, err := s.ApplyPortable(b)
	if err != nil {
		t.Fatal(err)
	}
	if got.Theme != ThemeDark || got.Sync != s.Sync {
		t.Fatalf("theme %q, sync %+v", got.Theme, got.Sync)
	}
}

func TestSyncCheckBackend(t *testing.T) {
	if err := (SyncSettings{Backend: "dropbox"}).Check(); err == nil {
		t.Error("nơi đồng bộ lạ phải bị từ chối")
	}
	if err := (SyncSettings{Backend: SyncBackendMCP}).Check(); err == nil {
		t.Error("backend mcp thiếu ánh xạ phải bị từ chối")
	}
	ok := SyncSettings{Backend: SyncBackendMCP}
	ok.MCP.Server, ok.MCP.Root, ok.MCP.ReadTool, ok.MCP.WriteTool, ok.MCP.PathArg, ok.MCP.ContentArg = "fs", "/x", "r", "w", "path", "content"
	if err := ok.Check(); err != nil || !ok.UsesMCP() {
		t.Errorf("ánh xạ đủ phải hợp lệ: %v", err)
	}
}
