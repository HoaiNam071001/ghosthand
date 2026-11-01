package web

import "context"

// Status – trạng thái Chrome của app cho giao diện (D3): đang mở chưa, các tab (tab dùng gần nhất đứng đầu).
type Status struct {
	Open  bool  `json:"open"`
	Login bool  `json:"login"` // đang mở để đăng nhập tài khoản (không cổng điều khiển – login.go)
	Tabs  []Tab `json:"tabs"`
}

type Tab struct {
	ID    string `json:"id"` // id tab – ghim tab cho node web (selector tab nhận id)
	Title string `json:"title"`
	URL   string `json:"url"`
}

// Status không bật trình duyệt – chưa mở thì Open = false.
func (c *Chrome) Status(ctx context.Context) Status {
	c.mu.Lock()
	defer c.mu.Unlock()
	if loggingIn(c.profile) {
		return Status{Login: true, Tabs: []Tab{}}
	}
	port, err := c.connect(ctx)
	if err != nil {
		return Status{Tabs: []Tab{}}
	}
	tabs, err := listTabs(ctx, port)
	if err != nil {
		return Status{Tabs: []Tab{}}
	}
	st := Status{Open: true, Tabs: make([]Tab, 0, len(tabs))}
	for _, t := range tabs {
		st.Tabs = append(st.Tabs, Tab{ID: t.ID, Title: t.Title, URL: t.URL})
	}
	return st
}
