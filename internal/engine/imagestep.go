package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/vision"
)

// Engine cho chờ ảnh / click theo ảnh / chờ pixel (bước 25).

// WaitProgress – đang chờ (event engine:progress, trường wait): thanh mini vẽ vòng tiến độ theo thời gian chờ.
type WaitProgress struct {
	Kind      string `json:"kind"` // image | text | pixel | web | cond | time (chờ đến giờ) | window | app | tab | screen (chờ màn hình)
	ElapsedMs int64  `json:"elapsedMs"`
	TimeoutMs int64  `json:"timeoutMs"`
	Best      int    `json:"best"` // % khớp tốt nhất tới giờ (pixel: 100 = đúng màu)
}

// searchArea: vùng tìm ảnh theo toạ độ robotgo – vùng của kịch bản, hoặc cả màn chứa vùng đó (không có vùng: màn chính).
func (e *Engine) searchArea(s model.Step) model.Rect {
	b := script.Bounds(e.sc, e.screen)
	if s.SearchArea != "screen" {
		return b
	}
	cx, cy := b.X+b.W/2, b.Y+b.H/2
	for _, d := range e.displays {
		if cx >= d.X && cx < d.X+d.W && cy >= d.Y && cy < d.Y+d.H {
			return d
		}
	}
	if e.screen.W > 0 {
		return e.screen
	}
	return b
}

// waitLoop gọi check mỗi IntervalMs tới khi check trả true, hết TimeoutMs (không tính lúc tạm dừng) hoặc bị huỷ.
// check trả thêm độ khớp 0..100 để báo tiến độ.
func (e *Engine) waitLoop(ctx context.Context, s model.Step, kind string, check func() (bool, int, error)) (best int, err error) {
	start, paused0, first := time.Now(), e.gate.pausedTotal(), true
	defer e.update(true, func(p *Progress) { p.Wait = nil })
	for {
		if err := e.gate.wait(ctx); err != nil {
			return best, err
		}
		ok, score, err := check()
		if err != nil {
			return best, err
		}
		best = max(best, score)
		if ok {
			return best, nil
		}
		elapsed := time.Since(start) - (e.gate.pausedTotal() - paused0)
		e.update(first, func(p *Progress) { // lần đầu báo ngay để thanh mini hiện "đang tìm"
			p.Wait = &WaitProgress{Kind: kind, ElapsedMs: elapsed.Milliseconds(), TimeoutMs: int64(s.TimeoutMs), Best: best}
		})
		first = false
		left := time.Duration(s.TimeoutMs)*time.Millisecond - elapsed
		if left <= 0 {
			return best, errTimeout
		}
		if err := Sleep(ctx, int(min(time.Duration(s.IntervalMs)*time.Millisecond, left).Milliseconds())); err != nil {
			return best, err
		}
	}
}

var errTimeout = errors.New("hết giờ")

// hit – chỗ thấy ảnh / chữ (toạ độ robotgo): output của node chờ ảnh / chữ, node click theo ảnh lấy lại qua ImageFrom.
type hit struct {
	Box   model.Rect
	Score int    // % khớp (tìm theo chữ: 100)
	Text  string // tìm theo chữ: dòng chứa chữ; phần tử: chữ / giá trị đọc ra
	Role  string // phần tử: vai trò (button, link…)
}

func (h hit) center() model.Point { return model.Point{X: h.Box.X + h.Box.W/2, Y: h.Box.Y + h.Box.H/2} }

func (h hit) output() map[string]any {
	c := h.center()
	out := map[string]any{"x": c.X, "y": c.Y, "w": h.Box.W, "h": h.Box.H, "score": h.Score}
	if h.Text != "" {
		out["text"] = h.Text
	}
	if h.Role != "" {
		out["role"] = h.Role
	}
	return out
}

// findImage chờ tới khi thấy ảnh mẫu (hoặc chữ / phần tử theo FindBy); trả chỗ thấy.
func (e *Engine) findImage(ctx context.Context, s model.Step) (hit, error) {
	if s.FindBy == model.FindByElement {
		return e.findElementStep(ctx, s, s.Type == model.StepClickImage)
	}
	area := e.searchArea(s)
	if err := device.CaptureArea(area, e.displays); err != nil {
		return hit{}, err
	}
	if s.FindBy == model.FindByText {
		return e.findTextStep(ctx, s, area)
	}
	if s.FindBy == model.FindByAI {
		return e.findAIStep(ctx, s, area)
	}
	tpl, err := e.template(s)
	if err != nil {
		return hit{}, err
	}
	var at hit
	var miss FindResult // chỗ giống nhất tới giờ – hết giờ thì báo lại
	_, err = e.waitLoop(ctx, s, "image", func() (bool, int, error) {
		img, err := e.scr.Capture(area)
		if err != nil {
			return false, 0, err
		}
		r := matchImage(img, area, tpl, s, e.scr.DPIScale(area))
		if r.Score >= miss.Score {
			miss = r
		}
		if !r.Found {
			return false, r.Score, nil
		}
		at = hit{Score: r.Score, Box: model.Rect{X: r.X, Y: r.Y, W: r.W, H: r.H}}
		return true, r.Score, nil
	})
	if errors.Is(err, errTimeout) {
		e.miss = &miss
		return hit{}, &notFoundErr{msg: fmt.Sprintf("không thấy ảnh mẫu sau %s (%s)", fmtSeconds(s.TimeoutMs), imageMissMsg(miss, s)), detail: imageMiss(miss, s)}
	}
	if err != nil {
		return hit{}, err
	}
	return at, nil
}

// findTextStep chờ tới khi đọc được chữ s.FindText trong vùng; trả khung chữ (toạ độ robotgo).
func (e *Engine) findTextStep(ctx context.Context, s model.Step, area model.Rect) (hit, error) {
	var at hit
	var read []vision.TextLine
	_, err := e.waitLoop(ctx, s, "text", func() (bool, int, error) {
		box, lines, ok, err := locateText(e.scr, e.ocr, area, s)
		if err != nil {
			return false, 0, err
		}
		if !ok {
			read = lines
			return false, 0, nil
		}
		at = hit{Box: box, Score: 100, Text: s.FindText}
		return true, 100, nil
	})
	if errors.Is(err, errTimeout) {
		e.miss = &FindResult{Area: area, Read: vision.TextLines(read, 40)}
		return hit{}, &notFoundErr{msg: fmt.Sprintf("không thấy chữ “%s” sau %s%s", s.FindText, fmtSeconds(s.TimeoutMs), readHint(e.miss.Read)), detail: textMiss(s.FindText, read, area)}
	}
	if err != nil {
		return hit{}, err
	}
	return at, nil
}

// locateText chụp vùng, đọc chữ, tìm theo s; hit theo toạ độ robotgo. Không thấy → trả các dòng đọc được.
// read: ≤ 40 dòng, khung theo toạ độ màn hình (báo lỗi / detail).
func locateText(scr device.Screen, ocr device.TextReader, area model.Rect, s model.Step) (hit model.Rect, read []vision.TextLine, ok bool, err error) {
	img, err := scr.Capture(area)
	if err != nil {
		return model.Rect{}, nil, false, err
	}
	lines, err := ocr.ReadText(img)
	if err != nil {
		return model.Rect{}, nil, false, err
	}
	hits := vision.FindText(lines, vision.TextQuery{Text: s.FindText, Exact: s.TextExact, NoAccent: !s.TextAccent})
	n := max(s.Occurrence, 1)
	k := vision.ImageScale(img, area)
	if len(hits) < n {
		read = vision.ReadLines(lines, 40)
		for i := range read {
			read[i].Box, read[i].Words = screenBox(read[i].Box, area, k), nil
		}
		return model.Rect{}, read, false, nil
	}
	return screenBox(hits[n-1].Box, area, k), nil, true, nil
}

// readHint – vài dòng đọc được, gợi ý vì sao không khớp (sai dấu, chữ khác…).
func readHint(read []string) string {
	if len(read) == 0 {
		return " (không đọc được chữ nào trong vùng)"
	}
	show := read[:min(len(read), 5)]
	return fmt.Sprintf(" – đọc được: “%s”%s", strings.Join(show, "”, “"), map[bool]string{true: "…", false: ""}[len(read) > 5])
}

// clickImage click vào chỗ thấy (+ Dx / Dy): chỗ node ImageFrom thấy lần gần nhất trong vòng, hoặc tự tìm ảnh / chữ.
// Output: chỗ đã click, kèm chỗ thấy khi tự tìm.
func (e *Engine) clickImage(ctx context.Context, s model.Step) (map[string]any, error) {
	var out map[string]any
	var p model.Point
	var box model.Rect // cỡ chỗ thấy – điểm bấm giống người + thời gian di chuột
	if s.ImageSource == model.ImageFromSearch {
		h, err := e.findImage(ctx, s)
		if err != nil {
			return nil, err
		}
		out, p, box = h.output(), h.center(), h.Box
	} else {
		c, b, err := e.nodeBox(s.ImageFrom)
		if err != nil {
			return nil, err
		}
		out, p, box = map[string]any{}, c, b
	}
	at := e.aim(model.Point{X: p.X + s.Dx, Y: p.Y + s.Dy}, box, s.Dx, s.Dy)
	x, y := e.jitter(at.X, s.JitterPx), e.jitter(at.Y, s.JitterPx)
	if err := e.move(ctx, x, y, min(box.W, box.H)); err != nil {
		return nil, err
	}
	if err := e.click(ctx, s.Button, false); err != nil {
		return nil, err
	}
	out["clickX"], out["clickY"] = x, y
	return out, nil
}

// waitPixel chờ tới khi điểm Points[0] có màu Color (mỗi kênh lệch ≤ Tolerance); trả màu đọc được.
func (e *Engine) waitPixel(ctx context.Context, s model.Step) (string, error) {
	want, err := vision.ParseColor(s.Color)
	if err != nil {
		return "", err
	}
	p, err := e.pointAt(s, s.Points[0])
	if err != nil {
		return "", err
	}
	var last string
	_, err = e.waitLoop(ctx, s, "pixel", func() (bool, int, error) {
		c, err := e.scr.Pixel(p.X, p.Y)
		if err != nil {
			return false, 0, err
		}
		last = vision.HexColor(c)
		d := vision.ColorDiff(c, want)
		return d <= s.Tolerance, 100 - d*100/255, nil
	})
	if errors.Is(err, errTimeout) {
		return "", &notFoundErr{msg: fmt.Sprintf("điểm X %d Y %d vẫn màu %s sau %s (cần %s ± %d)", p.X, p.Y, last, fmtSeconds(s.TimeoutMs), s.Color, s.Tolerance), detail: pixelMiss(p, last, s.Color, s.Tolerance)}
	}
	return last, err
}

func fmtSeconds(ms int) string {
	if ms%1000 == 0 {
		return fmt.Sprintf("%d s", ms/1000)
	}
	return fmt.Sprintf("%.1f s", float64(ms)/1000)
}
