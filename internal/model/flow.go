package model

import (
	"regexp"
	"time"
)

// Flow (bước 20): kịch bản là đồ thị – node (Step) + cạnh (Edge). Mỗi node chạy xong trả StepResult; cổng ra (Port)
// trong kết quả chọn cạnh đi tiếp. Cổng fail không nối = dừng kịch bản báo lỗi; cổng khác không nối = kết thúc.

// Cổng ra.
const (
	PortSuccess = "success"
	PortFail    = "fail"
)

// StepResult.Status
const (
	StatusSuccess   = "success"
	StatusFail      = "fail"
	StatusSkipped   = "skipped"   // node tắt – đi tiếp cổng success
	StatusCancelled = "cancelled" // người dùng dừng / hết thời gian chạy
)

// StepError.Code – loại lỗi, để UI / AI xử lý theo loại thay vì đọc chữ.
const (
	ErrNotFound       = "not_found"     // chờ ảnh / chữ / màu hết giờ không thấy
	ErrHTTPStatus     = "http_status"   // HTTP trả mã ngoài 2xx (output status / body vẫn có)
	ErrNetwork        = "network"       // HTTP không gửi được: sai địa chỉ, mất mạng, hết giờ chờ
	ErrMCP            = "mcp_error"     // MCP server ngoài lỗi: không nối được, hết giờ, tool báo isError
	ErrAI             = "ai_error"      // nhà cung cấp AI từ chối (key sai, hết hạn mức, model không có…) hoặc trả không đúng dạng cần
	ErrTimeout        = "timeout"       // quá thời gian khác
	ErrPermission     = "permission"    // thiếu quyền (Screen Recording, Accessibility)
	ErrInvalidInput   = "invalid_input" // dữ liệu node sai lúc chạy (biến trống, điểm ngoài màn…)
	ErrCancelled      = "cancelled"
	ErrEnd            = "end"             // node Kết thúc báo thất bại (lời nhắn của người soạn)
	ErrBrowser        = "browser"         // không nối được trình duyệt (Chrome của app chưa mở / mất kết nối) – bước 25d
	ErrExitCode       = "exit_code"       // lệnh (node Chạy lệnh) thoát với mã ≠ 0 (output stdout / stderr / exitCode vẫn có)
	ErrWindowMismatch = "window_mismatch" // node chuột / phím đặt onlyInWindow nhưng cửa sổ đích mất hoặc không ở trước – chưa thao tác gì
	ErrInternal       = "internal"
)

// StepResult – kết quả một lần chạy node. Engine gửi lên UI (event engine:node), lưu vào nhật ký chạy;
// node sau đọc qua biến {{n2.status}}, {{n2.output.x}}, {{n2.error.message}}.
type StepResult struct {
	NodeID     string         `json:"nodeId"`
	Ref        string         `json:"ref"`
	Status     string         `json:"status"`
	Port       string         `json:"port,omitempty"` // cổng đi ra ("" khi bị huỷ)
	Output     map[string]any `json:"output,omitempty"`
	Error      *StepError     `json:"error,omitempty"`
	Logs       []LogLine      `json:"logs,omitempty"`
	Attempts   int            `json:"attempts"`          // số lần chạy (1 + số lần thử lại đã dùng)
	Loop       int            `json:"loop"`              // vòng thứ mấy của kịch bản, từ 1
	Shot       string         `json:"shot,omitempty"`    // ảnh màn hình lúc node thất bại (file trong lịch sử chạy, runlog.go)
	Changes    map[string]any `json:"changes,omitempty"` // phần tử mới / mất / đổi giá trị so với sau node trước (chỉ khi AI xin shots: each – engine/changes.go)
	StartedAt  time.Time      `json:"startedAt"`
	DurationMs int64          `json:"durationMs"`
}

type StepError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	// Detail – dữ liệu có cấu trúc để AI / người tự sửa node (bước 31b): chỗ khớp nhất, chữ đọc được, màu thật…
	// và "context" (cửa sổ đang trước, chuột, màn hình) – xem engine/detail.go.
	Detail map[string]any `json:"detail,omitempty"`
}

type LogLine struct {
	AtMs  int64  `json:"atMs"`  // ms tính từ lúc node bắt đầu
	Level string `json:"level"` // info | warn | error
	Msg   string `json:"msg"`
}

// PortsOf – cổng ra hợp lệ của node, theo thứ tự hiện trên thẻ (trên → dưới). frontend/src/flow/model.ts cùng công thức.
func PortsOf(s Step) []string {
	switch s.Type {
	case StepIf:
		return []string{PortTrue, PortFalse}
	case StepSwitch:
		return casePorts(s.Cases, PortDefault)
	case StepSwitchScreen:
		return casePorts(s.Cases, PortNone)
	case StepCounter:
		return []string{PortNext, PortDone}
	case StepForEach:
		return []string{PortItem, PortDone}
	case StepEnd:
		return []string{}
	case StepSetVar, StepCalc, StepTextSplit, StepTextClean:
		return []string{PortSuccess}
	case StepApp:
		if s.AppOp == AppCheck {
			return []string{PortYes, PortNo}
		}
	}
	return []string{PortSuccess, PortFail}
}

func HasPort(s Step, port string) bool {
	for _, p := range PortsOf(s) {
		if p == port {
			return true
		}
	}
	return false
}

var refPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,31}$`)

// ValidRef: mã node dùng được trong biến {{ref.output.x}} – chữ cái đầu, chữ / số / _, không trùng tên dành riêng.
func ValidRef(r string) bool {
	return refPattern.MatchString(r) && r != "vars" && r != "last" && r != "secret"
}

// EdgeOut trả node đích của cổng (from, port), "" nếu cổng chưa nối.
func EdgeOut(edges []Edge, from, port string) string {
	for _, e := range edges {
		if e.From == from && e.Port == port {
			return e.To
		}
	}
	return ""
}

// FlowOrder – thứ tự hiển thị node (đánh số marker overlay, Xem trước, form Chạy): duyệt sâu từ start, ở mỗi node đi
// các cổng theo thứ tự PortsOf (nhánh success / true / case đầu trước), node đã gặp thì bỏ qua; node không đi tới được
// xếp cuối theo thứ tự trong mảng. frontend/src/flow.ts phải cùng công thức (test chung testdata/flow_order.json).
func FlowOrder(sc Script) []string {
	byID := make(map[string]Step, len(sc.Steps))
	for _, s := range sc.Steps {
		byID[s.ID] = s
	}
	seen := map[string]bool{}
	order := make([]string, 0, len(sc.Steps))
	var stack []string
	if _, ok := byID[sc.Start]; ok {
		stack = append(stack, sc.Start)
	}
	for len(stack) > 0 {
		id := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if seen[id] {
			continue
		}
		seen[id] = true
		order = append(order, id)
		ports := PortsOf(byID[id])
		for i := len(ports) - 1; i >= 0; i-- { // đẩy ngược để cổng đầu được lấy ra trước
			if to := EdgeOut(sc.Edges, id, ports[i]); to != "" && !seen[to] {
				if _, ok := byID[to]; ok {
					stack = append(stack, to)
				}
			}
		}
	}
	for _, s := range sc.Steps {
		if !seen[s.ID] {
			order = append(order, s.ID)
		}
	}
	return order
}

// ReachableFrom – các node đi tới được từ start theo mọi cạnh (node còn lại sẽ không bao giờ chạy – UI cảnh báo).
func ReachableFrom(sc Script) map[string]bool {
	seen := map[string]bool{}
	stack := []string{}
	if sc.Start != "" {
		stack = append(stack, sc.Start)
	}
	for len(stack) > 0 {
		id := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if seen[id] {
			continue
		}
		seen[id] = true
		for _, e := range sc.Edges {
			if e.From == id {
				stack = append(stack, e.To)
			}
		}
	}
	return seen
}
