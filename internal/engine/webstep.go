package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Node web (bước 25d): tìm phần tử qua web.Browser (DOM), bấm bằng chuột thật như node click.

// errNoBrowserOpt – engine không có trình duyệt (Options.Browser nil).
var errNoBrowserOpt = &web.BrowserError{Msg: "lần chạy này không điều khiển trình duyệt"}

// webQuery – query tìm theo các dòng selector đã thay biến (dòng trống bỏ qua; đã kiểm tra ở ValidateScript), kèm dòng
// gốc để báo lại. click: sắp bấm / lăn chuột vào phần tử (cuộn tới, chưa tính khi bị che, tab lên trước – chạy nền
// thì không đưa lên).
func webQuery(s model.Step, sels []string, click bool) (web.Query, []string, error) {
	q := web.Query{Tab: s.Tab, Scroll: click, Background: s.WebBackground, Scope: s.WebScope, Occurrence: s.Occurrence}
	var lines []string
	for _, line := range sels {
		if strings.TrimSpace(line) == "" {
			continue
		}
		sel, err := model.ParseSelector(line) // biến thay vào có thể làm trống giá trị
		if err != nil {
			return q, nil, &invalidErr{err.Error()}
		}
		q.Selectors = append(q.Selectors, sel)
		lines = append(lines, strings.TrimSpace(line))
	}
	return q, lines, nil
}

// webTry – kết quả lần tìm cuối của webFind: phần tử + (webClick) điểm bấm đầu đã thử hover, lý do hover chưa ổn.
type webTry struct {
	web.Found
	ok    bool
	at    model.Point
	hover string
}

// webFind chờ phần tử theo s.Selectors (click: như webQuery) – webWait chờ mất thì chờ tới khi mất.
func (e *Engine) webFind(ctx context.Context, s model.Step, click bool) (webTry, []string, error) {
	q, lines, err := webQuery(s, s.Selectors, click)
	if err != nil {
		return webTry{}, nil, err
	}
	q.CheckOnly = s.Type == model.StepWebWait && s.WebGone
	return e.webFindQ(ctx, s, q, lines, click)
}

// webFindQ chờ tới khi phần tử của q hiện (CheckOnly + WebGone: mất) hoặc hết TimeoutMs. aim (q.Scroll): thấy rồi còn
// phải thử hover điểm bấm đầu (tâm + Dx / Dy + lệch ngẫu nhiên) – trang chưa nhận đúng thì tìm lại (D2).
func (e *Engine) webFindQ(ctx context.Context, s model.Step, q web.Query, lines []string, aim bool) (webTry, []string, error) {
	if e.browser == nil {
		return webTry{}, nil, errNoBrowserOpt
	}
	var last webTry
	_, err := e.waitLoop(ctx, s, "web", func() (bool, int, error) {
		var err error
		last, err = e.webTryOnce(ctx, s, q, aim)
		return last.ok, 0, err
	})
	if errors.Is(err, errTimeout) {
		gone := q.CheckOnly && s.WebGone
		var near []web.OutlineItem
		if !gone && last.Selector < 0 && !last.NoTab { // không selector nào khớp: đọc trang một lần, gửi chỗ gần giống
			if o, err := e.browser.PageOutline(ctx, s.Tab); err == nil {
				near = outlineNear(o, q.Selectors)
			}
		}
		return last, lines, &notFoundErr{msg: webMissMsg(s, last, lines, gone), detail: webMiss(last, lines, near, e.lastPageCheck(last.Tab))}
	}
	return last, lines, err
}

// webTryOnce – một lần tìm (+ thử hover khi aim); ok = đủ điều kiện dừng chờ.
func (e *Engine) webTryOnce(ctx context.Context, s model.Step, q web.Query, aim bool) (webTry, error) {
	f, err := e.browser.Find(ctx, q)
	if err != nil {
		return webTry{}, err
	}
	t := webTry{Found: f}
	switch {
	case q.CheckOnly && s.WebGone:
		t.ok = !f.OK && !f.Loading && !f.NoTab
	case !f.OK || !aim:
		t.ok = f.OK
	case q.Background: // chạy nền: bấm qua CDP đúng toạ độ trang – không có chuột thật để thử hover
		t.at, t.ok = e.aimPoint(s, f.Rect), true
	default:
		t.at = e.aimPoint(s, f.Rect)
		h, err := e.browser.Hover(ctx, t.at.X, t.at.Y, !q.Viewport && inRect(t.at, f.Rect))
		t.ok, t.hover = h.OK, h.Miss
		if err != nil {
			return t, err
		}
	}
	return t, nil
}

// aimPoint – điểm bấm: tâm khung + Dx / Dy + lệch ngẫu nhiên.
func (e *Engine) aimPoint(s model.Step, r model.Rect) model.Point {
	c := hit{Box: r}.center()
	c = e.aim(model.Point{X: c.X + s.Dx, Y: c.Y + s.Dy}, r, s.Dx, s.Dy)
	return model.Point{X: e.jitter(c.X, s.JitterPx), Y: e.jitter(c.Y, s.JitterPx)}
}

func inRect(p model.Point, r model.Rect) bool {
	return p.X >= r.X && p.Y >= r.Y && p.X < r.X+r.W && p.Y < r.Y+r.H
}

// webMissMsg – vì sao hết giờ: không có tab, bị che, đang ẩn, đang chạy hiệu ứng, chuột chưa vào đúng chỗ, hay không có.
func webMissMsg(s model.Step, f webTry, lines []string, gone bool) string {
	after := "sau " + fmtSeconds(s.TimeoutMs)
	if gone {
		return fmt.Sprintf("phần tử “%s” vẫn còn %s", lines[max(f.Selector, 0)], after)
	}
	switch {
	case f.NoTab:
		return fmt.Sprintf("không thấy tab nào có id hoặc URL / tiêu đề chứa “%s” %s (id tab đổi khi Chrome của app mở lại – kịch bản lưu nên ghi chuỗi trong URL)", s.Tab, after)
	case f.NoDialog:
		return fmt.Sprintf("chỉ tìm trong hộp thoại (webScope dialog) nhưng trang không có hộp thoại nào đang mở %s", after)
	case f.Selector < 0 && s.Occurrence > 1 && maxShown(f.Counts) > 0:
		return fmt.Sprintf("“%s” chỉ có %d phần tử đang hiện, không có chỗ thứ %d %s", strings.Join(lines, "”, “"), maxShown(f.Counts), s.Occurrence, after)
	case f.OK && f.hover != "":
		return fmt.Sprintf("thấy phần tử “%s” nhưng chưa bấm được: %s %s", lines[f.Selector], f.hover, after)
	case f.Covered != "":
		return fmt.Sprintf("thấy phần tử “%s” nhưng bị %s che %s", lines[f.Selector], f.Covered, after)
	case f.Moving:
		return fmt.Sprintf("thấy phần tử “%s” nhưng nó vẫn đang di chuyển (hiệu ứng / trang đang dàn lại) %s", lines[f.Selector], after)
	case f.Selector >= 0:
		return fmt.Sprintf("thấy phần tử “%s” nhưng chưa bấm được (nằm ngoài khung trang) %s", lines[f.Selector], after)
	case f.Hidden > 0:
		return fmt.Sprintf("có %d phần tử khớp “%s” nhưng đang ẩn %s", f.Hidden, strings.Join(lines, "”, “"), after)
	}
	return fmt.Sprintf("không thấy phần tử “%s” %s (tab %s)", strings.Join(lines, "”, “"), after, f.Tab)
}

// maxShown – số phần tử đang hiện nhiều nhất của một selector (báo khi chỗ thứ N vượt quá).
func maxShown(cs []web.SelCount) int {
	n := 0
	for _, c := range cs {
		n = max(n, c.Shown)
	}
	return n
}

func webOutput(f web.Found, lines []string) map[string]any {
	c := hit{Box: f.Rect}.center()
	return map[string]any{"x": c.X, "y": c.Y, "w": f.Rect.W, "h": f.Rect.H, "text": f.Text, "selector": lines[f.Selector]}
}

func (e *Engine) webWait(ctx context.Context, s model.Step) (map[string]any, error) {
	f, lines, err := e.webFind(ctx, s, false)
	if err != nil || s.WebGone {
		return nil, err
	}
	return webOutput(f.Found, lines), nil
}

// webClick click Clicks lần vào tâm phần tử (+ Dx / Dy); lần đầu đúng điểm đã thử hover.
func (e *Engine) webClick(ctx context.Context, s model.Step) (map[string]any, error) {
	f, lines, err := e.webFind(ctx, s, true)
	if err != nil {
		return nil, err
	}
	out := webOutput(f.Found, lines)
	n := max(s.Clicks, 1)
	for i := 0; i < n; i++ {
		if err := e.gate.wait(ctx); err != nil {
			return nil, err
		}
		at := f.at
		if i > 0 {
			at = e.aimPoint(s, f.Rect)
		}
		if err := e.webPress(ctx, s, at, s.Button, i+1); err != nil {
			return nil, err
		}
		out["clickX"], out["clickY"] = at.X, at.Y
		if i < n-1 {
			if err := Sleep(ctx, e.jitterMs(s.ClickInterval, s.JitterMs)); err != nil {
				return nil, err
			}
		}
	}
	return out, nil
}

// webPress – một lần bấm của node web: chuột thật, hoặc qua CDP khi chạy nền (nth = lần bấm thứ mấy – double-click).
func (e *Engine) webPress(ctx context.Context, s model.Step, at model.Point, button string, nth int) error {
	if s.WebBackground {
		return e.browser.BgClick(ctx, at.X, at.Y, button, nth)
	}
	if err := e.move(ctx, at.X, at.Y, 0); err != nil {
		return err
	}
	return e.click(ctx, button, false)
}

// openInBrowser – node Mở với WebBrowser: mở bằng Chrome của app.
func (e *Engine) openInBrowser(ctx context.Context, url string) error {
	if e.browser == nil {
		return errNoBrowserOpt
	}
	return e.browser.Open(ctx, url)
}

// pageChecker – trình duyệt nhớ kết quả Thử trang (web.Chrome); bản giả không cần cài.
type pageChecker interface {
	LastCheck(tabURL string) (web.PageCheck, bool)
}

func (e *Engine) lastPageCheck(tabURL string) *web.PageCheck {
	pcr, ok := e.browser.(pageChecker)
	if !ok || tabURL == "" {
		return nil
	}
	if pc, ok := pcr.LastCheck(tabURL); ok {
		return &pc
	}
	return nil
}
