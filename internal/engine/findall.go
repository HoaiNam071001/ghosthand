package engine

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Node Tìm tất cả (bước 42 G3): như Chờ ảnh / chữ / phần tử nhưng lấy mọi chỗ khớp – chờ tới khi số chỗ trong
// [MinCount, MaxCount], output count + items (thứ tự đọc) để nối vào Lặp qua danh sách.

// allLook – một lần nhìn: mọi chỗ khớp (toạ độ robotgo, thứ tự đọc); read = chữ / phần tử đọc được khi không thấy chỗ nào.
type allLook func() (hits []hit, read []string, err error)

// allLooker dựng cách nhìn theo FindBy; area = vùng tìm (phần tử không lọc vùng: rỗng).
func (e *Engine) allLooker(s model.Step) (allLook, model.Rect, error) {
	if s.FindBy == model.FindByElement {
		return e.elementAllLooker(s)
	}
	area := e.searchArea(s)
	if err := device.CaptureArea(area, e.displays); err != nil {
		return nil, area, err
	}
	if s.FindBy == model.FindByText {
		return func() ([]hit, []string, error) { return e.textAll(s, area) }, area, nil
	}
	tpl, err := e.template(s) // Thử tìm dựng engine mới mỗi lần – ảnh vừa khoanh lại không bị bản cũ che
	if err != nil {
		return nil, area, &invalidErr{fmt.Sprintf("ảnh mẫu hỏng: %v", err)}
	}
	opt := vision.MatchOptions{Mode: s.MatchMode, ColorTol: s.ColorTol, MinScore: float64(max(s.Threshold, 1)) / 100}
	return func() ([]hit, []string, error) {
		img, err := e.scr.Capture(area)
		if err != nil {
			return nil, nil, err
		}
		ms, k := vision.MatchAll(img, area, tpl, opt, s.TemplateScale, e.scr.DPIScale(area))
		hits := make([]hit, len(ms))
		for i, m := range ms {
			hits[i] = hit{Score: int(math.Round(m.Score * 100)), Box: screenBox(model.Rect{X: m.X, Y: m.Y, W: m.W, H: m.H}, area, k)}
		}
		return hits, nil, nil
	}, area, nil
}

// textAll – mọi chỗ có chữ FindText; text của mỗi chỗ là cả dòng chứa nó (vd tìm "đ" lấy được cả giá "1.234.000 đ").
func (e *Engine) textAll(s model.Step, area model.Rect) ([]hit, []string, error) {
	img, err := e.scr.Capture(area)
	if err != nil {
		return nil, nil, err
	}
	lines, err := e.ocr.ReadText(img)
	if err != nil {
		return nil, nil, err
	}
	k := vision.ImageScale(img, area)
	found := vision.FindText(lines, vision.TextQuery{Text: s.FindText, Exact: s.TextExact, NoAccent: !s.TextAccent})
	if len(found) == 0 {
		return nil, vision.TextLines(lines, 40), nil
	}
	self := e.selfBoxes() // chữ trên thanh mini của app không tính (elementread.go selfBoxes)
	hits := make([]hit, 0, len(found))
	for _, f := range found {
		if b := screenBox(f.Box, area, k); !inBoxes(b, self) {
			hits = append(hits, hit{Box: b, Score: 100, Text: f.Line})
		}
	}
	return hits, nil, nil
}

// elementAllLooker – mọi phần tử khớp đang hiện trên màn (phần tử ngoài khung nhìn không lấy – click không tới).
func (e *Engine) elementAllLooker(s model.Step) (allLook, model.Rect, error) {
	a := e.elementArea(s)
	var area model.Rect
	if a != nil {
		area = *a
	}
	q, err := elementQuery(s.Selectors, !s.TextAccent, 0, a)
	if err != nil {
		return nil, area, err
	}
	return func() ([]hit, []string, error) {
		nodes, err := e.elems.Elements(s.ElementApp)
		if waitable(err) {
			return nil, []string{err.Error()}, nil
		}
		if err != nil {
			return nil, nil, err
		}
		found, _ := element.FindAll(nodes, q)
		var hits []hit
		for _, f := range found {
			if f.Shown() {
				hits = append(hits, elementHit(f.Node))
			}
		}
		if len(hits) == 0 {
			return nil, elementNames(nodes, 40), nil
		}
		return hits, nil, nil
	}, area, nil
}

// countOK – số chỗ thấy nằm trong [MinCount (0 = 1), MaxCount (0 = không giới hạn)].
func countOK(s model.Step, n int) bool {
	return n >= max(s.MinCount, 1) && (s.MaxCount <= 0 || n <= s.MaxCount)
}

func findName(s model.Step) string {
	switch s.FindBy {
	case model.FindByText:
		return fmt.Sprintf("chữ “%s”", s.FindText)
	case model.FindByElement:
		return "phần tử"
	}
	return "ảnh mẫu"
}

func (e *Engine) findAll(ctx context.Context, s model.Step) (map[string]any, error) {
	look, area, err := e.allLooker(s)
	if err != nil {
		return nil, err
	}
	var got []hit
	var read []string
	kind := map[string]string{"": "image", model.FindByText: "text", model.FindByElement: "element"}[s.FindBy]
	_, err = e.waitLoop(ctx, s, kind, func() (bool, int, error) {
		hits, r, err := look()
		if err != nil {
			return false, 0, err
		}
		got, read = hits, r
		return countOK(s, len(hits)), min(100, len(hits)*100/max(s.MinCount, 1)), nil
	})
	if errors.Is(err, errTimeout) {
		fix := ""
		if len(got) == 0 {
			fix = e.elementFix(s)
		}
		return nil, countMiss(s, len(got), read, area, fix)
	}
	if err != nil {
		return nil, err
	}
	items := make([]any, len(got)) // []any: biến in ra JSON (forEach), đọc sâu items.0.x được
	for i, h := range got {
		items[i] = h.output()
	}
	return map[string]any{"count": len(got), "items": items}, nil
}

// countMiss – hết giờ mà số chỗ chưa đạt: detail có count lần nhìn cuối so với minCount / maxCount.
func countMiss(s model.Step, n int, read []string, area model.Rect, fix string) error {
	lo := max(s.MinCount, 1)
	msg := fmt.Sprintf("chỉ thấy %d chỗ %s sau %s (cần ít nhất %d)", n, findName(s), fmtSeconds(s.TimeoutMs), lo)
	if s.MaxCount > 0 && n > s.MaxCount {
		msg = fmt.Sprintf("thấy %d chỗ %s – nhiều hơn tối đa %d", n, findName(s), s.MaxCount)
	}
	if n == 0 && len(read) > 0 {
		msg += readHint(read)
	}
	d := map[string]any{"kind": "findAll", "count": n, "minCount": lo, "area": area}
	if s.MaxCount > 0 {
		d["maxCount"] = s.MaxCount
	}
	if len(read) > 0 {
		d["read"] = read
	}
	if fix != "" {
		d["fix"] = fix
	}
	return &notFoundErr{msg: msg, detail: d}
}

// findAllOnce – Thử tìm của node Tìm tất cả: một lần nhìn, khung mọi chỗ thấy (overlay vẽ kèm số thứ tự).
func (e *Engine) findAllOnce(s model.Step) (FindResult, error) {
	start := time.Now()
	look, area, err := e.allLooker(s)
	if err != nil {
		return FindResult{}, err
	}
	hits, read, err := look()
	if err != nil {
		return FindResult{}, err
	}
	res := FindResult{Found: countOK(s, len(hits)), Count: len(hits), Area: area, Read: read, Ms: int(time.Since(start).Milliseconds())}
	if len(hits) == 0 {
		res.Fix = e.elementFix(s)
	}
	for i, h := range hits {
		res.All = append(res.All, h.Box)
		if i == 0 {
			res.X, res.Y, res.W, res.H = h.Box.X, h.Box.Y, h.Box.W, h.Box.H
		}
		res.Score = max(res.Score, h.Score)
	}
	return res, nil
}
