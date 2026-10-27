package script

import (
	"fmt"
	"slices"
	"strings"

	"ghosthand/internal/model"
)

// Cạnh dạng chữ cho AI (MCP): mỗi dòng một chuỗi node "n1>n2>n3", cổng ghi sau node nguồn "n2.fail>n6.next>n4>n2";
// không ghi cổng = success. Gọn hơn ~4 lần [{id, from, port, to}] – mỗi cổng tối đa một cạnh nên (nguồn, cổng) đủ xác
// định cạnh, id cạnh để app tự đặt.

// ParseFlow – dòng flow → cạnh (from / to giữ id hoặc ref như AI ghi, RefsToIDs đổi sau).
func ParseFlow(lines []string) ([]model.Edge, error) {
	var out []model.Edge
	for i, line := range lines {
		toks := strings.Split(strings.ReplaceAll(line, "->", ">"), ">")
		if len(toks) < 2 {
			return nil, flowErr(i, line, "cần ít nhất hai node, vd n1>n2")
		}
		for j := range toks {
			toks[j] = strings.TrimSpace(toks[j])
		}
		for j := 0; j < len(toks)-1; j++ {
			from, port, _ := strings.Cut(toks[j], ".")
			if port == "" {
				port = model.PortSuccess
			}
			to := toks[j+1]
			if strings.Contains(to, ".") && j+1 == len(toks)-1 {
				return nil, flowErr(i, line, fmt.Sprintf("%q: cổng chỉ ghi ở node nguồn, node cuối dòng không có cổng", to))
			}
			to, _, _ = strings.Cut(to, ".")
			if from == "" || to == "" {
				return nil, flowErr(i, line, "thiếu node giữa hai dấu >")
			}
			out = append(out, model.Edge{From: from, Port: port, To: to})
		}
	}
	return out, nil
}

func flowErr(i int, line, msg string) error {
	return &model.ScriptError{Field: "flow", Msg: fmt.Sprintf("flow[%d] %q: %s", i, line, msg)}
}

// FlowText – cạnh của kịch bản → dòng flow theo ref. Đi node theo FlowOrder, mỗi cổng còn cạnh mở một dòng rồi nối
// tiếp qua cổng đầu (PortsOf) của node đích; gặp node đã ghi thì dừng dòng (vòng lặp / nhánh nhập lại).
func FlowText(sc model.Script) []string {
	byID := make(map[string]model.Step, len(sc.Steps))
	for _, s := range sc.Steps {
		byID[s.ID] = s
	}
	ref := func(id string) string {
		if s, ok := byID[id]; ok && s.Ref != "" {
			return s.Ref
		}
		return id
	}
	used := make([]bool, len(sc.Edges))
	// next – cạnh chưa ghi của node theo thứ tự cổng; cạnh lệch cổng (sửa tay file) xếp sau
	next := func(id string) int {
		best, rank := -1, 0
		ports := model.PortsOf(byID[id])
		for i, e := range sc.Edges {
			if used[i] || e.From != id {
				continue
			}
			r := slices.Index(ports, e.Port)
			if r < 0 {
				r = len(ports)
			}
			if best < 0 || r < rank {
				best, rank = i, r
			}
		}
		return best
	}
	seen := map[string]bool{}
	var lines []string
	for _, id := range model.FlowOrder(sc) {
		for i := next(id); i >= 0; i = next(id) {
			var b strings.Builder
			cur := id
			seen[cur] = true
			for i >= 0 {
				e := sc.Edges[i]
				used[i] = true
				b.WriteString(ref(cur))
				if e.Port != model.PortSuccess {
					b.WriteString("." + e.Port)
				}
				b.WriteString(">")
				cur = e.To
				if seen[cur] {
					break
				}
				seen[cur] = true
				i = next(cur)
			}
			b.WriteString(ref(cur))
			lines = append(lines, b.String())
		}
	}
	return lines
}
