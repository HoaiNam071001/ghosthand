package mcpclient

import (
	"context"
	"encoding/json"
	"sync"
)

// Manager giữ kết nối theo id server: nối lười lúc gọi lần đầu, dùng lại, nối lại khi đổi cấu hình hoặc kết nối hỏng,
// dọn hết khi app thoát (không để tiến trình con mồ côi).
type Manager struct {
	Dial func(ctx context.Context, c Config) (Client, error) // nil = Dial thật; test thay bản giả

	mu     sync.Mutex
	conns  map[string]*conn
	status map[string]Status // lần Tải lại gần nhất (status.go)
}

type conn struct {
	cfgKey string
	cl     Client
}

func (m *Manager) dial(ctx context.Context, c Config) (Client, error) {
	if m.Dial != nil {
		return m.Dial(ctx, c)
	}
	return Dial(ctx, c)
}

func cfgKey(c Config) string {
	b, _ := json.Marshal(c)
	return string(b)
}

// get trả kết nối đang sống hoặc nối mới.
func (m *Manager) get(ctx context.Context, c Config) (Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.conns == nil {
		m.conns = map[string]*conn{}
	}
	key := cfgKey(c)
	if cur := m.conns[c.ID]; cur != nil {
		if cur.cfgKey == key {
			return cur.cl, nil
		}
		cur.cl.Close() // đổi lệnh / URL / env → bỏ tiến trình cũ
		delete(m.conns, c.ID)
	}
	cl, err := m.dial(ctx, c)
	if err != nil {
		return nil, err
	}
	m.conns[c.ID] = &conn{cfgKey: key, cl: cl}
	return cl, nil
}

// drop bỏ kết nối hỏng để lần gọi sau nối lại. Không tự gọi lại tool: tool ghi có thể đã chạy một nửa.
func (m *Manager) drop(id string, cl Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cur := m.conns[id]; cur != nil && cur.cl == cl {
		delete(m.conns, id)
		cl.Close()
	}
}

// ListTools đọc danh sách tool của server.
func (m *Manager) ListTools(ctx context.Context, c Config) ([]Tool, error) {
	cl, err := m.get(ctx, c)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, CallTimeout)
	defer cancel()
	tools, err := cl.ListTools(ctx)
	if err != nil {
		m.drop(c.ID, cl)
	}
	return tools, err
}

// CallTool gọi một tool. Lỗi kết nối / giao thức → bỏ kết nối; IsError của tool thì giữ nguyên kết nối.
func (m *Manager) CallTool(ctx context.Context, c Config, name string, args map[string]any) (Result, error) {
	cl, err := m.get(ctx, c)
	if err != nil {
		return Result{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, CallTimeout)
	defer cancel()
	res, err := cl.CallTool(ctx, name, args)
	if err != nil {
		m.drop(c.ID, cl)
	}
	return res, err
}

// Disconnect đóng kết nối của một server (tắt / xoá / Tải lại).
func (m *Manager) Disconnect(id string) {
	m.mu.Lock()
	cur := m.conns[id]
	delete(m.conns, id)
	m.mu.Unlock()
	if cur != nil {
		cur.cl.Close()
	}
}

// CloseAll đóng mọi kết nối – gọi khi app thoát.
func (m *Manager) CloseAll() {
	m.mu.Lock()
	all := m.conns
	m.conns = nil
	m.mu.Unlock()
	for _, c := range all {
		c.cl.Close()
	}
}
