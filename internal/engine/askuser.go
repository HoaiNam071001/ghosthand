package engine

import (
	"context"
	"errors"
	"strings"
	"time"

	"ghosthand/internal/model"
)

// Node Hỏi người dùng (bước 56 D1): dừng flow, hỏi người ngồi máy qua Options.Ask (thanh mini + thông báo hệ thống),
// đi cổng approve / deny theo câu trả lời, hết TimeoutMs (0 = chờ mãi) hoặc lượt chạy không có người (Ask nil – hẹn
// giờ, CLI, API) → timeout. Trong lúc chờ, Progress.Ask giữ câu hỏi cho thanh mini và wait_run (needs_input).

// AskQuestion – câu hỏi gửi người dùng (đã thay biến).
type AskQuestion struct {
	Ref       string   `json:"ref"`
	Message   string   `json:"message"`
	Items     []string `json:"items,omitempty"`
	Input     bool     `json:"input,omitempty"`     // có ô nhập chữ
	TimeoutMs int      `json:"timeoutMs,omitempty"` // 0 = không giới hạn
}

// AskAnswer – câu trả lời: Answer approve | deny, Text = chữ ô nhập.
type AskAnswer struct {
	Answer string `json:"answer"`
	Text   string `json:"text,omitempty"`
}

// Asker – hỏi rồi chờ tới khi người dùng trả lời hoặc ctx huỷ (hết giờ / Dừng).
type Asker func(ctx context.Context, q AskQuestion) (AskAnswer, error)

func (e *Engine) askUser(ctx context.Context, s model.Step) (map[string]any, error) {
	q := AskQuestion{Ref: s.Ref, Message: strings.TrimSpace(s.Message), Input: s.AskInput, TimeoutMs: s.TimeoutMs}
	for _, line := range strings.Split(s.AskItems, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			q.Items = append(q.Items, line)
		}
	}
	start := time.Now()
	out := func(answer, text string) map[string]any {
		return map[string]any{"answer": answer, "text": text, "waitedMs": time.Since(start).Milliseconds()}
	}
	if e.ask == nil {
		e.note("lượt chạy này không có người trả lời (hẹn giờ / CLI / API) – đi cổng timeout")
		return out(model.PortTimeout, ""), nil
	}
	actx, cancel := ctx, context.CancelFunc(func() {})
	if s.TimeoutMs > 0 {
		actx, cancel = context.WithTimeout(ctx, time.Duration(s.TimeoutMs)*time.Millisecond)
	}
	defer cancel()
	e.update(true, func(p *Progress) {
		p.Ask, p.Wait = &q, &WaitProgress{Kind: "ask", TimeoutMs: int64(s.TimeoutMs), What: cut(q.Message, 40)}
	})
	defer e.update(true, func(p *Progress) { p.Ask, p.Wait = nil, nil })
	a, err := e.ask(actx, q)
	switch {
	case ctx.Err() != nil:
		return nil, ctx.Err()
	case errors.Is(err, context.DeadlineExceeded):
		return out(model.PortTimeout, ""), nil
	case err != nil:
		return nil, err
	case a.Answer != model.PortApprove:
		return out(model.PortDeny, a.Text), nil
	}
	return out(model.PortApprove, a.Text), nil
}

func cut(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}
