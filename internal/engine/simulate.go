package engine

import (
	"fmt"
	"maps"

	"ghosthand/internal/model"
)

// Chạy thử khô (bước 31c, simulate_script): đi hết flow mà không đụng máy. Node điều khiển (Nếu, Đếm, biến, tính…)
// chạy thật để nhánh / biến đúng như khi chạy; node còn lại (click, gõ, chờ ảnh, HTTP, shell…) không chạy mà trả kết
// quả giả theo kịch bản AI đưa. Node điều khiển nhìn màn hình (Nếu có điều kiện ảnh / chữ, Rẽ nhánh theo màn hình) nên
// được cho cổng ra qua Outcomes, nếu không sẽ nhìn màn hình thật.

// Simulate – kịch bản giả lập; khoá là id hoặc ref node.
type Simulate struct {
	Outcomes map[string]string         // cổng ra node đi tới (success mặc định; fail = lỗi not_found; true / yes / case:… tuỳ node)
	Outputs  map[string]map[string]any // output giả của node (cho {{n2.output.text}} của node sau); thêm "simulated": true
}

func (m *Simulate) pick(s model.Step) (string, bool) {
	if m == nil {
		return "", false
	}
	if p, ok := m.Outcomes[s.ID]; ok {
		return p, true
	}
	p, ok := m.Outcomes[s.Ref]
	return p, ok
}

func (m *Simulate) output(s model.Step) map[string]any {
	out := map[string]any{"simulated": true}
	if m == nil {
		return out
	}
	if o, ok := m.Outputs[s.ID]; ok {
		maps.Copy(out, o)
	} else if o, ok := m.Outputs[s.Ref]; ok {
		maps.Copy(out, o)
	}
	return out
}

// simStep – kết quả giả của node rs. handled=false: node điều khiển không có cổng chỉ định → chạy thật.
func (e *Engine) simStep(rs model.Step, logf func(level, format string, a ...any)) (port string, out map[string]any, err error, handled bool) {
	if e.sim == nil {
		return "", nil, nil, false
	}
	port, forced := e.sim.pick(rs)
	if model.IsControl(rs.Type) && !forced {
		return "", nil, nil, false
	}
	if !forced {
		port = model.PortSuccess
	}
	logf("info", "chạy thử khô – không đụng máy, cổng %s", port)
	out = e.sim.output(rs)
	if port == model.PortFail && !model.IsControl(rs.Type) {
		return port, out, &notFoundErr{msg: fmt.Sprintf("giả lập: %s thất bại theo kịch bản chạy thử", rs.Ref)}, true
	}
	return port, out, nil, true
}
