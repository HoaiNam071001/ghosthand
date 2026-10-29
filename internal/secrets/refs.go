package secrets

import (
	"regexp"
	"slices"
	"strings"
)

var refRe = regexp.MustCompile(`\{\{\s*secret\.([A-Za-z][A-Za-z0-9_]*)\s*\}\}`)

// Refs – tên các {{secret.<tên>}} trong các chuỗi, sắp theo chữ cái, không trùng.
func Refs(strs ...string) []string {
	var out []string
	for _, s := range strs {
		for _, m := range refRe.FindAllStringSubmatch(s, -1) {
			if !slices.Contains(out, m[1]) {
				out = append(out, m[1])
			}
		}
	}
	slices.Sort(out)
	return out
}

// Expand thay {{secret.<tên>}} bằng giá trị trong vals (tên không có trong vals để nguyên).
func Expand(s string, vals map[string]string) string {
	return refRe.ReplaceAllStringFunc(s, func(m string) string {
		if v, ok := vals[refRe.FindStringSubmatch(m)[1]]; ok {
			return v
		}
		return m
	})
}

// Redact che mọi giá trị bí mật (từ MinLen ký tự) trong chữ – dùng cho lời báo lỗi trước khi cho người dùng xem.
func Redact(s string, vals map[string]string) string {
	for _, v := range vals {
		if len(v) >= MinLen {
			s = strings.ReplaceAll(s, v, "•••")
		}
	}
	return s
}
