package engine

import (
	"context"
	"fmt"
	"strings"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Node Chờ sự kiện giao diện (bước 43 E2): chờ giao diện đổi so với lúc node bắt đầu – cửa sổ mới, đổi cửa sổ trên
// cùng, phần tử mới hiện (menu, hộp thoại), giá trị phần tử đổi. Đọc lại danh sách cửa sổ / cây accessibility mỗi
// pollMs (không đăng ký AXObserver / UIA event: cùng kết quả, chạy chung đường đọc đã có và test được bằng bản giả),
// nhẹ hơn chụp màn liên tục vì không so ảnh.

func (e *Engine) waitUIEvent(ctx context.Context, s model.Step) (map[string]any, error) {
	switch s.UIEvent {
	case model.UIEventNewElement, model.UIEventValueChange:
		return e.waitElementEvent(ctx, s)
	case "", model.UIEventNewWindow, model.UIEventFocus:
		return e.waitWindowEvent(ctx, s)
	}
	return nil, &invalidErr{fmt.Sprintf("sự kiện không hợp lệ: %q", s.UIEvent)}
}

// waitWindowEvent – newWindow: có id cửa sổ khớp mà lúc đầu chưa có; focus: cửa sổ trên cùng (không thu nhỏ) khớp
// bộ lọc và khác cửa sổ trên cùng lúc đầu.
func (e *Engine) waitWindowEvent(ctx context.Context, s model.Step) (map[string]any, error) {
	wins, err := e.wins.List()
	if err != nil {
		return nil, err
	}
	seen := map[uint64]bool{}
	for _, w := range wins {
		seen[w.ID] = true
	}
	_, topID := topWindow(wins)
	focus := s.UIEvent == model.UIEventFocus
	var got model.WindowInfo
	err = e.pollUntil(ctx, s, "window", func() (bool, error) {
		cur, err := e.wins.List()
		if err != nil {
			return false, err
		}
		if focus {
			top, id := topWindow(cur)
			if id == 0 || id == topID {
				return false, nil
			}
			ok, err := windowMatches(top, s)
			got = top
			return ok, err
		}
		for _, w := range cur {
			if seen[w.ID] {
				continue
			}
			if ok, err := windowMatches(w, s); err != nil || ok {
				got = w
				return ok, err
			}
		}
		return false, nil
	}, func() error {
		what := "cửa sổ mới " + windowName(s)
		if focus {
			what = "cửa sổ trên cùng đổi sang " + windowName(s)
		}
		cur, _ := e.wins.List()
		return &timeoutErr{msg: fmt.Sprintf("không thấy %s sau %s", what, fmtSeconds(s.TimeoutMs)), detail: windowMiss(s, cur)}
	})
	if err != nil {
		return nil, err
	}
	out := e.windowOutput(got)
	out["event"] = s.UIEvent
	return out, nil
}

// topWindow – cửa sổ trên cùng (foreground: bỏ thu nhỏ + cửa sổ của app); id 0 = không có.
func topWindow(wins []model.WindowInfo) (model.WindowInfo, uint64) {
	w, _ := foreground(wins)
	return w, w.ID
}

func windowMatches(w model.WindowInfo, s model.Step) (bool, error) {
	i, err := model.MatchWindow([]model.WindowInfo{w}, s.WinApp, s.WinTitle, s.WinMatch)
	if err != nil {
		return false, &invalidErr{err.Error()}
	}
	return i == 0, nil
}

// waitElementEvent – newElement: phần tử khớp selector nằm ngoài tập phần tử lúc đầu; valueChange: giá trị phần tử
// khớp selector khác lúc đầu (lúc đầu chưa thấy phần tử → coi giá trị cũ là rỗng).
func (e *Engine) waitElementEvent(ctx context.Context, s model.Step) (map[string]any, error) {
	q, err := elementQuery(s.Selectors, !s.TextAccent, s.Occurrence, nil)
	if err != nil {
		return nil, err
	}
	base, err := e.elems.Elements(s.ElementApp)
	if err != nil && !waitable(err) {
		return nil, err
	}
	known := map[string]int{}
	for _, n := range base {
		known[nodeKey(n)]++
	}
	valueEvent := s.UIEvent == model.UIEventValueChange
	was := ""
	if r := element.Find(base, q); r.Found {
		was = nodeValue(r.Hit.Node)
	}
	var got element.Node
	var last []element.Node
	err = e.pollUntil(ctx, s, "element", func() (bool, error) {
		nodes, err := e.elems.Elements(s.ElementApp)
		if err != nil && waitable(err) {
			return false, nil // cửa sổ đang đóng / chưa mở – chờ tiếp
		} else if err != nil {
			return false, err
		}
		last = nodes
		if valueEvent {
			r := element.Find(nodes, q)
			got = r.Hit.Node
			return r.Found && nodeValue(got) != was, nil
		}
		fresh := newNodes(nodes, known)
		if r := element.Find(fresh, q); r.Found {
			got = r.Hit.Node
			return true, nil
		}
		return false, nil
	}, func() error {
		what := "phần tử mới"
		if valueEvent {
			what = "giá trị đổi ở"
		}
		return &timeoutErr{msg: fmt.Sprintf("không thấy %s %s sau %s", what, strings.Join(s.Selectors, " / "), fmtSeconds(s.TimeoutMs)),
			detail: map[string]any{"kind": "element", "selectors": s.Selectors, "read": len(last)}}
	})
	if err != nil {
		return nil, err
	}
	b := got.Box
	return map[string]any{"event": s.UIEvent, "role": got.Role, "text": got.Text(), "value": got.Value, "x": b.X + b.W/2, "y": b.Y + b.H/2,
		"w": b.W, "h": b.H, "left": b.X, "top": b.Y}, nil
}

// newNodes – phần tử của nodes không có (hoặc nhiều hơn số lượng) trong known: so theo vai trò + chữ, không tính giá trị.
func newNodes(nodes []element.Node, known map[string]int) []element.Node {
	left := make(map[string]int, len(known))
	for k, v := range known {
		left[k] = v
	}
	var out []element.Node
	for _, n := range nodes {
		k := nodeKey(n)
		if left[k] > 0 {
			left[k]--
			continue
		}
		out = append(out, n)
	}
	return out
}

func nodeKey(n element.Node) string { return n.Raw + "|" + n.Role + "|" + n.Title + "|" + n.Desc }

// nodeValue – thứ đổi thì coi là "giá trị đổi": giá trị, không có thì tên.
func nodeValue(n element.Node) string {
	if n.Value != "" {
		return n.Value
	}
	return n.Name()
}
