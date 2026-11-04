package app

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/toast"
	"ghosthand/internal/winfloat"
)

// Node Hỏi người dùng (bước 56 D1): engine hỏi → event "run:ask" (thanh mini nở thành thẻ hỏi – AskCard.tsx; đang ở
// màn chính thì hiện hộp giữa màn) + thông báo hệ thống; người dùng bấm → AnswerAsk. Hết giờ / Dừng → "run:ask-done".

const askBarH = 320 // cao thanh mini lúc hỏi – đủ câu hỏi, vài dòng danh sách, ô nhập, 2 nút

// UserAsk – nội dung event run:ask.
type UserAsk struct {
	ID string `json:"id"`
	engine.AskQuestion
}

// askGate – các câu hỏi đang chờ trả lời.
type askGate struct {
	mu      sync.Mutex
	n       int
	pending map[string]chan engine.AskAnswer
}

// askUser – engine.Asker của phiên chạy trong app.
func (a *App) askUser(ctx context.Context, q engine.AskQuestion) (engine.AskAnswer, error) {
	g := &a.asks
	g.mu.Lock()
	g.n++
	id := strconv.Itoa(g.n)
	ch := make(chan engine.AskAnswer, 1)
	g.pending[id] = ch
	g.mu.Unlock()
	defer func() {
		g.mu.Lock()
		delete(g.pending, id)
		g.mu.Unlock()
		a.emit("run:ask-done", id)
		a.askBar(false)
	}()
	a.askBar(true)
	a.emit("run:ask", UserAsk{ID: id, AskQuestion: q})
	go func() { // thông báo chỉ để người dùng để ý – lỗi (thiếu quyền Thông báo) thì thôi
		tctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = toast.System{}.Show(tctx, "Ghosthand đang hỏi bạn", q.Message)
	}()
	select {
	case ans := <-ch:
		return ans, nil
	case <-ctx.Done():
		return engine.AskAnswer{}, ctx.Err()
	}
}

// AnswerAsk – người dùng trả lời câu hỏi id: approve | deny, text = chữ ô nhập.
func (a *App) AnswerAsk(id, answer, text string) {
	if answer != model.PortApprove {
		answer = model.PortDeny
	}
	a.asks.mu.Lock()
	ch := a.asks.pending[id]
	a.asks.mu.Unlock()
	if ch != nil {
		select { // bấm hai lần (nút + Enter) – lần sau bỏ
		case ch <- engine.AskAnswer{Answer: answer, Text: text}:
		default:
		}
	}
}

// askBar – thanh mini nở ra đủ chỗ cho thẻ hỏi và nhận phím (ô nhập); hỏi xong trả về như cũ.
func (a *App) askBar(on bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.ctx == nil || a.mode != ModeMinibar {
		return
	}
	h := miniBarH
	if on {
		h = askBarH
	}
	runtime.WindowSetSize(a.ctx, miniBarW, h)
	if on {
		runtime.WindowShow(a.ctx)
		winfloat.Set(true, true)
		return
	}
	winfloat.Minibar(a.running)
}
