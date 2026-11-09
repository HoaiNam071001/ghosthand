package cloud

import (
	"fmt"
	"strings"
)

// SettingsLocal – cài đặt mang đi được (settings.json trên cloud). Nhận hàm thay vì import store để cloud không phụ thuộc store.
type SettingsLocal struct {
	Export func() ([]byte, error) // bản mang đi dạng JSON ổn định
	Import func([]byte) error     // ghi phần mang đi vào cài đặt máy
}

func (l SettingsLocal) Hashes() (map[string]string, error) {
	b, err := l.Export()
	if err != nil {
		return nil, err
	}
	return map[string]string{SettingsPath: Hash(b)}, nil
}

func (l SettingsLocal) Read(p string) ([]byte, error) {
	if p != SettingsPath {
		return nil, fmt.Errorf("không phải cài đặt: %s", p)
	}
	return l.Export()
}

func (l SettingsLocal) Write(p string, b []byte) error {
	if p != SettingsPath {
		return fmt.Errorf("không phải cài đặt: %s", p)
	}
	return l.Import(b)
}

// Cài đặt luôn có ở máy: cloud xoá thì máy giữ nguyên (lượt sau đẩy lại).
func (l SettingsLocal) Remove(string) error { return nil }

// route – đường dẫn thuộc nguồn nào.
type route struct {
	prefixes []string // tiền tố hoặc đường dẫn đầy đủ
	local    Local
}

// Multi ghép nhiều nguồn thành một Local, định tuyến theo đường dẫn cloud.
type Multi struct{ routes []route }

// Add gắn nguồn cho các đường dẫn bắt đầu bằng một trong prefixes (đường dẫn đầy đủ cũng được).
func (m *Multi) Add(l Local, prefixes ...string) { m.routes = append(m.routes, route{prefixes, l}) }

func (m *Multi) pick(p string) (Local, error) {
	for _, r := range m.routes {
		for _, pre := range r.prefixes {
			if strings.HasPrefix(p, pre) {
				return r.local, nil
			}
		}
	}
	return nil, fmt.Errorf("không có nguồn cho %s (phạm vi đồng bộ đang tắt?)", p)
}

func (m *Multi) Hashes() (map[string]string, error) {
	out := map[string]string{}
	for _, r := range m.routes {
		h, err := r.local.Hashes()
		if err != nil {
			return nil, err
		}
		for k, v := range h {
			out[k] = v
		}
	}
	return out, nil
}

func (m *Multi) Read(p string) ([]byte, error) {
	l, err := m.pick(p)
	if err != nil {
		return nil, err
	}
	return l.Read(p)
}

func (m *Multi) Write(p string, b []byte) error {
	l, err := m.pick(p)
	if err != nil {
		return err
	}
	return l.Write(p, b)
}

func (m *Multi) Remove(p string) error {
	l, err := m.pick(p)
	if err != nil {
		return err
	}
	return l.Remove(p)
}
