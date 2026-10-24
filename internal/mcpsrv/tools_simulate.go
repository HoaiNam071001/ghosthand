package mcpsrv

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

// Chạy thử khô (bước 31c): AI kiểm tra nhánh / biến của flow trước khi chạy thật, không đụng chuột / phím / file / mạng.

const simTimeout = 15 * time.Second

type simulateIn struct {
	Path     string                    `json:"path,omitempty" jsonschema:"kịch bản đã lưu (đường dẫn hoặc tên); bỏ trống khi gửi script"`
	Script   any                       `json:"script,omitempty" jsonschema:"kịch bản tạm (dạng như create_script) – không lưu file"`
	Inputs   map[string]any            `json:"inputs,omitempty" jsonschema:"giá trị input; thiếu thì lấy mặc định"`
	Outcomes map[string]string         `json:"outcomes,omitempty" jsonschema:"{id|ref node: cổng ra node đi tới} – mặc định success. fail = node thất bại (not_found). Node điều khiển nhìn màn hình (if ảnh / chữ, switchScreen) cần cổng ở đây (true / false / case:<key>…), node điều khiển khác chạy thật theo biến"`
	Outputs  map[string]map[string]any `json:"outputs,omitempty" jsonschema:"{id|ref node: output giả} – để {{n2.output.text}} của node sau có giá trị (vd nội dung chờ chữ / đọc web)"`
	From     string                    `json:"from,omitempty" jsonschema:"id / ref node bắt đầu"`
	StopAt   string                    `json:"stopAt,omitempty" jsonschema:"id / ref node: xong node này thì dừng"`
}

type simStep struct {
	Ref    string         `json:"ref"`
	Type   string         `json:"type"`
	Status string         `json:"status"`
	Port   string         `json:"port,omitempty"`
	Output map[string]any `json:"output,omitempty"`
	Error  string         `json:"error,omitempty"`
}

func (s *Server) addSimulateTools() {
	addTool(s, KindRead, &mcp.Tool{Name: "simulate_script", Description: "Chạy thử khô kịch bản: đi hết flow nhưng KHÔNG đụng máy (không chuột / phím / file / mạng / lệnh). " +
		"Node điều khiển (Nếu, Đếm, Lặp, biến, tính, xử lý chữ) chạy thật nên nhánh và biến đúng như khi chạy; node còn lại trả kết quả giả theo outcomes / outputs. " +
		"Trả đường đi đã qua (ref, cổng, output), node không bao giờ tới (unvisited), outcomes thừa (unusedOutcomes) và lỗi cấu hình / biến nếu có. Dùng trước run_script để kiểm tra nhánh."}, s.simulate)
}

func (s *Server) simulate(ctx context.Context, _ *mcp.CallToolRequest, in simulateIn) (*mcp.CallToolResult, any, error) {
	sc, err := s.simSource(in)
	if err != nil {
		return fail(err)
	}
	sim := &engine.Simulate{Outcomes: map[string]string{}, Outputs: map[string]map[string]any{}}
	for k, port := range in.Outcomes {
		id := nodeID(sc, k)
		st, found := stepByID(sc, id)
		if !found {
			return fail(fmt.Errorf("outcomes: không có node %q", k))
		}
		if !model.HasPort(st, port) {
			return fail(fmt.Errorf("outcomes: node %s (%s) không có cổng %q", st.Ref, st.Type, port))
		}
		sim.Outcomes[id] = port
	}
	for k, o := range in.Outputs {
		id := nodeID(sc, k)
		if _, found := stepByID(sc, id); !found {
			return fail(fmt.Errorf("outputs: không có node %q", k))
		}
		sim.Outputs[id] = o
	}
	resolved, err := script.ResolveInputs(sc, in.Inputs)
	if err != nil {
		return fail(err)
	}
	resolved.Loops = 1
	if from := nodeID(resolved, in.From); from != "" {
		resolved = script.RunFrom(resolved, from, false)
	}
	var screen model.Rect
	for _, d := range s.back.Displays() {
		if d.Main {
			screen = d.Rect
		}
	}
	secrets := map[string]string{}
	for _, n := range s.back.SecretNames() {
		secrets[n] = "(bí mật)"
	}
	var path []simStep
	byID := map[string]model.Step{}
	for _, st := range resolved.Steps {
		byID[st.ID] = st
	}
	eng := engine.New(nil, resolved, engine.Options{Screen: screen, Displays: nil, Simulate: sim, Secrets: secrets, StopAt: nodeID(resolved, in.StopAt),
		OnNode: func(r model.StepResult) {
			ss := simStep{Ref: r.Ref, Type: byID[r.NodeID].Type, Status: r.Status, Port: r.Port, Output: trimOutput(r.Output)}
			if r.Error != nil {
				ss.Error = r.Error.Message
			}
			path = append(path, ss)
		}})
	rctx, cancel := context.WithTimeout(ctx, simTimeout)
	defer cancel()
	runErr := eng.Run(rctx)

	seen := map[string]bool{}
	for _, p := range path {
		seen[p.Ref] = true
	}
	unvisited, unused := []string{}, []string{}
	for _, st := range resolved.Steps {
		if !seen[st.Ref] && st.Enabled {
			unvisited = append(unvisited, st.Ref)
		}
	}
	for id := range sim.Outcomes {
		if ref := byID[id].Ref; !seen[ref] {
			unused = append(unused, ref)
		}
	}
	slices.Sort(unused)
	out := map[string]any{"path": path, "visited": len(path), "unvisited": unvisited, "ok": runErr == nil}
	if len(unused) > 0 {
		out["unusedOutcomes"] = unused
	}
	if runErr != nil {
		out["error"] = errorBody(runErr)
	}
	if eng.Reached() {
		out["reached"] = true
	}
	return ok(out)
}

// simSource – kịch bản cần thử: file đã lưu hoặc kịch bản tạm AI gửi.
func (s *Server) simSource(in simulateIn) (model.Script, error) {
	switch {
	case in.Script != nil && in.Path != "":
		return model.Script{}, errors.New("chỉ gửi một trong path hoặc script")
	case in.Script != nil:
		return s.parseScript(in.Script)
	}
	path, err := s.resolvePath(in.Path)
	if err != nil {
		return model.Script{}, err
	}
	sc, _, err := s.back.ReadScript(path)
	return sc, err
}

func stepByID(sc model.Script, id string) (model.Step, bool) {
	i := slices.IndexFunc(sc.Steps, func(s model.Step) bool { return s.ID == id })
	if i < 0 {
		return model.Step{}, false
	}
	return sc.Steps[i], true
}

// trimOutput – output gọn cho AI: bỏ khoá chung (thời gian) và cắt chuỗi dài.
func trimOutput(o map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range o {
		if k == "startedAt" || k == "durationMs" {
			continue
		}
		if str, isStr := v.(string); isStr && len([]rune(str)) > 200 {
			v = string([]rune(str)[:200]) + "…"
		}
		out[k] = v
	}
	return out
}
