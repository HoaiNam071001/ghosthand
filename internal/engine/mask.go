package engine

import (
	"slices"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/secrets"
)

// Che giá trị bí mật (bước 43 S10): mọi thứ rời engine (kết quả node → nhật ký, lịch sử chạy, event, lỗi trả AI) đi
// qua masker. Bảng tra biến nội bộ (runVars) giữ nguyên giá trị thật để node sau vẫn dùng được.

const maskText = "••••"

// minSecretLen – bí mật ngắn hơn không che (che "1" hay "ab" sẽ phá nát mọi chữ khác); ô nhập Cài đặt cũng chặn ngắn hơn.
const minSecretLen = secrets.MinLen

type masker struct{ vals []string }

func newMasker(secrets map[string]string) *masker {
	m := &masker{}
	for _, v := range secrets {
		if len(v) >= minSecretLen {
			m.vals = append(m.vals, v)
		}
	}
	// dài trước: bí mật là phần đầu của bí mật khác thì không để lại đuôi
	slices.SortFunc(m.vals, func(a, b string) int { return len(b) - len(a) })
	return m
}

func (m *masker) str(s string) string {
	if m == nil {
		return s
	}
	for _, v := range m.vals {
		if strings.Contains(s, v) {
			s = strings.ReplaceAll(s, v, maskText)
		}
	}
	return s
}

func (m *masker) value(v any) any {
	if m == nil || len(m.vals) == 0 {
		return v
	}
	switch x := v.(type) {
	case string:
		return m.str(x)
	case []string:
		out := make([]string, len(x))
		for i, s := range x {
			out[i] = m.str(s)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = m.value(e)
		}
		return out
	case []map[string]any:
		out := make([]map[string]any, len(x))
		for i, e := range x {
			out[i] = m.dict(e)
		}
		return out
	case map[string]any:
		return m.dict(x)
	case map[string]string:
		out := make(map[string]string, len(x))
		for k, s := range x {
			out[k] = m.str(s)
		}
		return out
	}
	return v
}

func (m *masker) dict(d map[string]any) map[string]any {
	if d == nil {
		return nil
	}
	out := make(map[string]any, len(d))
	for k, v := range d {
		out[k] = m.value(v)
	}
	return out
}

// result trả bản sao kết quả đã che; không có bí mật nào thì trả nguyên.
func (m *masker) result(r model.StepResult) model.StepResult {
	if m == nil || len(m.vals) == 0 {
		return r
	}
	r.Output, r.Changes = m.dict(r.Output), m.dict(r.Changes)
	if r.Error != nil {
		er := *r.Error
		er.Message, er.Detail = m.str(er.Message), m.dict(er.Detail)
		r.Error = &er
	}
	if r.Logs != nil {
		r.Logs = slices.Clone(r.Logs)
		for i := range r.Logs {
			r.Logs[i].Msg = m.str(r.Logs[i].Msg)
		}
	}
	return r
}
