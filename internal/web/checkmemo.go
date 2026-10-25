package web

import "sync"

// checkMemo nhớ kết quả Thử trang gần nhất theo URL (bước 44): node web lỗi thì engine hỏi lại để AI biết lỗi do
// captcha / canvas chứ không do selector. Khớp đúng URL trước, không có thì lấy cùng host (trang đã chuyển đường dẫn).
type checkMemo struct {
	mu    sync.Mutex
	byURL map[string]PageCheck
}

func (m *checkMemo) put(pc PageCheck) {
	if pc.URL == "" {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.byURL == nil {
		m.byURL = map[string]PageCheck{}
	}
	m.byURL[pc.URL] = pc
}

func (m *checkMemo) lookup(u string) (PageCheck, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if pc, ok := m.byURL[u]; ok {
		return pc, true
	}
	host := hostOf(u)
	if host == "" {
		return PageCheck{}, false
	}
	for k, pc := range m.byURL {
		if hostOf(k) == host {
			return pc, true
		}
	}
	return PageCheck{}, false
}
