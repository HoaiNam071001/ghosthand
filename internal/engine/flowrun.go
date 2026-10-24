package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ghosthand/internal/browser"
	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/web"
)

// Engine chạy flow (bước 20): từ node start, chạy node → StepResult → đi theo cạnh của cổng ra → node kế.
// Hết cạnh: cổng fail = dừng kịch bản báo lỗi, cổng khác = xong vòng. Lặp Loops vòng như trước.

// maxNodeRuns – số lần chạy node tối đa mỗi vòng (chặn vòng lặp không có node Đếm).
const maxNodeRuns = 10000

// run chạy tới khi đủ số vòng, hết MaxMinutes hoặc ctx bị huỷ.
// Hết thời gian là kết thúc bình thường (nil); bị huỷ trả ctx.Err().
// MaxMinutes tính theo đồng hồ thật, kể cả lúc tạm dừng.
func (e *Engine) Run(ctx context.Context) error {
	sc := e.sc
	if err := script.ValidateScript(sc, e.screen); err != nil {
		return err
	}
	runCtx := ctx
	if sc.MaxMinutes > 0 {
		var cancel context.CancelFunc
		runCtx, cancel = context.WithTimeout(ctx, time.Duration(sc.MaxMinutes)*time.Minute)
		defer cancel()
	}

	e.byID = make(map[string]model.Step, len(sc.Steps))
	e.order = map[string]int{}
	total := 0
	for _, id := range model.FlowOrder(sc) {
		for _, s := range sc.Steps {
			if s.ID == id && s.Enabled {
				total++
				e.order[id] = total
			}
		}
	}
	for _, s := range sc.Steps {
		e.byID[s.ID] = s
	}
	e.mu.Lock()
	e.start = time.Now()
	e.prog = Progress{Loops: sc.Loops, Total: total}
	e.mu.Unlock()

	for loop := 1; sc.Loops == 0 || loop <= sc.Loops; loop++ {
		err := e.runLoop(runCtx, loop)
		if err == nil && e.reached {
			return nil
		}
		if err == nil {
			continue
		}
		if ctx.Err() == nil && errors.Is(err, context.DeadlineExceeded) {
			e.timedOut = true
			return nil // hết MaxMinutes
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	return nil
}

// runLoop chạy một vòng flow. Kết quả / biến đặt lại mỗi vòng (Đếm đếm lại từ 0, Lặp qua danh sách nạp lại).
func (e *Engine) runLoop(ctx context.Context, loop int) error {
	e.rv = runVars{byRef: map[string]*model.StepResult{}, vars: map[string]any{}, secrets: e.rv.secrets}
	e.results = map[string]*model.StepResult{}
	e.counts = map[string]int{}
	e.lists = map[string]*listCursor{}
	if loop == 1 {
		e.plant()
	}
	var trail []string // các node gần nhất – báo lỗi lặp vô hạn
	e.setProg(func(p *Progress) { p.From, p.Counter = nil, nil })
	cur := e.sc.Start
	for n := 1; cur != ""; n++ {
		s := e.byID[cur]
		if n > maxNodeRuns {
			e.failed = s.ID
			return fmt.Errorf("vòng %d: đã chạy %d node mà chưa xong – có thể lặp vô hạn ở %s; thêm node Đếm để giới hạn số vòng lặp",
				loop, maxNodeRuns, strings.Join(trail, " → "))
		}
		e.breakBefore(s, loop)
		res, wait := e.execNode(ctx, s, loop)
		if res.Status == model.StatusFail {
			e.addContext(&res)
			if ch := e.treeChanges(); ch != nil && res.Error != nil {
				if res.Error.Detail == nil {
					res.Error.Detail = map[string]any{}
				}
				res.Error.Detail["changes"] = ch // popup / hộp thoại mới hiện từ node trước – thường là lý do node này lỗi
			}
			e.shoot(&res)
		}
		wait = e.shootAfter(ctx, &res, wait)
		shown := e.mask.result(res) // bản rời engine đã che bí mật; rv giữ bản thật cho node sau
		e.results[s.ID], e.rv.byRef[s.Ref], e.rv.last = &shown, &res, &res
		if e.onNode != nil {
			e.onNode(shown)
		}
		if res.Status == model.StatusCancelled {
			return ctx.Err()
		}
		if trail = append(trail, s.Ref); len(trail) > 6 {
			trail = trail[1:]
		}
		next := model.EdgeOut(e.sc.Edges, s.ID, res.Port)
		e.setProg(func(p *Progress) { trackFlow(p, s, res) })
		if res.Status == model.StatusFail && next == "" {
			e.failed = s.ID
			return fmt.Errorf("vòng %d, %s: %s", loop, s.Ref, shown.Error.Message)
		}
		if s.ID == e.stopAt {
			e.reached = true
			return nil
		}
		if res.Status == model.StatusSuccess {
			if err := Sleep(ctx, wait); err != nil {
				return err
			}
		}
		cur = next
	}
	return nil
}

// plant nạp kết quả + biến của lần chạy trước (Options.Seed) – node đã bị xoá thì bỏ; ref lấy theo kịch bản hiện tại.
func (e *Engine) plant() {
	if e.seed == nil {
		return
	}
	for id, r := range e.seed.Results {
		s, ok := e.byID[id]
		if !ok {
			continue
		}
		r.Ref = s.Ref
		e.results[id], e.rv.byRef[s.Ref] = &r, &r
	}
	for k, v := range e.seed.Vars {
		e.rv.vars[k] = v
	}
}

// trackFlow ghi node vừa chạy (+ lượt Đếm / phần tử thứ mấy của Lặp qua danh sách) vào tiến độ.
func trackFlow(p *Progress, s model.Step, res model.StepResult) {
	p.From = &FromPort{Ref: s.Ref, Port: res.Port}
	if s.Type != model.StepCounter && s.Type != model.StepForEach || res.Status != model.StatusSuccess {
		return
	}
	switch res.Port {
	case model.PortNext:
		n, _ := res.Output["count"].(int)
		p.Counter = &CounterLoop{Ref: s.Ref, Count: n, Max: s.Max}
	case model.PortItem:
		i, _ := res.Output["index"].(int)
		n, _ := res.Output["count"].(int)
		p.Counter = &CounterLoop{Ref: s.Ref, Count: i, Max: n}
	default:
		if p.Counter != nil && p.Counter.Ref == s.Ref {
			p.Counter = nil // hết lượt – ra khỏi vòng
		}
	}
}

// execNode chạy một node, thử lại theo Retry; không bao giờ trả lỗi – mọi kết quả nằm trong StepResult.
// wait: thời gian chờ sau node khi thành công (delayAfter đã tính biến + cộng jitter).
func (e *Engine) execNode(ctx context.Context, s model.Step, loop int) (res model.StepResult, wait int) {
	res = model.StepResult{NodeID: s.ID, Ref: s.Ref, Loop: loop, StartedAt: time.Now()}
	defer func() {
		res.DurationMs = time.Since(res.StartedAt).Milliseconds()
		if res.Status == model.StatusSuccess || res.Status == model.StatusSkipped { // output chung (CommonOutputs)
			if res.Output == nil {
				res.Output = map[string]any{}
			}
			res.Output["startedAt"], res.Output["durationMs"] = res.StartedAt.Format(time.RFC3339), res.DurationMs
		}
	}()
	logf := func(level, format string, a ...any) {
		res.Logs = append(res.Logs, model.LogLine{AtMs: time.Since(res.StartedAt).Milliseconds(), Level: level, Msg: fmt.Sprintf(format, a...)})
	}
	if !s.Enabled {
		res.Status, res.Port = model.StatusSkipped, model.PortSuccess
		logf("info", "node đang tắt – đi tiếp cổng success")
		return res, 0
	}
	e.miss = nil
	tries := 1
	delay := 0
	if s.Retry != nil && !model.IsControl(s.Type) {
		tries += s.Retry.Count
		delay = s.Retry.DelayMs
	}
	var err error
	var failOut map[string]any // output của lần thử cuối khi thất bại (HTTP: status / body cho nhánh Thất bại)
	for t := 1; t <= tries; t++ {
		if t > 1 {
			if err = Sleep(ctx, delay); err != nil {
				break
			}
		}
		if err = e.gate.wait(ctx); err != nil {
			break
		}
		res.Attempts = t
		e.update(true, func(p *Progress) {
			p.Loop, p.Step, p.NodeID, p.Ref, p.Retry, p.Retries = loop, e.order[s.ID], s.ID, s.Ref, t-1, tries-1
		})
		var rs model.Step
		if rs, err = resolveNodeVars(s, e.rv); err == nil {
			err = script.ApplyNumVars(&rs)
		}
		if err != nil {
			res.Status, res.Port = model.StatusFail, model.PortFail
			res.Error = &model.StepError{Code: model.ErrInvalidInput, Message: err.Error()}
			logf("error", "%v", err)
			return res, 0
		}
		wait = e.jitterMs(rs.DelayAfter, rs.JitterMs)
		e.setHuman(rs)
		port, out := model.PortSuccess, map[string]any(nil)
		if model.IsControl(s.Type) {
			port, out, err = e.runControl(ctx, rs, logf)
		} else {
			out, err = e.runStep(ctx, rs, wait)
			port = actionPort(rs, out)
			for _, n := range e.notes {
				logf("warn", "%s", n)
			}
			e.notes = nil
		}
		if err == nil {
			if rs.Type == model.StepOpen {
				wait = 0 // openStep đã tự chờ DelayAfter (dò cửa sổ mới trong lúc chờ)
			}
			res.Status, res.Port, res.Output = model.StatusSuccess, port, out
			if tries > 1 {
				e.update(true, func(p *Progress) { p.Retry, p.Retries = 0, 0 })
			}
			return res, wait
		}
		failOut = out
		if ctx.Err() != nil {
			break
		}
		if t < tries {
			logf("warn", "lần %d / %d: %v – thử lại", t, tries, err)
		}
	}
	if tries > 1 {
		e.update(true, func(p *Progress) { p.Retry, p.Retries = 0, 0 })
	}
	if ctx.Err() != nil {
		res.Status = model.StatusCancelled
		res.Error = &model.StepError{Code: model.ErrCancelled, Message: "đã dừng"}
		return res, 0
	}
	res.Status, res.Port, res.Output = model.StatusFail, model.PortFail, failOut
	res.Error = &model.StepError{Code: errCode(err), Message: err.Error(), Detail: errDetail(err)}
	logf("error", "%v", err)
	return res, 0
}

func errCode(err error) string {
	var nf *notFoundErr
	var end *endErr
	var bad *invalidErr
	var noBrowser *web.BrowserError
	var badQuery *web.QueryError
	var status *httpStatusErr
	var network *networkErr
	var late *timeoutErr
	var exit *exitErr
	switch {
	case errors.As(err, &nf), errors.Is(err, browser.ErrTabGone):
		return model.ErrNotFound
	case errors.As(err, &end):
		return model.ErrEnd
	case errors.As(err, &bad), errors.As(err, &badQuery):
		return model.ErrInvalidInput
	case errors.As(err, &noBrowser), errors.Is(err, browser.ErrNotRunning):
		return model.ErrBrowser
	case errors.As(err, &status):
		return model.ErrHTTPStatus
	case errors.As(err, &network):
		return model.ErrNetwork
	case errors.As(err, &exit):
		return model.ErrExitCode
	case errors.As(err, &late):
		return model.ErrTimeout
	case errors.Is(err, device.ErrNoPermission), errors.Is(err, device.ErrNoAccessibility), errors.Is(err, errDangerNotAllowed),
		errors.Is(err, browser.ErrNoAutomation):
		return model.ErrPermission
	}
	return model.ErrInternal
}
