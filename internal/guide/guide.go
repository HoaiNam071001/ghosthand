// Package guide – nội dung modal Hướng dẫn (bước 51), dùng chung cho người (frontend import thẳng file JSON) và AI (MCP).
// Chỉ giữ phần chưa có ở chỗ khác: làm gì / dùng khi của node nằm ở frontend flow/nodeInfo.ts, output ở model.OutputsOf,
// hệ điều hành ở model/platform.go. Không phụ thuộc UI / thiết bị.
package guide

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
)

//go:embed chapters.json
var chaptersJSON []byte

//go:embed nodes.json
var nodesJSON []byte

// Các loại khối trong chương / trang node. Chữ trong khối nhận cú pháp nội dòng: **đậm**, *nghiêng*, `mã`,
// [[node:<InfoKey>]] (link sang trang node), [[chapter:<id>]] (link sang chương).
const (
	KindPara   = "p"      // đoạn chữ
	KindHead   = "h"      // tiêu đề mục con
	KindList   = "list"   // danh sách gạch đầu dòng (items)
	KindSteps  = "steps"  // các bước làm theo thứ tự (items)
	KindTable  = "table"  // bảng (head + rows)
	KindTip    = "tip"    // mẹo
	KindWarn   = "warn"   // cảnh báo
	KindScene  = "scene"  // hoạt hoạ minh hoạ node (scene = InfoKey, bước 47) + text làm chú thích
	KindSample = "sample" // nút Mở mẫu thử (sample = id mẫu, bước 33) + text mô tả
)

var kinds = map[string]bool{KindPara: true, KindHead: true, KindList: true, KindSteps: true, KindTable: true,
	KindTip: true, KindWarn: true, KindScene: true, KindSample: true}

type Block struct {
	Kind   string     `json:"kind"`
	Text   string     `json:"text,omitempty"`
	Items  []string   `json:"items,omitempty"`
	Head   []string   `json:"head,omitempty"`
	Rows   [][]string `json:"rows,omitempty"`
	Scene  string     `json:"scene,omitempty"`
	Sample string     `json:"sample,omitempty"`
}

// Chapter – một chương chung; Group là nhóm ở mục lục (Bắt đầu, Dùng app, Cài đặt…).
type Chapter struct {
	ID      string  `json:"id"`
	Group   string  `json:"group"`
	Title   string  `json:"title"`
	Summary string  `json:"summary"`
	Blocks  []Block `json:"blocks"`
}

// Node – phần riêng của trang một loại node (khoá = InfoKey ở frontend: loại node hoặc biến thể như waitText).
type Node struct {
	Tech     string   `json:"tech,omitempty"`     // công nghệ bên dưới
	Works    []string `json:"works,omitempty"`    // chạy được với web / app nào
	Accuracy string   `json:"accuracy,omitempty"` // độ chính xác theo ngữ cảnh
	Speed    string   `json:"speed,omitempty"`
	Good     []string `json:"good,omitempty"`   // nên dùng khi
	Avoid    []string `json:"avoid,omitempty"`  // không nên dùng khi (thay bằng node nào)
	Tips     []string `json:"tips,omitempty"`   // mẹo / lỗi hay gặp
	Fields   []string `json:"fields,omitempty"` // trường quan trọng của node (tên trường: giải thích)
	Samples  []string `json:"samples,omitempty"`
	Blocks   []Block  `json:"blocks,omitempty"`
}

type Guide struct {
	Chapters []Chapter       `json:"chapters"`
	Nodes    map[string]Node `json:"nodes"`
}

// Load đọc nội dung nhúng và kiểm tra định dạng (id chương trùng, loại khối lạ, khối thiếu dữ liệu).
func Load() (Guide, error) {
	var g Guide
	if err := json.Unmarshal(chaptersJSON, &g.Chapters); err != nil {
		return g, fmt.Errorf("chapters.json: %w", err)
	}
	if err := json.Unmarshal(nodesJSON, &g.Nodes); err != nil {
		return g, fmt.Errorf("nodes.json: %w", err)
	}
	seen := map[string]bool{}
	for _, c := range g.Chapters {
		if c.ID == "" || seen[c.ID] {
			return g, fmt.Errorf("chương %q: id trống hoặc trùng", c.ID)
		}
		seen[c.ID] = true
		if err := checkBlocks(c.Blocks); err != nil {
			return g, fmt.Errorf("chương %s: %w", c.ID, err)
		}
	}
	for k, n := range g.Nodes {
		if err := checkBlocks(n.Blocks); err != nil {
			return g, fmt.Errorf("node %s: %w", k, err)
		}
	}
	return g, nil
}

func checkBlocks(bs []Block) error {
	for i, b := range bs {
		if !kinds[b.Kind] {
			return fmt.Errorf("khối %d: loại %q lạ", i, b.Kind)
		}
		bad := false
		switch b.Kind {
		case KindList, KindSteps:
			bad = len(b.Items) == 0
		case KindTable:
			bad = len(b.Head) == 0 || len(b.Rows) == 0
			for _, r := range b.Rows {
				bad = bad || len(r) != len(b.Head)
			}
		case KindScene:
			bad = b.Scene == ""
		case KindSample:
			bad = b.Sample == ""
		default:
			bad = b.Text == ""
		}
		if bad {
			return fmt.Errorf("khối %d (%s): thiếu dữ liệu hoặc số cột lệch", i, b.Kind)
		}
	}
	return nil
}

// Manual – bản cho AI đọc bao quát: chương đầy đủ + mỗi node chỉ khoá / công nghệ / tốc độ (chi tiết: Guide.Nodes[khoá]).
func (g Guide) Manual() map[string]any {
	nodes := make([]map[string]string, 0, len(g.Nodes))
	keys := make([]string, 0, len(g.Nodes))
	for k := range g.Nodes {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		n := g.Nodes[k]
		nodes = append(nodes, map[string]string{"key": k, "tech": n.Tech, "speed": n.Speed})
	}
	return map[string]any{"chapters": g.Chapters, "nodes": nodes,
		"note": "Chi tiết một node (ngữ cảnh, độ chính xác, mẹo, trường): get_node_guide type=<key>."}
}
