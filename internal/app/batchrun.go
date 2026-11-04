package app

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"ghosthand/internal/batch"
	"ghosthand/internal/model"
	"ghosthand/internal/samples"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// Chạy nhiều kịch bản một lượt (bước 61 M2): API /batch (CLI `ghosthand test`) và MCP run_batch dùng chung. Mỗi kịch bản
// chạy như lần chạy thường nhưng không ghi lịch sử; một lượt tại một thời điểm, không chen khi đang có lần chạy khác.

const keepBatches = 5 // lượt đã xong giữ lại để CLI / AI đọc kết quả

type batchState struct {
	mu   sync.Mutex
	n    int
	ids  []string
	runs map[string]*batch.Batch
}

// batchOpt – cách chạy từng kịch bản trong lượt: nguồn (cli / api / ai), trần thời gian; ask = hỏi người dùng một lần
// cho cả lượt (nil = không hỏi).
type batchOpt struct {
	source     string
	maxMinutes int
	ask        func(items []batch.Item) error
	stopBy     string
}

// startBatch chọn kịch bản theo req, hỏi (nếu có) rồi chạy nền; trả lượt + danh sách sẽ chạy.
func (a *App) startBatch(req batch.Request, o batchOpt) (*batch.Batch, []batch.Item, error) {
	items, err := batch.Resolve(req.Targets, req.Select)
	if err != nil {
		return nil, nil, err
	}
	if a.busyForBatch() {
		return nil, nil, session.ErrBusy
	}
	if o.ask != nil {
		if err := o.ask(items); err != nil {
			return nil, nil, err
		}
	}
	g := &a.batches
	g.mu.Lock()
	defer g.mu.Unlock()
	if a.sess.Running() != "" || g.running() { // hỏi lại: trong lúc chờ người dùng trả lời có thể đã có lần chạy khác
		return nil, nil, session.ErrBusy
	}
	g.n++
	id := fmt.Sprintf("%s%d", batch.IDPrefix, g.n)
	b := batch.Start(id, items, func(ctx context.Context, it batch.Item) (batch.Row, bool) { return a.runBatchItem(ctx, it, req, o) })
	if g.runs == nil {
		g.runs = map[string]*batch.Batch{}
	}
	g.runs[id] = b
	g.ids = append(g.ids, id)
	if len(g.ids) > keepBatches {
		delete(g.runs, g.ids[0])
		g.ids = g.ids[1:]
	}
	return b, items, nil
}

// busyForBatch – đang có lần chạy hoặc lượt khác.
func (a *App) busyForBatch() bool {
	g := &a.batches
	g.mu.Lock()
	defer g.mu.Unlock()
	return a.sess.Running() != "" || g.running()
}

// running – có lượt chưa xong (gọi khi giữ mu).
func (g *batchState) running() bool {
	for _, b := range g.runs {
		if !b.Status().Done() {
			return true
		}
	}
	return false
}

// batchByID – lượt id ("" = lượt mới nhất).
func (a *App) batchByID(id string) (*batch.Batch, error) {
	g := &a.batches
	g.mu.Lock()
	defer g.mu.Unlock()
	if id == "" && len(g.ids) > 0 {
		id = g.ids[len(g.ids)-1]
	}
	if b := g.runs[id]; b != nil {
		return b, nil
	}
	return nil, fmt.Errorf("%w: không có lượt %q (app chỉ giữ %d lượt gần nhất, mở lại app thì mất)", session.ErrNotFound, id, keepBatches)
}

// runBatchItem chạy một kịch bản tới khi xong; stop = người dùng dừng (F8 / nút Dừng) hoặc lượt bị huỷ → dừng cả lượt.
func (a *App) runBatchItem(ctx context.Context, it batch.Item, req batch.Request, o batchOpt) (batch.Row, bool) {
	sc, err := batchScript(it)
	if err != nil {
		return batch.Row{State: batch.RowFail, Code: "invalid", Error: err.Error()}, false
	}
	values := batchValues(sc, it.Path, req)
	id, err := a.sess.Start(sc, values, session.Options{Path: it.Path, Source: o.source, Preset: req.Preset, NoHistory: true, MaxMinutes: o.maxMinutes})
	if err != nil {
		row := batch.Row{State: batch.RowFail, Code: "invalid", Error: err.Error()}
		if se := (*model.ScriptError)(nil); errors.As(err, &se) {
			row.Node, row.Error = se.Ref, se.Msg
		}
		return row, errors.Is(err, session.ErrBusy) // người dùng tự bấm Chạy giữa lượt – không chen
	}
	st, _ := a.sess.Wait(ctx, id)
	if ctx.Err() != nil {
		a.sess.Stop(id, o.stopBy)
		st, _ = a.sess.Wait(context.Background(), id)
	}
	row := batch.Row{State: st.State, Ms: st.DurationMs, RunID: id, Error: st.Error}
	if st.State == session.StateFail && st.FailedStep != "" {
		if tr, err := a.sess.Trace(id); err == nil {
			for _, r := range tr.Results {
				if r.NodeID == st.FailedStep && r.Error != nil {
					row.Node, row.Code, row.Error = r.Ref, r.Error.Code, r.Error.Message
				}
			}
		}
	}
	if st.State == session.StateStopped && !st.TimedOut {
		return row, true
	}
	if st.TimedOut {
		row.State, row.Code = batch.RowFail, "timeout"
	}
	return row, false
}

// batchScript – kịch bản của dòng: file hoặc mẫu (sân thử ghi ra thư mục cấu hình như khi mở mẫu trong app).
func batchScript(it batch.Item) (model.Script, error) {
	if it.Sample == "" {
		return store.ReadScriptFile(it.Path)
	}
	url, err := sandboxURL()
	if err != nil {
		return model.Script{}, err
	}
	return samples.Open(it.Sample, url)
}

// batchValues – bộ input req.Preset (nếu kịch bản có) rồi req.Values, chỉ giữ key kịch bản có (--set dùng chung cả lượt).
func batchValues(sc model.Script, path string, req batch.Request) map[string]any {
	values := map[string]any{}
	if path != "" && req.Preset != "" {
		if v, err := presetValues(path, req.Preset); err == nil {
			values = v
		}
	}
	for _, in := range sc.Inputs {
		if v, ok := req.Values[in.Key]; ok {
			values[in.Key] = v
		}
	}
	return values
}

// Nối API local (CLI `ghosthand test`): không hỏi – người dùng tự gõ lệnh.

func (b apiBackend) StartBatch(req batch.Request) (string, []string, error) {
	bt, items, err := b.a.startBatch(req, batchOpt{source: session.SourceCLI, stopBy: session.StopByAPI})
	if err != nil {
		return "", nil, err
	}
	names := make([]string, len(items))
	for i, it := range items {
		names[i] = it.Name
	}
	return bt.Status().ID, names, nil
}

func (b apiBackend) BatchStatus(id string) (batch.Status, error) {
	bt, err := b.a.batchByID(id)
	if err != nil {
		return batch.Status{}, err
	}
	return bt.Status(), nil
}

func (b apiBackend) StopBatch(id string) bool {
	bt, err := b.a.batchByID(id)
	if err != nil || bt.Status().Done() {
		return false
	}
	bt.Stop()
	return true
}

// Nối MCP run_batch: hỏi một lần cho cả lượt (mức "Hỏi trước khi chạy"), trần thời gian mỗi kịch bản như lượt AI.

func (b mcpBackend) StartBatch(req batch.Request) (string, error) {
	ask := func(items []batch.Item) error {
		names := make([]string, len(items))
		for i, it := range items {
			names[i] = it.Name
		}
		return b.a.aiAllowed(AIAsk{Script: fmt.Sprintf("%d kịch bản", len(items)), Batch: names})
	}
	bt, _, err := b.a.startBatch(req, batchOpt{source: session.SourceAI, maxMinutes: store.CurrentSettings().MCP.Limit(), ask: ask, stopBy: session.StopByAI})
	if err != nil {
		return "", err
	}
	return bt.Status().ID, nil
}

func (b mcpBackend) WaitBatch(ctx context.Context, id string) (batch.Status, error) {
	bt, err := b.a.batchByID(id)
	if err != nil {
		return batch.Status{}, err
	}
	return bt.Wait(ctx), nil
}

func (b mcpBackend) StopBatch(id string) bool { return apiBackend(b).StopBatch(id) }
