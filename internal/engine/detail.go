package engine

import (
	"errors"
	"sort"

	"ghosthand/internal/browser"
	"ghosthand/internal/device"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/perm"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// Chi tiết lỗi có cấu trúc (StepError.Detail – bước 31b): AI / người đọc để tự sửa node thay vì đoán từ câu chữ.
//   chờ / click ảnh: {kind: image, best, threshold, bestBox, area}
//   chờ / click chữ: {kind: text, want, read[{text, box}], closest {text, box, score}, area}
//   chờ màu:         {kind: pixel, point, actual, want, tolerance}
//   phần tử:         {kind: element, selectors, read (số phần tử đã đọc), count, near[{role, name, box, score}]}
//   web:             {kind: web, selectors, perSelector[{selector, shown, hidden}], tab, matched, count, hidden, covered,
//                     moving, offView, loading, hover, noTab, outline[{role, name, sel, …}] (không selector nào khớp),
//                     pageCheck {verdict, useWeb, signs, url} (nếu đã Thử trang đó – captcha / canvas / chặn)
//   quyền (permission): {permission: id quyền thiếu – khớp perm.ID, xem Cài đặt → Quyền}
//   cửa sổ:          {kind: window, app, title, near[{title, app, box, minimized, score}]}
//   ứng dụng:        {kind: app, app, running[] (khớp tên – vd chưa có cửa sổ / chưa thoát), near[{name, id, score}]}
//   mọi node lỗi:    context {foreground {title, app, box}, mouse {x, y}, screen, displays, shotArea}

// notFoundErr – chờ ảnh / chữ / màu / phần tử / web / cửa sổ hết giờ không thấy (StepError code not_found).
type notFoundErr struct {
	msg    string
	detail map[string]any // StepError.Detail
}

func (e *notFoundErr) Error() string { return e.msg }

// timeoutErr – chờ hết giờ (StepError code timeout): giờ hẹn đã qua, cửa sổ / app không mở · đóng kịp.
type timeoutErr struct {
	msg    string
	detail map[string]any // StepError.Detail
}

func (e *timeoutErr) Error() string { return e.msg }

// lazyDetail – detail tính lúc báo lỗi (nil = không có).
func lazyDetail(f func() map[string]any) map[string]any {
	if f == nil {
		return nil
	}
	return f()
}

// nearMax – số ứng viên gần đúng tối đa mỗi loại; nearScore – % giống tối thiểu (dưới đó coi như không liên quan).
const (
	nearMax   = 8
	nearScore = 50
)

// errDetail – phần chi tiết riêng của lỗi (nil = không có).
func errDetail(err error) map[string]any {
	if id := permOf(err); id != "" {
		return map[string]any{"permission": string(id)} // UI nhảy tới đúng mục ở Cài đặt → Quyền (bước 48 P5)
	}
	var nf *notFoundErr
	if errors.As(err, &nf) {
		return nf.detail
	}
	var late *timeoutErr
	if errors.As(err, &late) {
		return late.detail
	}
	return nil
}

// permOf: quyền hệ điều hành thiếu gây ra lỗi err ("" = không phải lỗi quyền hoặc không gắn với quyền nào).
func permOf(err error) perm.ID {
	switch {
	case errors.Is(err, device.ErrNoPermission):
		return perm.ScreenRecording
	case errors.Is(err, device.ErrNoAccessibility):
		return perm.Accessibility
	case errors.Is(err, device.ErrNoFinder):
		return perm.AutoFinder
	case errors.Is(err, browser.ErrNoAutomation):
		return perm.AutoChrome
	}
	return ""
}

func imageMiss(m FindResult, s model.Step) map[string]any {
	d := map[string]any{"kind": "image", "best": m.Score, "threshold": s.Threshold,
		"bestBox": model.Rect{X: m.X, Y: m.Y, W: m.W, H: m.H}, "area": m.Area}
	if s.MatchMode != "" {
		d["matchMode"] = s.MatchMode
	}
	if s.ColorTol > 0 { // khớp đủ mà colorDiff > colorTol = đúng hình sai màu
		d["colorDiff"], d["colorTol"] = m.ColorDiff, s.ColorTol
	}
	return d
}

// textMiss – read: dòng đọc được (toạ độ màn hình, locateText); closest: dòng giống chữ cần tìm nhất (≥ nearScore);
// approx: có dòng từ bộ đọc không biết dấu.
func textMiss(want string, read []vision.TextLine, area model.Rect) map[string]any {
	lines := make([]map[string]any, 0, len(read))
	var closest map[string]any
	best := nearScore - 1
	approx := false
	for _, l := range read {
		lines = append(lines, map[string]any{"text": l.Text, "box": l.Box})
		approx = approx || l.Approx
		if sc := vision.Similarity(l.Text, want); sc > best {
			best, closest = sc, map[string]any{"text": l.Text, "box": l.Box, "score": sc}
		}
	}
	d := map[string]any{"kind": "text", "want": want, "read": lines, "area": area}
	if closest != nil {
		d["closest"] = closest
	}
	if approx {
		d["approx"] = true // bộ đọc dự phòng không biết dấu tiếng Việt (OCR Windows) – dấu trong read có thể sai, đã so không dấu
	}
	return d
}

func elementMiss(selectors []string, nodes []element.Node, r element.Result, q element.Query) map[string]any {
	return map[string]any{"kind": "element", "selectors": selectors, "read": len(nodes), "count": r.Count,
		"near": element.NearMatches(nodes, q, nearMax)}
}

// webMiss – trạng thái lần tìm cuối; chỉ ghi trường có giá trị cho gọn. near: phần tử trong outline giống cách tìm.
func webMiss(f webTry, lines []string, near []web.OutlineItem, check *web.PageCheck) map[string]any {
	d := map[string]any{"kind": "web", "selectors": lines, "tab": f.Tab, "count": f.Count}
	var per []map[string]any
	for i, c := range f.Counts {
		if i < len(lines) {
			per = append(per, map[string]any{"selector": lines[i], "shown": c.Shown, "hidden": c.Hidden})
		}
	}
	if per != nil {
		d["perSelector"] = per
	}
	if near != nil {
		d["outline"] = near
	}
	if check != nil { // lần Thử trang gần nhất: captcha / canvas / chặn → lỗi do trang chứ không do selector
		d["pageCheck"] = map[string]any{"verdict": check.Verdict, "useWeb": check.UseWeb, "signs": check.Signs, "url": check.URL}
	}
	if f.Selector >= 0 && f.Selector < len(lines) {
		d["matched"] = lines[f.Selector]
	}
	for k, v := range map[string]any{"hidden": f.Hidden, "covered": f.Covered, "hover": f.hover} {
		if v != 0 && v != "" {
			d[k] = v
		}
	}
	for k, v := range map[string]bool{"moving": f.Moving, "offView": f.OffView, "loading": f.Loading, "noTab": f.NoTab} {
		if v {
			d[k] = true
		}
	}
	return d
}

// outlineNear – phần tử của trang có tên giống cách tìm nhất (≥ nearScore, tối đa nearMax + 4), kèm selector đã kiểm
// (sel) – AI dùng thẳng được. css= / xpath= không so được theo tên → bỏ.
func outlineNear(o web.Outline, sels []model.Selector) []web.OutlineItem {
	type scored struct {
		web.OutlineItem
		score int
	}
	var out []scored
	for _, it := range o.Items {
		best := 0
		for _, s := range sels {
			switch s.By {
			case model.SelText, model.SelAria:
				best = max(best, vision.Similarity(it.Name, s.Value))
			case model.SelRole:
				if it.Role == s.Value {
					best = max(best, map[bool]int{true: 100, false: vision.Similarity(it.Name, s.Name)}[s.Name == ""])
				}
			}
		}
		if best >= nearScore {
			out = append(out, scored{it, best})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].score > out[j].score })
	items := make([]web.OutlineItem, 0, min(len(out), nearMax+4))
	for _, x := range out[:min(len(out), nearMax+4)] {
		items = append(items, x.OutlineItem)
	}
	return items
}

// windowMiss – cửa sổ giống app / tiêu đề cần tìm nhất (trung bình phần đã nhập).
func windowMiss(s model.Step, wins []model.WindowInfo) map[string]any {
	type near struct {
		model.WindowInfo
		Score int `json:"score"`
	}
	var out []near
	for _, w := range wins {
		sum, n := 0, 0
		if s.WinApp != "" {
			sum, n = sum+max(vision.Similarity(w.App, s.WinApp), vision.Similarity(w.AppID, s.WinApp)), n+1
		}
		if s.WinTitle != "" {
			sum, n = sum+vision.Similarity(w.Title, s.WinTitle), n+1
		}
		if n > 0 && sum/n >= nearScore {
			out = append(out, near{w, sum / n})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	return map[string]any{"kind": "window", "app": s.WinApp, "title": s.WinTitle, "near": out[:min(len(out), nearMax)]}
}

// appMiss – running: tiến trình khớp tên lúc hết giờ; near: app đang chạy có tên giống nhất (bỏ trùng tên).
func appMiss(s model.Step, running, apps []model.AppInfo) map[string]any {
	type near struct {
		Name  string `json:"name"`
		ID    string `json:"id,omitempty"`
		Score int    `json:"score"`
	}
	var out []near
	seen := map[string]bool{}
	for _, a := range apps {
		sc := max(vision.Similarity(a.Name, s.AppName), vision.Similarity(a.ID, s.AppName))
		if sc >= nearScore && !seen[a.Name] {
			seen[a.Name] = true
			out = append(out, near{a.Name, a.ID, sc})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	if running == nil {
		running = []model.AppInfo{}
	}
	return map[string]any{"kind": "app", "app": s.AppName, "running": running, "near": out[:min(len(out), nearMax)]}
}

func pixelMiss(p model.Point, actual, want string, tolerance int) map[string]any {
	return map[string]any{"kind": "pixel", "point": p, "actual": actual, "want": want, "tolerance": tolerance}
}

// addContext gắn ngữ cảnh lúc node lỗi: cửa sổ đang ở trước, vị trí chuột, màn hình. Đọc lỗi thì bỏ phần đó.
func (e *Engine) addContext(res *model.StepResult) {
	if res.Error == nil || res.Error.Code == model.ErrCancelled {
		return
	}
	// shotArea – vùng của ảnh chụp lúc lỗi (shots.go): toạ độ thật = shotArea.x + px ảnh × shotArea.w / rộng ảnh
	ctx := map[string]any{"screen": e.screen, "shotArea": e.searchArea(model.Step{SearchArea: "screen"})}
	if len(e.displays) > 0 {
		ctx["displays"] = e.displays
	}
	if e.in != nil {
		x, y := e.in.Location()
		ctx["mouse"] = model.Point{X: x, Y: y}
	}
	if ws, err := e.wins.List(); err == nil {
		if w, ok := foreground(ws); ok {
			ctx["foreground"] = map[string]any{"title": w.Title, "app": w.App, "box": w.Box}
		}
	}
	if res.Error.Detail == nil {
		res.Error.Detail = map[string]any{}
	}
	res.Error.Detail["context"] = ctx
}
