// Package session – phiên chạy kịch bản tách khỏi Wails (bước 22): Start trả runId ngay, trạng thái / chờ / dừng theo
// runId. App (nút Chạy), API local, CLI, hẹn giờ và MCP (31) đều gọi cùng Manager – không chỗ nào tự dựng engine.
// Event gửi qua Emitter (main nối sang Wails + SSE của API), package không import Wails.
package session

import (
	"context"
	"errors"
	"fmt"
	"image"
	"slices"
	"strings"
	"sync"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// Nguồn của lần chạy (Options.Source) – ghi vào lịch sử; khác SourceUser thì frontend tự thu thành thanh mini.
const (
	SourceUser     = "user"
	SourceSchedule = "schedule"
	SourceCLI      = "cli"
	SourceAPI      = "api"
	SourceAI       = "ai"
)

// Lý do dừng gửi kèm event "engine:stopped".
const (
	StopByF8     = "f8"
	StopByCorner = "corner"
)

// Trạng thái phiên (Status.State).
const (
	StateCountdown = "countdown"
	StateRunning   = "running"
	StateSuccess   = model.RunSuccess
	StateFail      = model.RunFail
	StateStopped   = model.RunStopped
)

const keepDone = 20 // giữ trạng thái chừng này phiên đã xong để /status hỏi lại được

// ErrBusy – đang có kịch bản chạy (một lúc chỉ một phiên: chung chuột / bàn phím).
var ErrBusy = errors.New("kịch bản đang chạy")

// ErrNotFound – runId không có (sai hoặc đã quá cũ).
var ErrNotFound = errors.New("không có lần chạy này")

// Emitter gửi event ra ngoài (Wails, SSE). data phải JSON hoá được.
type Emitter func(event string, data any)

// Options – cách chạy kịch bản. Trùng tên trường RunOptions cũ (frontend gửi nguyên).
type Options struct {
	Countdown int    `json:"countdown"`        // giây đếm ngược trước khi chạy
	Path      string `json:"path,omitempty"`   // file kịch bản – gom lịch sử theo kịch bản (chưa lưu: theo tên)
	Source    string `json:"source,omitempty"` // user (mặc định) | schedule | cli | api | ai
	Preset    string `json:"preset,omitempty"` // tên bộ giá trị input đã dùng – chỉ để hiện / ghi
	From      string `json:"from,omitempty"`   // debug: chạy một vòng bắt đầu từ node này thay cho start
	Only      bool   `json:"only,omitempty"`   // cùng From: chỉ chạy riêng node From (Thử node; AI chạy cụm dùng Nodes)
	Step      bool   `json:"step,omitempty"`   // debug: dừng trước mỗi node, Tiếp / F10 chạy node kế
	// chạy một phần (AI – 31b): chạy xong node StopAt thì dừng; Nodes = chỉ chạy cụm node này (cạnh ra ngoài cụm bị bỏ);
	// SeedRun = runId lần chạy trước – kết quả node + biến của nó nạp sẵn (chạy tiếp từ node lỗi với biến cũ)
	StopAt  string   `json:"stopAt,omitempty"`
	Nodes   []string `json:"nodes,omitempty"`
	SeedRun string   `json:"seedRun,omitempty"`
	// Pins – node ghim (31c, chạy từ app): không chạy, dùng kết quả đã ghim (id node → kết quả)
	Pins       map[string]model.StepResult `json:"pins,omitempty"`
	MaxMinutes int                         `json:"maxMinutes,omitempty"` // trần thời gian lượt chạy (AI) – kịch bản đặt dài hơn / không đặt thì dùng trần này
	ShotEach   bool                        `json:"shotEach,omitempty"`   // chụp màn sau mỗi node thành công (AI xin – shots: each)
	NoHistory  bool                        `json:"noHistory,omitempty"`  // không ghi lịch sử chạy (AI chạy kịch bản tạm – 46 B1)
	// dấu vân tay thao tác nguy hiểm người dùng vừa đồng ý (DangerCheck) – chạy được và ghi nhớ; trống = chỉ chạy khi đã đồng ý trước đó
	ConfirmDanger string `json:"confirmDanger,omitempty"`
}

// Status – trạng thái một phiên (GET /status, event "run:ended").
type Status struct {
	RunID      string           `json:"runId"`
	Script     string           `json:"script"`
	Path       string           `json:"path,omitempty"`
	Source     string           `json:"source"`
	Preset     string           `json:"preset,omitempty"`
	State      string           `json:"state"` // countdown | running | success | fail | stopped
	StartedAt  time.Time        `json:"startedAt"`
	DurationMs int64            `json:"durationMs"`
	Progress   *engine.Progress `json:"progress,omitempty"`
	Error      string           `json:"error,omitempty"`
	FailedStep string           `json:"failedStep,omitempty"` // node làm lần chạy dừng vì lỗi
	Reached    bool             `json:"reached,omitempty"`    // dừng vì đã chạy xong node StopAt
	TimedOut   bool             `json:"timedOut,omitempty"`   // dừng vì hết thời gian tối đa (kịch bản / trần mỗi lượt AI)
}

// Done – phiên đã kết thúc (thành công / lỗi / bị dừng).
func (s Status) Done() bool {
	return s.State == StateSuccess || s.State == StateFail || s.State == StateStopped
}

type run struct {
	status  Status // đọc / ghi dưới Manager.mu
	sc      model.Script
	opt     Options
	values  map[string]any
	secrets map[string]string // giá trị bí mật kịch bản dùng (chỉ trong bộ nhớ, engine che ở mọi kết quả)
	cancel  context.CancelFunc
	eng     *engine.Engine
	done    chan struct{}
	err     error // lỗi của lần chạy (nil khi xong / bị dừng) – đọc sau khi done đóng

	// vết chạy cho AI (Trace) – ghi dưới Manager.mu
	results []model.StepResult
	seed    *engine.Carry          // Options.SeedRun đã tra ra
	carry   *engine.Carry          // kết quả + biến vòng cuối (có khi xong) – SeedRun của lần sau
	shots   map[string]image.Image // ảnh lúc node lỗi theo StepResult.Shot
}

// Manager – một lúc chạy một phiên; giữ trạng thái vài phiên gần nhất.
type Manager struct {
	emit Emitter
	deps Deps
	// OnEnd chạy sau mỗi phiên (đã ghi lịch sử) – hẹn giờ gửi thông báo. Không chặn phiên kế.
	OnEnd func(Status, error)

	mu   sync.Mutex
	cur  *run
	runs map[string]*run
	ids  []string // thứ tự tạo, để bỏ phiên cũ
}

// New – Manager dùng thiết bị thật (Deps rỗng = mặc định).
func New(emit Emitter, deps Deps) *Manager {
	if emit == nil {
		emit = func(string, any) {}
	}
	return &Manager{emit: emit, deps: deps.withDefaults(), runs: map[string]*run{}}
}

// Validate áp giá trị input rồi kiểm tra như lúc chạy (frontend gọi trước khi thu cửa sổ thành mini bar).
func Validate(sc model.Script, values map[string]any) error {
	out, err := script.ResolveInputs(sc, values)
	if err != nil {
		return err
	}
	return script.ValidateScript(out, device.MainScreen())
}

// Validate – như Validate + báo thiếu bí mật {{secret.<tên>}} (kho bí mật của máy này).
func (m *Manager) Validate(sc model.Script, values map[string]any) error {
	if err := Validate(sc, values); err != nil {
		return err
	}
	_, err := m.secretsFor(sc)
	return err
}

// secretsFor lấy giá trị các bí mật kịch bản dùng; thiếu → lỗi nêu đủ tên (không bao giờ nêu giá trị).
func (m *Manager) secretsFor(sc model.Script) (map[string]string, error) {
	names := script.SecretRefs(sc)
	if k := aiDefaultSecret(sc, m.deps.AIDefault()); k != "" && !slices.Contains(names, k) {
		names = append(names, k)
	}
	if len(names) == 0 {
		return nil, nil
	}
	vals, missing, err := m.deps.Secrets.Resolve(context.Background(), names)
	if err != nil {
		return nil, &model.ScriptError{Field: "secret", Msg: err.Error()}
	}
	if len(missing) > 0 {
		return nil, &model.ScriptError{Field: "secret", Msg: fmt.Sprintf("thiếu bí mật: %s – thêm ở Cài đặt → Bí mật", strings.Join(missing, ", "))}
	}
	return vals, nil
}

// Start kiểm tra kịch bản (input, lỗi soạn, thao tác nguy hiểm) rồi chạy nền; trả runId ngay.
// Lỗi kiểm tra trả về ở đây, lỗi lúc chạy xem qua Wait / Status.
func (m *Manager) Start(sc model.Script, values map[string]any, opt Options) (string, error) {
	if opt.Source == "" {
		opt.Source = SourceUser
	}
	sc, seed, err := m.part(sc, opt)
	if err != nil {
		return "", err
	}
	sc, err = script.ResolveInputs(sc, values)
	if err != nil {
		return "", err
	}
	if err := script.ValidateScript(sc, m.deps.Screen()); err != nil {
		return "", err
	}
	canDanger, err := m.deps.AllowDanger(sc, opt.Path, opt.ConfirmDanger)
	if err != nil {
		return "", err
	}
	secretVals, err := m.secretsFor(sc)
	if err != nil {
		return "", err
	}
	m.mu.Lock()
	if m.cur != nil {
		m.mu.Unlock()
		return "", ErrBusy
	}
	now := m.deps.Now()
	id := m.newID(now)
	ctx, cancel := context.WithCancel(context.Background())
	r := &run{sc: sc, opt: opt, values: values, cancel: cancel, done: make(chan struct{}), seed: seed, secrets: secretVals,
		status: Status{RunID: id, Script: sc.Name, Path: opt.Path, Source: opt.Source, Preset: opt.Preset, State: StateCountdown, StartedAt: now}}
	m.cur = r
	m.remember(r)
	m.mu.Unlock()
	go m.exec(ctx, r, canDanger)
	return id, nil
}

// newID – runId theo giờ bắt đầu (trùng tên thư mục lịch sử chạy); trùng mili giây thì thêm hậu tố.
func (m *Manager) newID(t time.Time) string {
	base := store.NewRunID(t)
	id := base
	for n := 2; m.runs[id] != nil; n++ {
		id = fmt.Sprintf("%s-%d", base, n)
	}
	return id
}

func (m *Manager) remember(r *run) {
	m.runs[r.status.RunID] = r
	m.ids = append(m.ids, r.status.RunID)
	for len(m.ids) > keepDone+1 {
		old := m.runs[m.ids[0]]
		if old == m.cur {
			break
		}
		delete(m.runs, m.ids[0])
		m.ids = m.ids[1:]
	}
}

// Wait chờ phiên id kết thúc (hoặc ctx huỷ). Lỗi trả về là lỗi lúc chạy; bị dừng không tính là lỗi.
func (m *Manager) Wait(ctx context.Context, id string) (Status, error) {
	m.mu.Lock()
	r := m.runs[id]
	m.mu.Unlock()
	if r == nil {
		return Status{}, ErrNotFound
	}
	select {
	case <-r.done:
	case <-ctx.Done():
		return m.status(r), ctx.Err()
	}
	return m.status(r), r.err
}

// Status – trạng thái phiên id; id "" = phiên đang chạy (không có thì phiên gần nhất).
func (m *Manager) Status(id string) (Status, error) {
	m.mu.Lock()
	r := m.runs[id]
	if id == "" {
		r = m.cur
		if r == nil && len(m.ids) > 0 {
			r = m.runs[m.ids[len(m.ids)-1]]
		}
	}
	m.mu.Unlock()
	if r == nil {
		return Status{}, ErrNotFound
	}
	return m.status(r), nil
}

func (m *Manager) status(r *run) Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := r.status
	if s.Progress != nil {
		p := *s.Progress
		s.Progress = &p
	}
	return s
}

// Running – runId đang chạy ("" = không).
func (m *Manager) Running() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cur == nil {
		return ""
	}
	return m.cur.status.RunID
}

// Stop dừng phiên id ("" = phiên đang chạy). Trả false nếu id không phải phiên đang chạy.
func (m *Manager) Stop(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cur == nil || (id != "" && m.cur.status.RunID != id) {
		return false
	}
	m.cur.cancel()
	return true
}

// StopWith dừng phiên đang chạy và emit "engine:stopped" kèm lý do (F8, góc màn hình).
func (m *Manager) StopWith(reason string) {
	if m.Running() == "" {
		return
	}
	m.emit("engine:stopped", reason)
	m.Stop("")
}

// Pause / StepNext / Resume điều khiển phiên đang chạy; false nếu không có gì đang chạy.
func (m *Manager) Pause() bool    { return m.withEngine((*engine.Engine).Pause) }
func (m *Manager) StepNext() bool { return m.withEngine((*engine.Engine).Step) }
func (m *Manager) Resume() bool   { return m.withEngine((*engine.Engine).Resume) }

func (m *Manager) withEngine(f func(*engine.Engine) bool) bool {
	m.mu.Lock()
	r := m.cur
	m.mu.Unlock()
	if r == nil || r.eng == nil {
		return false
	}
	return f(r.eng)
}

// aiDefaultSecret – tên bí mật key AI mặc định, chỉ khi có node Hỏi AI để trống Key (sẽ dùng key mặc định).
func aiDefaultSecret(sc model.Script, d store.AISettings) string {
	refs := secrets.Refs(d.Key)
	if len(refs) != 1 {
		return ""
	}
	for _, s := range sc.Steps {
		if s.Type == model.StepAskAI && s.Enabled && strings.TrimSpace(s.AIKey) == "" {
			return refs[0]
		}
	}
	return ""
}
