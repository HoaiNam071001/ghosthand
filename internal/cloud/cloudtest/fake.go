// Package cloudtest – Provider giả trong bộ nhớ cho test của cloud và các gói dùng nó.
package cloudtest

import (
	"context"
	"strconv"
	"sync"

	"ghosthand/internal/cloud"
)

// Fake – kho trong bộ nhớ; FailPut khác nil thì Put gọi nó trước (giả lỗi mạng / máy khác ghi xen).
type Fake struct {
	mu      sync.Mutex
	files   map[string][]byte
	ver     map[string]int
	FailPut func(path string) error
	Puts    []string // đường dẫn đã Put thành công (kiểm tra chỉ đẩy file đổi)
}

func New() *Fake { return &Fake{files: map[string][]byte{}, ver: map[string]int{}} }

func (f *Fake) Get(_ context.Context, path string) ([]byte, string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	b, ok := f.files[path]
	if !ok {
		return nil, "", cloud.ErrNotFound
	}
	return append([]byte(nil), b...), strconv.Itoa(f.ver[path]), nil
}

func (f *Fake) Put(_ context.Context, path string, data []byte, ifMatch string) (string, error) {
	// hook chạy ngoài khoá: test cho "máy khác" ghi xen vào từ trong hook
	if hook := f.FailPut; hook != nil {
		if err := hook(path); err != nil {
			return "", err
		}
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	_, exists := f.files[path]
	switch {
	case ifMatch == cloud.IfAny:
	case ifMatch == "" && exists, ifMatch != "" && (!exists || ifMatch != strconv.Itoa(f.ver[path])):
		return "", cloud.ErrPrecondition
	}
	f.files[path] = append([]byte(nil), data...)
	f.ver[path]++
	f.Puts = append(f.Puts, path)
	return strconv.Itoa(f.ver[path]), nil
}

func (f *Fake) Delete(_ context.Context, path string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.files, path)
	delete(f.ver, path)
	return nil
}

// Has / Raw – đọc nhanh trong test.
func (f *Fake) Has(path string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.files[path]
	return ok
}

func (f *Fake) Raw(path string) []byte {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.files[path]
}
