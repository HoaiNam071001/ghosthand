package mcpsrv

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSyncStatusReadOnlyAndNoLeak(t *testing.T) {
	cs, f := connect(t)
	f.sync = SyncInfo{On: true, Backend: "mcp", LoggedIn: true, LastAt: "2026-11-09T10:00:00Z", Failed: true, Conflicts: 2}
	out, isErr := call(t, cs, "sync_status", nil)
	b, _ := json.Marshal(out)
	txt := string(b)
	if isErr {
		t.Fatalf("lỗi: %s", txt)
	}
	for _, want := range []string{`"on":true`, `"backend":"mcp"`, `"failed":true`, `"conflicts":2`} {
		if !strings.Contains(txt, want) {
			t.Errorf("thiếu %s trong %s", want, txt)
		}
	}
}

// AI không có đường nào bật / đăng nhập / giải bí mật: không tool nào tên sync_* ngoài sync_status.
func TestNoSyncControlTools(t *testing.T) {
	cs, _ := connect(t)
	tl, err := cs.ListTools(t.Context(), nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, tool := range tl.Tools {
		n := strings.ToLower(tool.Name)
		if (strings.Contains(n, "sync") || strings.Contains(n, "cloud") || strings.Contains(n, "passphrase")) && tool.Name != "sync_status" {
			t.Errorf("tool %q cho AI điều khiển đồng bộ – chỉ được có sync_status (chỉ đọc)", tool.Name)
		}
		if tool.Name == "sync_status" && (tool.Annotations == nil || !tool.Annotations.ReadOnlyHint) {
			t.Error("sync_status phải khai readOnlyHint")
		}
	}
}
