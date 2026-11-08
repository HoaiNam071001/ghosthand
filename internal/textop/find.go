package textop

import (
	"fmt"
	"regexp"
	"strings"
)

// Finder – lọc dòng theo tham số find của công cụ đọc màn hình / trang cho AI (bước 56 B3): đọc cả cây rồi chỉ gửi
// dòng khớp, rẻ token hơn gửi cả cây.
type Finder func(texts ...string) bool

// NewFinder – q dạng /mẫu/ hoặc /mẫu/i = regex (i: không phân biệt hoa thường); còn lại = chứa chuỗi, không phân biệt
// hoa thường và dấu (“dang nhap” khớp “Đăng nhập”). q rỗng → nil (không lọc).
func NewFinder(q string) (Finder, error) {
	q = strings.TrimSpace(q)
	if q == "" {
		return nil, nil
	}
	if pat, flags, ok := regexOf(q); ok {
		if flags == "i" {
			pat = "(?i)" + pat
		}
		re, err := regexp.Compile(pat)
		if err != nil {
			return nil, fmt.Errorf("find: regex sai cú pháp: %v", err)
		}
		return func(texts ...string) bool {
			for _, t := range texts {
				if re.MatchString(t) {
					return true
				}
			}
			return false
		}, nil
	}
	want := fold(q)
	return func(texts ...string) bool {
		for _, t := range texts {
			if strings.Contains(fold(t), want) {
				return true
			}
		}
		return false
	}, nil
}

// regexOf – /mẫu/ hoặc /mẫu/i.
func regexOf(q string) (pat, flags string, ok bool) {
	if len(q) < 3 || q[0] != '/' {
		return "", "", false
	}
	end := strings.LastIndex(q, "/")
	if end <= 0 || (q[end+1:] != "" && q[end+1:] != "i") {
		return "", "", false
	}
	return q[1:end], q[end+1:], true
}

func fold(s string) string { return strings.ToLower(StripAccents(s)) }
