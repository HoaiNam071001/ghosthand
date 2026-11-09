package cloudtest

import (
	"errors"
	"os"
	"sync"

	"ghosthand/internal/cloud"
)

// MemLocal – phía máy trong bộ nhớ (cloud.Local).
type MemLocal struct {
	mu sync.Mutex
	F  map[string][]byte
}

func NewLocal(files map[string]string) *MemLocal {
	m := &MemLocal{F: map[string][]byte{}}
	for p, c := range files {
		m.F[p] = []byte(c)
	}
	return m
}

func (m *MemLocal) Hashes() (map[string]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := map[string]string{}
	for p, b := range m.F {
		out[p] = cloud.Hash(b)
	}
	return out, nil
}

func (m *MemLocal) Read(p string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.F[p]
	if !ok {
		return nil, os.ErrNotExist
	}
	return b, nil
}

func (m *MemLocal) Write(p string, b []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.F[p] = append([]byte(nil), b...)
	return nil
}

func (m *MemLocal) Remove(p string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.F[p]; !ok {
		return errors.New("không có " + p)
	}
	delete(m.F, p)
	return nil
}

// Str – nội dung file dạng chữ ("" nếu không có).
func (m *MemLocal) Str(p string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return string(m.F[p])
}
