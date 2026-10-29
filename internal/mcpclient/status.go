package mcpclient

import (
	"context"
	"errors"
	"time"
)

// Trạng thái kết nối (Status.State).
const (
	StateIdle  = "idle"  // chưa thử nối
	StateOK    = "ok"    // đã nối, có danh sách tool
	StateError = "error" // lần nối / đọc tool gần nhất lỗi
)

// Status – kết quả lần Tải lại gần nhất của một server; danh sách tool là cache để giao diện không phải nối lại.
type Status struct {
	State string `json:"state"`
	Tools []Tool `json:"tools,omitempty"`
	Code  string `json:"code,omitempty"` // mã lỗi (Code*)
	Err   string `json:"err,omitempty"`
	At    int64  `json:"at,omitempty"` // unix giây
}

// Refresh nối lại từ đầu (bỏ kết nối cũ), đọc danh sách tool và nhớ trạng thái. clean che bí mật khỏi lời báo lỗi (nil = giữ nguyên).
func (m *Manager) Refresh(ctx context.Context, c Config, clean func(string) string) Status {
	m.Disconnect(c.ID)
	tools, err := m.ListTools(ctx, c)
	st := Status{State: StateOK, Tools: tools, At: time.Now().Unix()}
	if err != nil {
		st = Status{State: StateError, Code: CodeConnect, Err: err.Error(), At: st.At}
		var e *Error
		if errors.As(err, &e) {
			st.Code = e.Code
		}
		if clean != nil {
			st.Err = clean(st.Err)
		}
		m.Disconnect(c.ID)
	}
	m.mu.Lock()
	if m.status == nil {
		m.status = map[string]Status{}
	}
	m.status[c.ID] = st
	m.mu.Unlock()
	return st
}

// StatusOf – trạng thái đã nhớ (chưa Tải lại lần nào = idle).
func (m *Manager) StatusOf(id string) Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	if st, ok := m.status[id]; ok {
		return st
	}
	return Status{State: StateIdle}
}

// Forget bỏ kết nối + trạng thái của server (tắt / xoá).
func (m *Manager) Forget(id string) {
	m.Disconnect(id)
	m.mu.Lock()
	delete(m.status, id)
	m.mu.Unlock()
}
