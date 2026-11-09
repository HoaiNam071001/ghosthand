package app

import (
	"testing"

	"ghosthand/internal/store"
)

func TestSameRemote(t *testing.T) {
	drive := store.SyncSettings{}
	mcp := func(server, root string) store.SyncSettings {
		s := store.SyncSettings{Backend: store.SyncBackendMCP}
		s.MCP.Server, s.MCP.Root = server, root
		return s
	}
	cases := []struct {
		a, b store.SyncSettings
		want bool
	}{
		{drive, store.SyncSettings{Backend: store.SyncBackendDrive}, true}, // "" và gdrive là một
		{drive, mcp("fs", "/a"), false},
		{mcp("fs", "/a"), mcp("fs", "/a"), true},
		{mcp("fs", "/a"), mcp("fs", "/b"), false}, // đổi thư mục gốc = kho khác
		{mcp("fs", "/a"), mcp("gd", "/a"), false},
	}
	for i, c := range cases {
		if got := sameRemote(c.a, c.b); got != c.want {
			t.Errorf("ca %d: got %v want %v", i, got, c.want)
		}
	}
}
