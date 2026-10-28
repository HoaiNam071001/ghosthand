// Package aitest – nhà cung cấp AI giả cho test (không ra mạng).
package aitest

import (
	"context"
	"sync"

	"ghosthand/internal/ai"
)

// Fake trả Reply (hoặc Err) và nhớ các câu hỏi đã nhận.
type Fake struct {
	Reply string
	Err   error
	mu    sync.Mutex
	Asked []ai.Request
	Cfgs  []ai.Config
}

func (f *Fake) Ask(_ context.Context, r ai.Request) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Asked = append(f.Asked, r)
	return f.Reply, f.Err
}

// Factory dùng cho engine.Options.AI: ghi lại Config nhận được.
func (f *Fake) Factory(c ai.Config) (ai.Provider, error) {
	f.mu.Lock()
	f.Cfgs = append(f.Cfgs, c)
	f.mu.Unlock()
	return f, nil
}
