package mcpsrv

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSummarizeArgs(t *testing.T) {
	long := strings.Repeat("a", 300)
	raw, _ := json.Marshal(map[string]any{
		"path": "a.json", "stopAt": "n3", "waitS": 5, "api_key": "sk-123", "password": "hunter2",
		"text": "{{secret.mk}}", "note": long, "image": strings.Repeat("A", 5000),
		"script": map[string]any{"steps": []any{}}, "x": nil,
	})
	got := summarizeArgs(raw)
	for k, want := range map[string]string{"path": "a.json", "stopAt": "n3", "waitS": "5", "api_key": argMaskText,
		"password": argMaskText, "text": "{{secret.mk}}", "script": "(dữ liệu)"} {
		if got[k] != want {
			t.Errorf("%s = %q, muốn %q", k, got[k], want)
		}
	}
	if n := len([]rune(got["note"])); n != argMaxLen+1 {
		t.Errorf("note dài %d", n)
	}
	if !strings.HasPrefix(got["image"], "(chữ dài") {
		t.Errorf("image = %q", got["image"])
	}
	if _, ok := got["x"]; ok {
		t.Error("giá trị null không ghi")
	}
	if summarizeArgs(nil) != nil {
		t.Error("không tham số → nil")
	}
}

func TestCallLogRecordsArgsAndDuration(t *testing.T) {
	cs, _, srv := connectServer(t)
	call(t, cs, "read_script", map[string]any{"path": "nope.json"})
	log := srv.Log()
	if len(log) != 1 {
		t.Fatalf("log %d dòng", len(log))
	}
	c := log[0]
	if c.Tool != "read_script" || c.Args["path"] != "nope.json" || c.Ms < 0 {
		t.Errorf("call = %+v", c)
	}
}
