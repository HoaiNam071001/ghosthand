package engine

import (
	"context"
	"errors"
	"fmt"
	goruntime "runtime"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Node web D4: gõ vào ô, đọc phần tử, cuộn – tìm qua web.Browser như webClick, thao tác bằng chuột / phím thật.

// Sau khi click vào ô, trang cần chút thời gian chuyển focus (React state, hiệu ứng): chờ tối thiểu focusWaitMs rồi hỏi
// lại mỗi focusPollMs tới focusMaxMs mới coi là không nhận focus.
const (
	focusWaitMs = 100
	focusPollMs = 50
	focusMaxMs  = 600
)

func (e *Engine) waitFocus(ctx context.Context) (bool, string, error) {
	if err := Sleep(ctx, focusWaitMs); err != nil {
		return false, "", err
	}
	for waited := focusWaitMs; ; waited += focusPollMs {
		ok, at, err := e.browser.Focused(ctx)
		if err != nil || ok || waited >= focusMaxMs {
			return ok, at, err
		}
		if err := Sleep(ctx, focusPollMs); err != nil {
			return false, "", err
		}
	}
}

// webType click vào ô (như webClick một lần), kiểm tra ô nhận focus, xoá chữ cũ (WebClear), gõ Text, Enter (WebEnter).
func (e *Engine) webType(ctx context.Context, s model.Step) (map[string]any, error) {
	f, lines, err := e.webFind(ctx, s, true)
	if err != nil {
		return nil, err
	}
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	mark, err := e.webMark(ctx, s.Tab, true)
	if err != nil {
		return nil, err
	}
	if err := e.webPress(ctx, s, f.at, "left", 1); err != nil {
		return nil, err
	}
	ok, at, err := true, "", error(nil)
	if !s.SkipFocusCheck {
		ok, at, err = e.waitFocus(ctx)
	}
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, &notFoundErr{msg: fmt.Sprintf("đã click vào “%s” nhưng ô nhập không nhận focus (đang focus: %s) – cách tìm có trỏ đúng ô nhập không?", lines[f.Selector], at)}
	}
	if err := e.webKeys(ctx, s); err != nil {
		return nil, err
	}
	out := webOutput(f.Found, lines)
	out["text"], out["clickX"], out["clickY"] = s.Text, f.at.X, f.at.Y
	return out, e.webSettle(ctx, mark, out)
}

// webKeys – phần gõ của webType vào ô đã focus: phím thật, hoặc chèn chữ qua CDP khi chạy nền.
func (e *Engine) webKeys(ctx context.Context, s model.Step) error {
	if s.WebBackground {
		return e.browser.BgType(ctx, s.Text, s.WebClear, s.WebEnter)
	}
	if s.WebClear {
		selectAll := model.Step{Keys: []string{"a"}, Modifiers: []string{shortcutMod()}, KeyMode: model.KeyChord}
		if err := e.pressKeys(ctx, selectAll); err != nil {
			return err
		}
		if err := e.pressKeys(ctx, model.Step{Keys: []string{"backspace"}}); err != nil {
			return err
		}
	}
	if err := e.typeText(ctx, s.Text, s.TypeMode); err != nil {
		return err
	}
	if s.WebEnter {
		return e.pressKeys(ctx, model.Step{Keys: []string{"enter"}})
	}
	return nil
}

// shortcutMod – phím kèm của phím tắt hệ thống (chọn tất cả, dán) theo hệ điều hành.
func shortcutMod() string {
	if goruntime.GOOS == "darwin" {
		return "cmd"
	}
	return "ctrl"
}

// readOf – Query.Read / Attr của node webRead ("", "" với loại khác).
func readOf(s model.Step) (string, string) {
	switch {
	case s.Type != model.StepWebRead:
		return "", ""
	case s.ReadFrom == "":
		return "text", ""
	}
	return s.ReadFrom, strings.TrimSpace(s.Attr)
}

// webRead chờ phần tử hiện rồi đọc giá trị – không di chuột, không đo toạ độ.
func (e *Engine) webRead(ctx context.Context, s model.Step) (map[string]any, error) {
	q, lines, err := webQuery(s, s.Selectors, false)
	if err != nil {
		return nil, err
	}
	q.CheckOnly = true
	q.Read, q.Attr = readOf(s)
	f, lines, err := e.webFindQ(ctx, s, q, lines, false)
	if err != nil {
		return nil, err
	}
	return map[string]any{"text": f.Value, "count": f.Count, "selector": lines[f.Selector]}, nil
}

// webScroll theo ScrollMode: tới phần tử (vào giữa khung nhìn) / lăn trong phần tử / lăn tới khi thấy phần tử.
func (e *Engine) webScroll(ctx context.Context, s model.Step) (map[string]any, error) {
	switch s.ScrollMode {
	case model.ScrollModeIn:
		f, lines, err := e.webFind(ctx, s, true)
		if err != nil {
			return nil, err
		}
		if err := e.webWheel(ctx, s, f.at); err != nil {
			return nil, err
		}
		return webOutput(f.Found, lines), nil
	case model.ScrollModeUntil:
		return e.scrollUntil(ctx, s)
	}
	q, lines, err := webQuery(s, s.Selectors, true) // Scroll: ngoài khung nhìn thì lăn chuột thật tới (webFindQ)
	if err != nil {
		return nil, err
	}
	f, lines, err := e.webFindQ(ctx, s, q, lines, false)
	if err != nil {
		return nil, err
	}
	return webOutput(f.Found, lines), nil
}

// scrollUntil lăn Amount nấc mỗi lần (trong khung ScrollIn, trống = giữa trang) tới khi phần tử đích nằm trong khung
// nhìn. Phần tử thấy nhưng còn ngoài khung nhìn thì lăn tiếp (không nhảy bằng scrollIntoView – feed cần lăn thật).
func (e *Engine) scrollUntil(ctx context.Context, s model.Step) (map[string]any, error) {
	if e.browser == nil {
		return nil, errNoBrowserOpt
	}
	q, lines, err := webQuery(s, s.Selectors, false)
	if err != nil {
		return nil, err
	}
	box, boxLines, err := webQuery(s, s.ScrollIn, true)
	if err != nil {
		return nil, err
	}
	box.Occurrence = 0 // chỗ thứ N là của phần tử cần thấy, không phải khung cuộn
	if box.Viewport = len(boxLines) == 0; box.Viewport {
		box.Selectors = nil
	}
	var last web.Found
	var boxTry webTry
	n := 0
	_, err = e.waitLoop(ctx, s, "web", func() (bool, int, error) {
		f, err := e.browser.Find(ctx, q)
		if err != nil {
			return false, 0, err
		}
		if last = f; f.OK && !f.OffView {
			return true, 0, nil
		}
		if boxTry, err = e.webTryOnce(ctx, s, box, true); err != nil || !boxTry.ok {
			return false, 0, err
		}
		n++
		return false, 0, e.webWheel(ctx, s, boxTry.at)
	})
	if errors.Is(err, errTimeout) {
		return nil, &notFoundErr{msg: scrollMissMsg(s, last, boxTry, lines, boxLines, n)}
	}
	if err != nil {
		return nil, err
	}
	out := webOutput(last, lines)
	out["scrolls"] = n
	return out, nil
}

// webWheel lăn Amount nấc Direction tại at: chuột thật, hoặc qua CDP khi chạy nền.
func (e *Engine) webWheel(ctx context.Context, s model.Step, at model.Point) error {
	if s.WebBackground {
		return e.wheelEach(ctx, s.Amount, func() error { return e.browser.BgWheel(ctx, at.X, at.Y, s.Direction) })
	}
	if err := e.move(ctx, at.X, at.Y, 0); err != nil {
		return err
	}
	return e.wheel(ctx, s.Direction, s.Amount)
}

// scrollMissMsg – vì sao cuộn hết giờ vẫn chưa thấy: không lăn được trong khung, thấy mà chưa tới, hay chưa thấy.
func scrollMissMsg(s model.Step, f web.Found, box webTry, lines, boxLines []string, n int) string {
	after := "sau " + fmtSeconds(s.TimeoutMs)
	want := strings.Join(lines, "”, “")
	switch {
	case f.NoTab:
		return fmt.Sprintf("không thấy tab nào có URL / tiêu đề chứa “%s” %s", s.Tab, after)
	case n == 0 && len(boxLines) > 0:
		return fmt.Sprintf("chưa lăn được lần nào: %s", webMissMsg(s, box, boxLines, false))
	case n == 0:
		return fmt.Sprintf("chưa lăn được lần nào: chuột chưa vào được giữa trang (%s) %s", box.hover, after)
	case f.Selector >= 0:
		return fmt.Sprintf("đã lăn %d lần, thấy “%s” nhưng chưa vào khung nhìn %s – đúng hướng cuộn chưa?", n, lines[f.Selector], after)
	}
	return fmt.Sprintf("đã lăn %d lần vẫn chưa thấy “%s” %s", n, want, after)
}
