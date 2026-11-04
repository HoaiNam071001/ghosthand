package mcpsrv

import (
	"fmt"
	"reflect"
	"strings"
)

// Output node gửi AI (bước 56 C2): chuỗi dài giữ đầu + cuối (lỗi / kết quả thường ở cuối log, body) kèm số ký tự /
// dòng bỏ; mảng dài (findAll, readTable, HTTP JSON) giữ maxItems phần tử đầu + một dòng báo còn bao nhiêu. Cắt cả trong
// map / mảng lồng nhau. Bản đủ vẫn ở lịch sử chạy và trong biến {{nX.output.…}} của node sau.

const (
	strHead  = 300 // ký tự giữ ở đầu chuỗi dài
	strTail  = 100 // … và ở cuối
	maxItems = 20  // phần tử giữ của mảng dài
	maxDepth = 6   // lồng sâu hơn thì gửi nguyên (không gặp ở output node thật)
)

// trimMap – bản sao output đã cắt (nil giữ nil).
func trimMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	return trimValue(m, 0).(map[string]any)
}

func trimValue(v any, depth int) any {
	if depth > maxDepth || v == nil {
		return v
	}
	switch x := v.(type) {
	case string:
		return trimString(x)
	case []byte:
		return v
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, e := range x {
			out[k] = trimValue(e, depth+1)
		}
		return out
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array {
		return v
	}
	n := rv.Len()
	out := make([]any, 0, min(n, maxItems)+1)
	for i := 0; i < min(n, maxItems); i++ {
		out = append(out, trimValue(rv.Index(i).Interface(), depth+1))
	}
	if n > maxItems {
		out = append(out, fmt.Sprintf("… còn %d mục (đủ ở lịch sử chạy / biến của node sau)", n-maxItems))
	}
	return out
}

// trimString – "đầu…\n… bỏ N ký tự, M dòng …\n…cuối".
func trimString(s string) string {
	r := []rune(s)
	if len(r) <= strHead+strTail+40 { // cắt không bớt được bao nhiêu thì thôi
		return s
	}
	mid := string(r[strHead : len(r)-strTail])
	return fmt.Sprintf("%s\n… bỏ %d ký tự, %d dòng …\n%s", string(r[:strHead]), len(r)-strHead-strTail, strings.Count(mid, "\n"), string(r[len(r)-strTail:]))
}
