package main

import (
	"context"
	"errors"
	"fmt"
	"image"
	"strconv"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"ghosthand/internal/device"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/vision"
)

// AI chạy kịch bản qua MCP (bước 31b): công tắc AI trong Cài đặt (store.MCPSettings) – chỉ soạn / hỏi trước khi chạy /
// tự chạy. Hỏi: event "ai:ask" → hộp hỏi (AIRunDialog.tsx) → AnswerAIRun. Trần thời gian mỗi lượt theo Cài đặt;
// thao tác nguy hiểm vẫn theo AllowDanger như mọi nguồn chạy.

const aiAskTimeout = 90 * time.Second

// Câu trả lời hộp hỏi (AnswerAIRun).
const (
	aiAllowOnce   = "once"
	aiAllowScript = "script" // cho phép kịch bản này đến khi đóng app
	aiDeny        = "deny"
)

// AIAsk – nội dung hộp hỏi "AI muốn chạy kịch bản" (event ai:ask).
type AIAsk struct {
	ID     string   `json:"id"`
	Script string   `json:"script"`
	Path   string   `json:"path"`
	Steps  int      `json:"steps"`
	From   string   `json:"from,omitempty"`   // ref node bắt đầu
	StopAt string   `json:"stopAt,omitempty"` // ref node dừng
	Nodes  []string `json:"nodes,omitempty"`  // ref cụm node
	Resume bool     `json:"resume,omitempty"` // chạy tiếp với kết quả lần trước
}

// aiGate – các câu hỏi đang chờ + kịch bản đã cho phép đến khi đóng app.
type aiGate struct {
	mu      sync.Mutex
	n       int
	pending map[string]chan string
	allowed map[string]bool // path
}

var errAIDenied = errors.New("người dùng không cho AI chạy kịch bản này – hỏi người dùng trước khi thử lại")

// aiAllowed hỏi quyền theo mức chạy của AI; nil = được chạy.
func (a *App) aiAllowed(ask AIAsk) error {
	switch store.CurrentSettings().MCP.RunMode() {
	case store.AIRunEdit:
		return errors.New("Cài đặt của app chỉ cho AI soạn kịch bản, không cho chạy – người dùng tự bấm Chạy (open_in_app)")
	case store.AIRunAuto:
		return nil
	}
	g := &a.ai
	g.mu.Lock()
	if ask.Path != "" && g.allowed[ask.Path] { // kịch bản tạm (path "") nội dung đổi mỗi lần – luôn hỏi
		g.mu.Unlock()
		return nil
	}
	g.n++
	ask.ID = strconv.Itoa(g.n)
	ch := make(chan string, 1)
	g.pending[ask.ID] = ch
	g.mu.Unlock()
	defer func() {
		g.mu.Lock()
		delete(g.pending, ask.ID)
		g.mu.Unlock()
	}()

	a.showMain()
	a.emit("ai:ask", ask)
	select {
	case ans := <-ch:
		switch ans {
		case aiAllowScript:
			if ask.Path == "" {
				return nil
			}
			g.mu.Lock()
			g.allowed[ask.Path] = true
			g.mu.Unlock()
			return nil
		case aiAllowOnce:
			return nil
		}
		return errAIDenied
	case <-time.After(aiAskTimeout):
		a.emit("ai:ask-timeout", ask.ID)
		return errors.New("người dùng chưa trả lời câu hỏi cho phép chạy (hết 90 giây)")
	}
}

// AnswerAIRun – người dùng trả lời hộp hỏi id: once | script | deny.
func (a *App) AnswerAIRun(id, answer string) {
	a.ai.mu.Lock()
	ch := a.ai.pending[id]
	a.ai.mu.Unlock()
	if ch != nil {
		select { // bấm trả lời hai lần (nút + Enter) – lần sau bỏ, không chặn
		case ch <- answer:
		default:
		}
	}
}

// stopAIRun – công tắc AI vừa chuyển về Tắt / Chỉ soạn: huỷ lượt AI đang chạy, quên các kịch bản đã cho phép.
func (a *App) stopAIRun(m store.MCPSettings) {
	if m.Enabled && m.RunMode() != store.AIRunEdit {
		return
	}
	if st, err := a.sess.Status(""); err == nil && !st.Done() && st.Source == session.SourceAI {
		a.sess.Stop(st.RunID)
	}
	a.ai.mu.Lock()
	clear(a.ai.allowed)
	a.ai.mu.Unlock()
}

// Run – mcpsrv.Backend: đọc file, hỏi quyền, chạy với trần thời gian của AI.
func (b mcpBackend) Run(sc model.Script, path string, values map[string]any, opt session.Options) (string, error) {
	refs := map[string]string{}
	for _, s := range sc.Steps {
		refs[s.ID] = s.Ref
	}
	ask := AIAsk{Script: sc.Name, Path: path, Steps: len(sc.Steps), From: refs[opt.From], StopAt: refs[opt.StopAt], Resume: opt.SeedRun != ""}
	for _, id := range opt.Nodes {
		ask.Nodes = append(ask.Nodes, refs[id])
	}
	if err := b.a.aiAllowed(ask); err != nil {
		return "", err
	}
	opt.MaxMinutes = store.CurrentSettings().MCP.Limit()
	id, err := b.a.sess.Start(sc, values, opt)
	if errors.Is(err, session.ErrBusy) {
		return "", fmt.Errorf("%w – chờ lần chạy đang diễn ra xong (wait_run) hoặc stop_run", err)
	}
	return id, err
}

func (b mcpBackend) Wait(ctx context.Context, id string) error {
	_, err := b.a.sess.Wait(ctx, id)
	return err
}
func (b mcpBackend) Trace(id string) (session.Trace, error) { return b.a.sess.Trace(id) }
func (b mcpBackend) Stop(id string) bool                    { return b.a.sess.Stop(id) }

// Capture – chụp vùng r; cửa sổ app đang ở màn chính thì vẫn chụp như người dùng thấy (không ẩn – AI cần thấy cả app).
func (b mcpBackend) Capture(r model.Rect) (image.Image, error) {
	if err := device.CaptureArea(r, device.Displays()); err != nil {
		return nil, err
	}
	return device.RobotgoScreen{}.Capture(r)
}
func (b mcpBackend) ReadText(img image.Image) ([]vision.TextLine, error) {
	return device.SystemOCR{}.ReadText(img)
}
func (b mcpBackend) Elements(app string) ([]element.Node, error) {
	return device.SystemElements{}.Elements(app)
}
func (b mcpBackend) Windows() ([]model.WindowInfo, error) { return device.SystemWindows{}.List() }

// showMain – đưa màn chính lên (hộp hỏi cần chỗ; app mở nền thì từ giờ là app thường).
func (a *App) showMain() {
	a.mu.Lock()
	a.background = false
	a.mu.Unlock()
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
}
