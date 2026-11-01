package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Chờ / Click theo phần tử màn hình (bước 37, FindBy element) và điều kiện "thấy phần tử": đọc cây accessibility của
// app (device.ElementReader) mỗi lần xét – phần tử cũ chết khi trang đổi chữ nên không giữ lại giữa các lần.

// settleMs – click: đọc lại sau chừng này để chắc khung đứng yên (trang còn cuộn / chạy hiệu ứng thì bấm trượt).
const settleMs = 120

// elementQuery dựng truy vấn từ node đã thay {{biến}}. Selector sai / không dùng được cho phần tử → invalid_input.
func elementQuery(selectors []string, noAccent bool, occurrence int, area *model.Rect) (element.Query, error) {
	q := element.Query{NoAccent: noAccent, Occurrence: occurrence, Area: area}
	for _, line := range selectors {
		if strings.TrimSpace(line) == "" {
			continue
		}
		sel, err := model.ParseSelector(line)
		if err == nil {
			err = element.CheckSelector(sel)
		}
		if err != nil {
			return q, &invalidErr{err.Error()}
		}
		q.Selectors = append(q.Selectors, sel)
	}
	if len(q.Selectors) == 0 {
		return q, &invalidErr{"chưa nhập cách tìm phần tử"}
	}
	return q, nil
}

// elementArea – chỉ lọc theo vùng khi kịch bản có vùng và node không chọn "cả màn" (phần tử không cần chụp nên
// mặc định tìm khắp cửa sổ app, kể cả màn phụ).
func (e *Engine) elementArea(s model.Step) *model.Rect {
	if e.sc.Region == nil || s.SearchArea == "screen" {
		return nil
	}
	a := e.searchArea(s)
	return &a
}

// waitable – lỗi có thể hết khi chờ thêm: app chưa mở / cửa sổ chưa hiện.
func waitable(err error) bool {
	return errors.Is(err, device.ErrNoWindow) || errors.Is(err, device.ErrAppNotFound)
}

func (e *Engine) lookElement(app string, q element.Query) ([]element.Node, element.Result, error) {
	nodes, err := e.elems.Elements(app)
	if err != nil {
		return nil, element.Result{}, err
	}
	return nodes, element.Find(nodes, q), nil
}

// missWhy – vì sao lần xét này chưa thấy (để báo khi hết giờ).
func missWhy(r element.Result, nodes []element.Node, occurrence int) string {
	if r.Count > 0 {
		return fmt.Sprintf("chỉ thấy %d chỗ (cần chỗ thứ %d)", r.Count, occurrence)
	}
	return fmt.Sprintf("đã đọc %d phần tử, không cái nào khớp", len(nodes))
}

func elementHit(n element.Node) hit {
	return hit{Box: n.Box, Score: 100, Text: n.Text(), Role: n.Role}
}

// findElementStep chờ tới khi thấy phần tử đang hiện; bị kẹp ở mép (ngoài khung nhìn) thì cuộn tới rồi đo lại lần sau.
// settle: đọc lại lần nữa, khung phải đứng yên (click).
func (e *Engine) findElementStep(ctx context.Context, s model.Step, settle bool) (hit, error) {
	q, err := elementQuery(s.Selectors, !s.TextAccent, s.Occurrence, e.elementArea(s))
	if err != nil {
		return hit{}, err
	}
	var at hit
	why, scrolled := "", -1
	var miss func() map[string]any // StepError.Detail của lần chưa thấy cuối – chỉ tính khi hết giờ
	_, err = e.waitLoop(ctx, s, "element", func() (bool, int, error) {
		nodes, r, err := e.lookElement(s.ElementApp, q)
		switch {
		case err != nil && waitable(err):
			why = err.Error()
			return false, 0, nil
		case err != nil:
			return false, 0, err
		case !r.Found:
			why, miss = missWhy(r, nodes, max(s.Occurrence, 1)), func() map[string]any { return elementMiss(s.Selectors, nodes, r, q) }
			return false, 0, nil
		case !r.Hit.Shown():
			why = "phần tử nằm ngoài khung nhìn, cuộn tới không được"
			if scrolled != r.Hit.Index { // mỗi phần tử cuộn một lần – trang không cuộn được thì khỏi lặp
				scrolled = r.Hit.Index
				if err := e.elems.ScrollTo(s.ElementApp, r.Hit.Index); err != nil {
					why = err.Error()
				}
			}
			return false, 0, nil
		}
		if settle {
			if err := Sleep(ctx, settleMs); err != nil {
				return false, 0, err
			}
			_, again, err := e.lookElement(s.ElementApp, q)
			if err != nil || !again.Found || !element.Settled(r.Hit.Box, again.Hit.Box) {
				why = "phần tử còn đang di chuyển"
				return false, 0, nil
			}
			r = again
		}
		at = elementHit(r.Hit.Node)
		return true, 100, nil
	})
	if errors.Is(err, errTimeout) {
		return hit{}, &notFoundErr{msg: fmt.Sprintf("không thấy phần tử %s sau %s – %s", strings.Join(s.Selectors, " / "), fmtSeconds(s.TimeoutMs), why), detail: lazyDetail(miss)}
	}
	return at, err
}

// nameFix – selector sửa khi không thấy vì nhãn có phần hay đổi: so với tên mọi phần tử (không lọc theo độ giống –
// "Messenger, 1 unread" dài gấp đôi "Messenger" nên dưới ngưỡng gần giống).
func nameFix(selectors []string, nodes []element.Node) string {
	names := make([]string, len(nodes))
	for i, n := range nodes {
		names[i] = n.Name()
	}
	return model.SelectorFix(selectors, names)
}

// elementFix – như nameFix cho node Tìm tất cả theo phần tử (đọc lại cây một lần – chỉ khi đã không thấy chỗ nào).
func (e *Engine) elementFix(s model.Step) string {
	if s.FindBy != model.FindByElement {
		return ""
	}
	nodes, err := e.elems.Elements(s.ElementApp)
	if err != nil {
		return ""
	}
	return nameFix(s.Selectors, nodes)
}

// elementNames – vài phần tử có chữ đọc được (gợi ý khi Thử tìm không thấy), bỏ trùng.
func elementNames(nodes []element.Node, n int) []string {
	var out []string
	seen := map[string]bool{}
	for _, nd := range nodes {
		t := strings.TrimSpace(nd.Text())
		if t == "" || nd.Role == "window" || seen[nd.Role+t] {
			continue
		}
		seen[nd.Role+t] = true
		out = append(out, fmt.Sprintf("%s “%s”", nd.Role, t))
		if len(out) == n {
			break
		}
	}
	return out
}

// findElementOnce – nút Thử tìm: đọc cây một lần, không cuộn, không chờ.
func (e *Engine) findElementOnce(s model.Step) (FindResult, error) {
	area := e.elementArea(s)
	q, err := elementQuery(s.Selectors, !s.TextAccent, s.Occurrence, area)
	if err != nil {
		return FindResult{}, err
	}
	start := time.Now()
	nodes, r, err := e.lookElement(s.ElementApp, q)
	if err != nil {
		return FindResult{}, err
	}
	res := FindResult{Found: r.Found, Ms: int(time.Since(start).Milliseconds())}
	if area != nil {
		res.Area = *area
	}
	if !r.Found {
		res.Read = elementNames(nodes, 40)
		res.Fix = nameFix(s.Selectors, nodes)
		return res, nil
	}
	b := r.Hit.Box
	res.Score, res.X, res.Y, res.W, res.H = 100, b.X, b.Y, b.W, b.H
	return res, nil
}

// elementRead – một lần đọc cây của app trong snapshot (lỗi chờ được – chưa có cửa sổ – cũng giữ để báo đúng lý do).
type elementRead struct {
	nodes []element.Node
	err   error
}

// elementCond – điều kiện "thấy phần tử": có trong cây là đúng (không cuộn – xét điều kiện không làm đổi trang).
// Mỗi lần xét đọc cây mỗi app một lần dù nhiều điều kiện.
func (e *Engine) elementCond(c model.Cond, snap *snapshot, part *CondPart) (bool, error) {
	q, err := elementQuery(c.Selectors, !c.TextAccent, c.Occurrence, e.elementArea(c.Probe("")))
	if err != nil {
		return false, err
	}
	read, ok := snap.elems[c.ElementApp]
	if !ok {
		read.nodes, read.err = e.elems.Elements(c.ElementApp)
		if read.err != nil && !waitable(read.err) {
			return false, read.err
		}
		snap.elems[c.ElementApp] = read
	}
	what := strings.Join(c.Selectors, " / ")
	r := element.Find(read.nodes, q)
	if !r.Found {
		why := missWhy(r, read.nodes, max(c.Occurrence, 1))
		if read.err != nil {
			why = read.err.Error()
		}
		part.Detail = fmt.Sprintf("không thấy phần tử %s – %s", what, why)
		return false, nil
	}
	h := elementHit(r.Hit.Node)
	part.Hit, part.Score, part.Text = &h.Box, 100, h.Text
	part.Detail = fmt.Sprintf("thấy %s “%s” tại X %d Y %d", h.Role, h.Text, h.center().X, h.center().Y)
	if !r.Hit.Shown() {
		part.Detail += " (ngoài khung nhìn)"
	}
	return true, nil
}
