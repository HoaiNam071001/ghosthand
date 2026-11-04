package batch

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// RowLine – một dòng bảng CLI: "✓ go-chu  3.2 s" / "✗ cho-anh  5.1 s  not_found n4 – không thấy ảnh…"; width = cột tên.
func RowLine(r Row, width int) string {
	mark := map[string]string{RowSuccess: "✓", RowFail: "✗"}[r.State]
	if mark == "" {
		mark = "■"
	}
	line := fmt.Sprintf("%s %s%s  %s", mark, r.Name, strings.Repeat(" ", max(width-utf8.RuneCountInString(r.Name), 0)), fmtMs(r.Ms))
	if r.State == RowSuccess {
		return line
	}
	what := strings.TrimSpace(strings.Join([]string{r.Code, r.Node}, " "))
	if r.State == RowStopped && what == "" {
		what = "đã dừng"
	}
	if r.Error != "" {
		what += " – " + r.Error
	}
	return line + "  " + what
}

// Summary – dòng cuối: "Qua 40/42 · lỗi 2 · 3 phút 10 s" (+ "· đã dừng").
func Summary(s Status) string {
	fail := s.Failed()
	out := fmt.Sprintf("Qua %d/%d · lỗi %d · %s", len(s.Rows)-fail, s.Total, fail, fmtMs(s.Ms))
	if s.State == StateStopped {
		out += fmt.Sprintf(" · đã dừng (%d kịch bản chưa chạy)", s.Total-len(s.Rows))
	}
	return out
}

// NameWidth – độ rộng cột tên cho items (tối đa 40 ký tự để dòng không quá dài).
func NameWidth(names []string) int {
	w := 0
	for _, n := range names {
		w = max(w, utf8.RuneCountInString(n))
	}
	return min(w, 40)
}

func fmtMs(ms int64) string {
	if ms < 60_000 {
		return fmt.Sprintf("%.1f s", float64(ms)/1000)
	}
	return fmt.Sprintf("%d phút %d s", ms/60_000, ms%60_000/1000)
}
