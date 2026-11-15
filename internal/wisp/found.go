package wisp

import (
	"strconv"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Hàm thuần đổi dữ liệu giữa web.Query / web.Found của engine và lệnh / kết quả của cổng Wisp (test ở found_test.go).

// rect – khung CSS px theo trang chính.
type rect struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"w"`
	H int `json:"h"`
}

// screenRect – khung trên màn hình: điểm DIP + tỉ lệ màn hình; Offscreen = tab đang không xem.
type screenRect struct {
	rect
	Scale     float64 `json:"scale"`
	Offscreen bool    `json:"offscreen"`
}

// elem – một phần tử Wisp trả (find, click…).
type elem struct {
	Ref        string      `json:"ref"`
	Role       string      `json:"role"`
	Name       string      `json:"name"`
	Text       string      `json:"text"`
	Rect       rect        `json:"rect"`
	InView     bool        `json:"inView"`
	Covered    string      `json:"covered"`
	ScreenRect *screenRect `json:"screenRect"`
}

// findResult – kết quả lệnh find.
type findResult struct {
	SelectorIndex int    `json:"selectorIndex"`
	Found         []elem `json:"found"`
	More          int    `json:"more"`
	Hidden        int    `json:"hidden"`
	NoDialog      bool   `json:"noDialog"`
}

// tabEntry – một dòng lệnh tabs.
type tabEntry struct {
	ID      int    `json:"id"`
	URL     string `json:"url"`
	Title   string `json:"title"`
	Active  bool   `json:"active"`
	Engine  string `json:"engine"`
	Loading bool   `json:"loading"`
}

// SelectorLine – model.Selector → dòng cú pháp chung Ghosthand / Wisp (ngược của model.ParseSelector).
func SelectorLine(s model.Selector) string {
	switch {
	case s.By == model.SelRole && s.Name != "":
		return `role=` + s.Value + `[name="` + s.Name + `"]`
	case s.Exact:
		return s.By + `="` + s.Value + `"`
	}
	return s.By + "=" + s.Value
}

func selectorLines(sels []model.Selector) []string {
	out := make([]string, len(sels))
	for i, s := range sels {
		out[i] = SelectorLine(s)
	}
	return out
}

// pickTab – tab theo bộ lọc như node web: id, URL / tiêu đề chứa (không phân biệt hoa thường); "" = prefer (tab node
// Mở vừa mở) nếu còn, không thì tab đang xem.
func pickTab(tabs []tabEntry, filter string, prefer int) (tabEntry, bool) {
	filter = strings.TrimSpace(filter)
	if filter == "" {
		for _, t := range tabs {
			if prefer != 0 && t.ID == prefer {
				return t, true
			}
		}
		for _, t := range tabs {
			if t.Active {
				return t, true
			}
		}
		if len(tabs) > 0 {
			return tabs[0], true
		}
		return tabEntry{}, false
	}
	if id, err := strconv.Atoi(filter); err == nil {
		for _, t := range tabs {
			if t.ID == id {
				return t, true
			}
		}
	}
	q := strings.ToLower(filter)
	for _, t := range tabs {
		if strings.Contains(strings.ToLower(t.URL), q) {
			return t, true
		}
	}
	for _, t := range tabs {
		if strings.Contains(strings.ToLower(t.Title), q) {
			return t, true
		}
	}
	return tabEntry{}, false
}

// pickElem – phần tử sẽ dùng trong r: chỗ thứ Occurrence (1 = đầu) trong số đang hiện; 0 + sắp bấm = cái đầu nằm
// trong khung nhìn mà không bị che (không có thì cái đầu); -1 = không có.
func pickElem(r findResult, q web.Query) int {
	if len(r.Found) == 0 {
		return -1
	}
	if q.Occurrence > 0 {
		if q.Occurrence > len(r.Found) {
			return -1
		}
		return q.Occurrence - 1
	}
	if q.Scroll {
		for i, e := range r.Found {
			if e.InView && e.Covered == "" {
				return i
			}
		}
	}
	return 0
}

// sameBox – cùng phần tử, khung không đổi giữa hai lần đọc (đứng yên – không đang chạy hiệu ứng).
func sameBox(a, b elem) bool { return a.Ref == b.Ref && a.Rect == b.Rect }

// toFound – kết quả find + phần tử đã chọn (i, -1 = không) → web.Found. screen: khung theo màn hình (Thử tìm vẽ trên
// overlay) thay vì CSS px trong trang; physical: toạ độ màn hình là pixel thật (Windows) – nhân tỉ lệ.
func toFound(r findResult, i int, q web.Query, tabURL string, screen, physical bool) web.Found {
	f := web.Found{Selector: r.SelectorIndex, Tab: tabURL, Hidden: r.Hidden, NoDialog: r.NoDialog}
	if r.SelectorIndex >= 0 {
		f.Count = len(r.Found) + r.More
		f.Counts = make([]web.SelCount, r.SelectorIndex+1)
		f.Counts[r.SelectorIndex] = web.SelCount{Shown: f.Count}
	}
	if i < 0 {
		if r.SelectorIndex >= 0 && q.Occurrence > 0 {
			f.Selector = -1 // không có chỗ thứ N – báo như không thấy (webMissMsg nói số chỗ đang có)
		}
		return f
	}
	e := r.Found[i]
	f.Text = e.Text
	if f.Text == "" {
		f.Text = e.Name
	}
	f.Rect = model.Rect{X: e.Rect.X, Y: e.Rect.Y, W: e.Rect.W, H: e.Rect.H}
	if screen && e.ScreenRect != nil {
		s := e.ScreenRect
		k := 1.0
		if physical && s.Scale > 0 {
			k = s.Scale
		}
		f.Rect = model.Rect{X: int(float64(s.X) * k), Y: int(float64(s.Y) * k), W: int(float64(s.W) * k), H: int(float64(s.H) * k)}
	}
	f.OffView = !e.InView
	f.Covered = e.Covered
	switch {
	case q.CheckOnly || !q.Scroll:
		f.OK = true
	default: // sắp bấm: phải nằm trong khung nhìn (đã cuộn tới) và không bị che
		f.OK = e.InView && e.Covered == ""
	}
	return f
}
