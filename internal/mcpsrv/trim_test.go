package mcpsrv

import (
	"strings"
	"testing"
)

func TestTrimString(t *testing.T) {
	short := strings.Repeat("a", 400)
	if trimString(short) != short {
		t.Error("chuỗi vừa phải giữ nguyên")
	}
	log := strings.Repeat("dòng log\n", 200) + "LỖI: hết bộ nhớ"
	got := trimString(log)
	if !strings.HasPrefix(got, "dòng log") || !strings.HasSuffix(got, "LỖI: hết bộ nhớ") {
		t.Errorf("phải giữ đầu + cuối: %q", got)
	}
	if !strings.Contains(got, "… bỏ ") || !strings.Contains(got, " dòng …") || len([]rune(got)) > 500 {
		t.Errorf("phần bỏ: %q", got)
	}
}

func TestTrimMapNested(t *testing.T) {
	type hit struct{ X, Y int }
	items := make([]hit, 50)
	rows := make([]any, 30)
	for i := range rows {
		rows[i] = map[string]any{"cell": strings.Repeat("x", 1000)}
	}
	out := trimMap(map[string]any{"items": items, "body": map[string]any{"rows": rows}, "count": 50})
	got := out["items"].([]any)
	if len(got) != maxItems+1 || got[maxItems] != "… còn 30 mục (đủ ở lịch sử chạy / biến của node sau)" {
		t.Errorf("mảng dài: %d phần tử, cuối %v", len(got), got[len(got)-1])
	}
	r := out["body"].(map[string]any)["rows"].([]any)
	if cell := r[0].(map[string]any)["cell"].(string); len(cell) > 500 {
		t.Errorf("chuỗi trong map lồng chưa cắt: %d", len(cell))
	}
	if out["count"] != 50 || trimMap(nil) != nil {
		t.Error("giá trị khác / nil giữ nguyên")
	}
	if len(items) != 50 {
		t.Error("không được sửa output gốc")
	}
}
