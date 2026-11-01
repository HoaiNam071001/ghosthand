package engine

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"ghosthand/internal/device"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Node Đọc phần tử (bước 37 E2b + E4): đọc chính phần tử trong cây accessibility, hoặc – khi giá trị không có trong cây
// (canvas, app tự vẽ) – tìm nhãn (phần tử / OCR) rồi OCR chữ bên phải / bên dưới nhãn. Chữ đọc ra qua lọc mẫu / chuẩn
// hoá số; chưa khớp thì chờ đọc lại. ReadChange: chờ tới khi giá trị khác lần đọc đầu.

// ocrMemo – lần OCR gần nhất của một vùng.
type ocrMemo struct {
	hash  uint64
	lines []vision.TextLine
}

// readArea chụp vùng area rồi đọc chữ; dòng trả theo toạ độ màn hình. Ảnh y hệt lần trước ở cùng vùng (so hash điểm
// ảnh) thì dùng lại kết quả – chờ giá trị đổi đọc mỗi IntervalMs, OCR ~100 ms mỗi lần.
func (e *Engine) readArea(area model.Rect) ([]vision.TextLine, error) {
	img, err := e.scr.Capture(area)
	if err != nil {
		return nil, err
	}
	h := vision.PixelHash(img)
	if m, ok := e.ocrMemo[area]; ok && m.hash == h {
		return e.dropSelfLines(m.lines), nil
	}
	lines, err := e.ocr.ReadText(img)
	if err != nil {
		return nil, err
	}
	k := vision.ImageScale(img, area)
	conv := func(b model.Rect) model.Rect { return screenBox(b, area, k) }
	out := make([]vision.TextLine, len(lines))
	for i, l := range lines {
		out[i] = l // giữ mọi trường (Approx…), chỉ đổi khung sang toạ độ màn
		out[i].Box, out[i].Words = conv(l.Box), nil
		for _, w := range l.Words {
			out[i].Words = append(out[i].Words, vision.TextWord{Start: w.Start, Len: w.Len, Box: conv(w.Box)})
		}
	}
	if e.ocrMemo == nil || len(e.ocrMemo) >= 64 { // nhãn xê dịch mỗi lần → vùng mới; chạy lâu thì bỏ bớt cho khỏi phình
		e.ocrMemo = map[model.Rect]ocrMemo{}
	}
	e.ocrMemo[area] = ocrMemo{h, out}
	return e.dropSelfLines(out), nil
}

// selfBoxes – khung cửa sổ của chính app đang hiện (thanh mini lúc chạy). Ảnh chụp có cả cửa sổ app (quyết định
// 2026-10-28) nên chữ đọc trong vùng phải bỏ phần nằm trên thanh mini – không thì Đọc chữ vùng lẫn "Dừng F8", tên node.
func (e *Engine) selfBoxes() []model.Rect {
	ws, err := e.wins.List()
	if err != nil {
		return nil
	}
	var out []model.Rect
	for _, w := range ws {
		if w.PID == selfPID && !w.Minimized {
			out = append(out, w.Box)
		}
	}
	return out
}

// inBoxes – tâm của b nằm trong một khung của bs.
func inBoxes(b model.Rect, bs []model.Rect) bool {
	cx, cy := b.X+b.W/2, b.Y+b.H/2
	for _, r := range bs {
		if cx >= r.X && cx < r.X+r.W && cy >= r.Y && cy < r.Y+r.H {
			return true
		}
	}
	return false
}

// dropSelfLines – bỏ dòng chữ (toạ độ màn hình) nằm trên cửa sổ của app.
func (e *Engine) dropSelfLines(lines []vision.TextLine) []vision.TextLine {
	self := e.selfBoxes()
	if len(self) == 0 {
		return lines
	}
	out := make([]vision.TextLine, 0, len(lines))
	for _, l := range lines {
		if !inBoxes(l.Box, self) {
			out = append(out, l)
		}
	}
	return out
}

// displayOf – khung màn chứa điểm p (zero = không biết màn – không kẹp vùng chụp).
func (e *Engine) displayOf(p model.Point) model.Rect {
	for _, d := range e.displays {
		if p.X >= d.X && p.X < d.X+d.W && p.Y >= d.Y && p.Y < d.Y+d.H {
			return d
		}
	}
	return model.Rect{}
}

// screenBox đổi khung theo px ảnh chụp vùng area (k = vision.ImageScale) sang toạ độ màn hình.
func screenBox(b, area model.Rect, k float64) model.Rect {
	return model.Rect{X: area.X + int(float64(b.X)/k), Y: area.Y + int(float64(b.Y)/k), W: int(float64(b.W) / k), H: int(float64(b.H) / k)}
}

// readGot – một lần đọc: chữ thô + khung (phần tử, hoặc dòng chữ cạnh nhãn). why = vì sao chưa đọc được.
type readGot struct {
	ok    bool
	why   string
	raw   string
	box   model.Rect
	role  string
	count int
	miss  func() map[string]any // chưa đọc được: StepError.Detail (chỉ tính khi hết giờ)
}

// nearOf – đọc chữ cạnh nhãn label trong các dòng lines (toạ độ màn hình).
func nearOf(lines []vision.TextLine, label model.Rect, s model.Step) readGot {
	text, box, ok := vision.NearText(lines, label, s.ReadNear, s.ReadSpan)
	if !ok {
		dir := map[string]string{model.ReadNearRight: "bên phải", model.ReadNearBelow: "bên dưới"}[s.ReadNear]
		return readGot{why: fmt.Sprintf("thấy nhãn nhưng không đọc được chữ nào %s nhãn", dir)}
	}
	return readGot{ok: true, raw: text, box: box}
}

// readByElement – tìm phần tử trong cây; ReadNear trống = đọc chính nó, có = OCR cạnh nó (nhãn phải đang hiện trên màn).
func (e *Engine) readByElement(s model.Step, q element.Query) (readGot, error) {
	nodes, r, err := e.lookElement(s.ElementApp, q)
	switch {
	case err != nil && waitable(err):
		return readGot{why: err.Error()}, nil
	case err != nil:
		return readGot{}, err
	case !r.Found:
		return readGot{why: missWhy(r, nodes, max(s.Occurrence, 1)), miss: func() map[string]any { return elementMiss(s.Selectors, nodes, r, q) }}, nil
	case s.ReadNear == "":
		return readGot{ok: true, raw: r.Hit.Text(), box: r.Hit.Box, role: r.Hit.Role, count: r.Count}, nil
	case !r.Hit.Shown():
		return readGot{why: "nhãn nằm ngoài khung nhìn – đọc cạnh nhãn cần nhãn đang hiện trên màn"}, nil
	}
	b := r.Hit.Box
	area := vision.NearArea(b, s.ReadNear, s.ReadSpan, e.displayOf(model.Point{X: b.X + b.W/2, Y: b.Y + b.H/2}))
	if area.W == 0 || area.H == 0 {
		return readGot{why: "nhãn sát mép màn, không có chỗ để đọc"}, nil
	}
	lines, err := e.readArea(area)
	if err != nil {
		return readGot{}, err
	}
	got := nearOf(lines, b, s)
	got.role, got.count = r.Hit.Role, r.Count
	return got, nil
}

// readByText – tìm nhãn bằng OCR trong vùng tìm rồi đọc cạnh nhãn trên cùng lần đọc (một lần OCR).
func (e *Engine) readByText(s model.Step, area model.Rect) (readGot, error) {
	lines, err := e.readArea(area)
	if err != nil {
		return readGot{}, err
	}
	hits := vision.FindText(lines, vision.TextQuery{Text: s.FindText, Exact: s.TextExact, NoAccent: !s.TextAccent})
	n := max(s.Occurrence, 1)
	if len(hits) < n {
		read := vision.ReadLines(lines, 40)
		return readGot{why: "không thấy nhãn “" + s.FindText + "”" + readHint(vision.TextLines(read, 40)), miss: func() map[string]any { return textMiss(s.FindText, read, area) }}, nil
	}
	got := nearOf(lines, hits[n-1].Box, s)
	got.count = len(hits)
	return got, nil
}

// elementRead – node Đọc phần tử: chờ tới khi đọc được giá trị (qua lọc) rồi trả output. Không cuộn, không di chuột.
func (e *Engine) elementRead(ctx context.Context, s model.Step) (map[string]any, error) {
	re, err := regexp.Compile(s.ReadPattern)
	if err != nil {
		return nil, &invalidErr{"mẫu lọc sai: " + err.Error()}
	}
	filter := vision.ReadFilter{Number: s.ReadNumber}
	if s.ReadPattern != "" {
		filter.Pattern = re
	}
	read, what, err := e.reader(s)
	if err != nil {
		return nil, err
	}
	var got readGot
	var value, base string
	hasBase, why := false, ""
	var miss func() map[string]any
	_, err = e.waitLoop(ctx, s, "element", func() (bool, int, error) {
		g, err := read()
		miss = g.miss
		if err != nil || !g.ok {
			why = g.why
			return false, 0, err
		}
		v, ok := filter.Apply(g.raw)
		switch {
		case !ok:
			why = fmt.Sprintf("đọc được “%s” nhưng không ra giá trị (mẫu lọc / số)", g.raw)
			return false, 0, nil
		case s.ReadChange && !hasBase:
			base, hasBase, why = v, true, fmt.Sprintf("giá trị chưa đổi (vẫn là “%s”)", v)
			return false, 0, nil
		case s.ReadChange && v == base:
			return false, 0, nil
		}
		got, value = g, v
		return true, 100, nil
	})
	if errors.Is(err, errTimeout) {
		return nil, &notFoundErr{msg: fmt.Sprintf("không đọc được %s sau %s – %s", what, fmtSeconds(s.TimeoutMs), why), detail: lazyDetail(miss)}
	}
	if err != nil {
		return nil, err
	}
	out := hit{Box: got.box, Role: got.role}.output()
	delete(out, "score")
	out["text"], out["raw"], out["count"] = value, got.raw, got.count // text luôn có, kể cả rỗng (ô nhập trống)
	if s.ReadChange {
		out["old"] = base
	}
	return out, nil
}

// reader – hàm đọc một lần theo cách tìm của node + tên thứ đang đọc (để báo lỗi).
func (e *Engine) reader(s model.Step) (func() (readGot, error), string, error) {
	if s.FindBy == model.FindByText {
		area := e.searchArea(s)
		if err := device.CaptureArea(area, e.displays); err != nil {
			return nil, "", err
		}
		return func() (readGot, error) { return e.readByText(s, area) }, "chữ cạnh nhãn “" + s.FindText + "”", nil
	}
	q, err := elementQuery(s.Selectors, !s.TextAccent, s.Occurrence, e.elementArea(s))
	if err != nil {
		return nil, "", err
	}
	what := "phần tử " + strings.Join(s.Selectors, " / ")
	if s.ReadNear != "" {
		what = "chữ cạnh phần tử " + strings.Join(s.Selectors, " / ")
	}
	return func() (readGot, error) { return e.readByElement(s, q) }, what, nil
}
