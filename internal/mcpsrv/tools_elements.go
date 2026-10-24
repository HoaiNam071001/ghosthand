package mcpsrv

import (
	"context"
	"fmt"
	"image"
	"strings"
	"sync"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Nhìn màn hình theo phần tử (bước 43 A): cây rút gọn đánh số (describe_screen elements), ảnh đánh số (screenshot marks),
// selector bền cho một số (suggest_selector), so cây trước / sau (screen_changes). AI nói “click #12” → suggest_selector
// trả selector để ghi vào kịch bản, không ghi toạ độ cứng.

// snapshots – lần đọc cây gần nhất (số # → phần tử) và cây “trước” của screen_changes. Một AI dùng một lúc nên giữ một bản.
type snapshots struct {
	mu     sync.Mutex
	app    string
	nodes  []element.Node
	items  []element.Item
	before []element.Node
	bApp   string
	bWins  []string
}

func (s *Server) addElementTools() {
	addTool(s, KindScreen, &mcp.Tool{Name: "suggest_selector", Description: "Gợi ý selector bền cho một phần tử trên màn hình: mark = số #N từ " +
		"describe_screen elements / screenshot marks (lần xem gần nhất), hoặc x + y (toạ độ chuột). Trả vài selector xếp bền → kém, mỗi cái kèm số chỗ khớp " +
		"và occurrence. Ghi vào node: selectors = [selector…], occurrence nếu selector không duy nhất, elementApp = app. Ưu tiên cái duy nhất (unique), tránh toạ độ cứng."}, s.suggestSelector)
	addTool(s, KindScreen, &mcp.Tool{Name: "screen_changes", Description: "So cây phần tử trước / sau để biết thao tác có tác dụng không mà không cần ảnh. " +
		"Gọi action=start (lưu cây hiện tại), làm thao tác (vd run_script only), rồi action=end: trả phần tử mới hiện / mất đi / đổi giá trị + cửa sổ mới / đóng."}, s.screenChanges)
}

// appFor – app cần đọc phần tử: app gửi lên > app của cửa sổ khớp tên > "" (app có cửa sổ trên cùng).
func (s *Server) appFor(window, app string) string {
	if app = strings.TrimSpace(app); app != "" {
		return app
	}
	q := strings.ToLower(strings.TrimSpace(window))
	if q == "" {
		return ""
	}
	if ws, err := s.back.Windows(); err == nil {
		for _, w := range ws {
			if !w.Minimized && (strings.Contains(strings.ToLower(w.Title), q) || strings.Contains(strings.ToLower(w.App), q)) {
				return w.App
			}
		}
	}
	return ""
}

// readItems đọc cây của app, rút gọn, lọc theo vùng (nil = không lọc), đánh số lại 1.. và nhớ làm lần xem gần nhất.
func (s *Server) readItems(app string, area *model.Rect, o element.OutlineOpts) ([]element.Item, int, error) {
	nodes, err := s.back.Elements(app)
	if err != nil {
		return nil, 0, err
	}
	max := o.Max
	if max <= 0 {
		max = 120
	}
	o.Max = 1 << 20
	all, _ := element.Outline(nodes, o)
	var items []element.Item
	omitted := 0
	for _, it := range all {
		if area != nil && !centerIn(it.Box, *area) {
			continue
		}
		if len(items) >= max {
			omitted++
			continue
		}
		it.Mark = len(items) + 1
		items = append(items, it)
	}
	s.snap.mu.Lock()
	s.snap.app, s.snap.nodes, s.snap.items = app, nodes, items
	s.snap.mu.Unlock()
	return items, omitted, nil
}

func centerIn(b, a model.Rect) bool {
	cx, cy := b.X+b.W/2, b.Y+b.H/2
	return cx >= a.X && cy >= a.Y && cx < a.X+a.W && cy < a.Y+a.H
}

// describeElements – describe_screen elements:true.
func (s *Server) describeElements(in describeIn, r model.Rect) (*mcp.CallToolResult, any, error) {
	var area *model.Rect
	if in.Window != "" || in.W > 0 {
		area = &r
	}
	app := s.appFor(in.Window, in.App)
	items, omitted, err := s.readItems(app, area, element.OutlineOpts{Max: in.Max, InteractiveOnly: in.InteractiveOnly})
	if err != nil {
		return fail(fmt.Errorf("%w – describe_screen không elements để đọc bằng OCR", err))
	}
	lines := make([]string, len(items))
	for i, it := range items {
		lines[i] = it.Line()
	}
	out := map[string]any{"app": app, "elements": lines, "next": "suggest_selector {mark: N} để lấy selector bền cho #N"}
	if omitted > 0 {
		out["omittedElements"] = omitted
	}
	if ws, err := s.back.Windows(); err == nil {
		out["windows"] = ws[:min(len(ws), maxWindows)]
	}
	return ok(out)
}

// markImage – screenshot marks:true: vẽ số lên phần tử bấm / gõ được trong vùng r, ghi danh sách vào out.
func (s *Server) markImage(img image.Image, r model.Rect, in areaIn, app string, out map[string]any) (image.Image, error) {
	items, omitted, err := s.readItems(s.appFor(in.Window, app), &r, element.OutlineOpts{InteractiveOnly: true})
	if err != nil {
		return nil, err
	}
	marks := make([]vision.Mark, len(items))
	lines := make([]string, len(items))
	for i, it := range items {
		marks[i], lines[i] = vision.Mark{N: it.Mark, Box: it.Box}, it.Line()
	}
	out["marks"] = lines
	if omitted > 0 {
		out["omittedMarks"] = omitted
	}
	return vision.DrawMarks(img, r, marks), nil
}

type suggestIn struct {
	Mark int    `json:"mark,omitempty" jsonschema:"số #N của lần describe_screen elements / screenshot marks gần nhất"`
	X    int    `json:"x,omitempty" jsonschema:"hoặc toạ độ chuột (đọc lại cây của app)"`
	Y    int    `json:"y,omitempty"`
	App  string `json:"app,omitempty" jsonschema:"với x,y: app cần đọc (bỏ trống = app trên cùng)"`
}

func (s *Server) suggestSelector(_ context.Context, _ *mcp.CallToolRequest, in suggestIn) (*mcp.CallToolResult, any, error) {
	var nodes []element.Node
	var idx int
	var app string
	if in.Mark > 0 {
		s.snap.mu.Lock()
		items, n, a := s.snap.items, s.snap.nodes, s.snap.app
		s.snap.mu.Unlock()
		if in.Mark > len(items) {
			return fail(fmt.Errorf("chưa có #%d – gọi describe_screen elements hoặc screenshot marks trước (đang có %d số)", in.Mark, len(items)))
		}
		nodes, idx, app = n, items[in.Mark-1].Index, a
	} else {
		app = strings.TrimSpace(in.App)
		n, err := s.back.Elements(app)
		if err != nil {
			return fail(err)
		}
		if idx = element.At(n, model.Point{X: in.X, Y: in.Y}); idx < 0 {
			return fail(fmt.Errorf("không có phần tử nào ở (%d,%d)", in.X, in.Y))
		}
		nodes = n
	}
	sg := element.Suggest(nodes, idx)
	n := nodes[idx]
	out := map[string]any{"element": element.Item{Role: n.Role, Name: n.Name(), Box: n.Box}.Line(), "elementApp": app, "suggestions": sg}
	if len(sg) == 0 {
		out["note"] = "phần tử không có chữ / nhãn / vai trò để viết selector – dùng clickImage theo ảnh hoặc toạ độ"
	}
	return ok(out)
}

type changesIn struct {
	Action string `json:"action" jsonschema:"start = lưu cây hiện tại | end = so với lúc start"`
	App    string `json:"app,omitempty" jsonschema:"app cần theo dõi (bỏ trống = app trên cùng lúc gọi)"`
}

func (s *Server) screenChanges(_ context.Context, _ *mcp.CallToolRequest, in changesIn) (*mcp.CallToolResult, any, error) {
	switch in.Action {
	case "start":
		app := strings.TrimSpace(in.App)
		nodes, err := s.back.Elements(app)
		if err != nil {
			return fail(err)
		}
		s.snap.mu.Lock()
		s.snap.before, s.snap.bApp, s.snap.bWins = nodes, app, s.windowTitles()
		s.snap.mu.Unlock()
		return ok(map[string]any{"saved": len(nodes), "next": "làm thao tác rồi screen_changes {action: end}"})
	case "end":
		s.snap.mu.Lock()
		before, app, wins := s.snap.before, s.snap.bApp, s.snap.bWins
		s.snap.mu.Unlock()
		if before == nil {
			return fail(fmt.Errorf("chưa có cây trước – gọi screen_changes action=start trước"))
		}
		if a := strings.TrimSpace(in.App); a != "" {
			app = a
		}
		after, err := s.back.Elements(app)
		if err != nil {
			return fail(err)
		}
		c := element.Diff(before, after)
		out := map[string]any{"changes": c, "same": c.Empty()}
		opened, closed := titleDiff(wins, s.windowTitles())
		if len(opened)+len(closed) > 0 {
			out["windowsOpened"], out["windowsClosed"], out["same"] = opened, closed, false
		}
		return ok(out)
	}
	return fail(fmt.Errorf("action phải là start hoặc end"))
}

func (s *Server) windowTitles() []string {
	ws, err := s.back.Windows()
	if err != nil {
		return nil
	}
	t := make([]string, 0, len(ws))
	for _, w := range ws {
		if !w.Minimized {
			t = append(t, w.App+": "+w.Title)
		}
	}
	return t
}

// titleDiff – tiêu đề cửa sổ mới có / mất đi (so theo tập, cửa sổ trùng tên đếm theo số lượng).
func titleDiff(before, after []string) (opened, closed []string) {
	count := map[string]int{}
	for _, t := range before {
		count[t]++
	}
	for _, t := range after {
		if count[t] > 0 {
			count[t]--
		} else {
			opened = append(opened, t)
		}
	}
	for _, t := range before {
		if count[t] > 0 {
			count[t]--
			closed = append(closed, t)
		}
	}
	return opened, closed
}
