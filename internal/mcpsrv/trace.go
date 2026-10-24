package mcpsrv

import (
	"bytes"
	"fmt"
	"image"
	"image/png"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/vision"
)

// Vết chạy gọn cho AI: mỗi node đã chạy một dòng, node lỗi có đủ chi tiết; chữ trước, ảnh sau (client không xem
// được ảnh vẫn dùng được).

const (
	maxTraceNodes = 40   // vòng lặp dài: chỉ trả chừng này node cuối
	maxStrLen     = 400  // chuỗi output dài (body HTTP, chữ đọc được) cắt bớt
	maxShots      = 2    // ảnh lúc lỗi gửi kèm (mới nhất)
	maxEachSent   = 3    // ảnh sau node (shots: each) gửi kèm mặc định (mới nhất) – ảnh khác AI xin theo tên
	maxWant       = 4    // ảnh AI xin theo tên mỗi lần
	imgMaxW       = 1280 // ảnh gửi AI rộng hơn thì thu nhỏ
)

type nodeView struct {
	ID       string           `json:"id"`
	Ref      string           `json:"ref"`
	Type     string           `json:"type,omitempty"`
	Status   string           `json:"status"`
	Port     string           `json:"port,omitempty"`
	Loop     int              `json:"loop,omitempty"`
	Attempts int              `json:"attempts,omitempty"`
	Ms       int64            `json:"ms"`
	Output   map[string]any   `json:"output,omitempty"`
	Error    *model.StepError `json:"error,omitempty"`
	Logs     []model.LogLine  `json:"logs,omitempty"`    // chỉ node lỗi
	Shot     string           `json:"shot,omitempty"`    // ảnh lúc lỗi / sau node (shots: each) – gửi kèm dưới hoặc xin bằng wait_run shots
	Changes  map[string]any   `json:"changes,omitempty"` // giao diện đổi gì sau node (shots: each) – biết click có tác dụng không mà không cần ảnh
	// rộng ảnh gửi kèm (px): toạ độ thật = error.detail.context.shotArea.x + px ảnh × shotArea.w / ShotW (y tương tự)
	ShotW int `json:"shotWidth,omitempty"`
}

func traceView(tr session.Trace, sc model.Script, shotW map[string]int) map[string]any {
	types := map[string]string{}
	for _, s := range sc.Steps {
		types[s.ID] = s.Type
	}
	res := tr.Results
	omitted := max(len(res)-maxTraceNodes, 0)
	nodes := make([]nodeView, 0, len(res)-omitted)
	for _, r := range res[omitted:] {
		n := nodeView{ID: r.NodeID, Ref: r.Ref, Type: types[r.NodeID], Status: r.Status, Port: r.Port, Loop: r.Loop,
			Attempts: r.Attempts, Ms: r.DurationMs, Output: trimMap(r.Output), Error: r.Error, Changes: r.Changes, ShotW: shotW[r.Shot]}
		if tr.Shots[r.Shot] != nil { // shots: each chỉ giữ ảnh mới nhất – ảnh đã bỏ thì không báo tên
			n.Shot = r.Shot
		}
		if r.Status == model.StatusFail {
			n.Logs = r.Logs
		}
		nodes = append(nodes, n)
	}
	v := map[string]any{"runId": tr.RunID, "script": tr.Script, "path": tr.Path, "state": tr.State, "done": tr.Done(),
		"durationMs": tr.DurationMs, "nodes": nodes}
	if omitted > 0 {
		v["omittedNodes"] = omitted
	}
	if tr.Reached {
		v["reached"] = true
	}
	if tr.TimedOut {
		v["timedOut"] = true
	}
	if tr.Error != "" {
		v["error"] = tr.Error
	}
	if tr.FailedStep != "" {
		v["failedStep"] = tr.FailedStep
	}
	if p := tr.Progress; !tr.Done() && p != nil {
		v["current"] = map[string]any{"id": p.NodeID, "ref": p.Ref, "wait": p.Wait, "paused": p.Paused, "pausedBy": p.PausedBy}
	}
	v["next"] = nextHint(tr)
	return v
}

// nextHint – việc AI nên làm tiếp.
func nextHint(tr session.Trace) string {
	switch {
	case !tr.Done() && tr.Progress != nil && tr.Progress.PausedBy == engine.PausedTouch:
		return "người dùng vừa đụng chuột nên app đã tạm dừng (nhường người dùng) – đừng chạy lại; chờ người dùng bấm Tiếp tục trên thanh mini (wait_run) hoặc hỏi người dùng / stop_run"
	case !tr.Done():
		return "chưa xong – gọi wait_run"
	case tr.State == session.StateFail && tr.FailedStep != "":
		return "node " + tr.FailedStep + " lỗi: đọc error.detail / ảnh, sửa bằng update_script rồi resume_run (chạy tiếp từ node đó, giữ biến node trước)"
	case tr.State == session.StateStopped:
		return "đã dừng (người dùng / F8 / stop_run)"
	case tr.TimedOut:
		return "dừng vì hết thời gian tối đa (maxMinutes của kịch bản hoặc trần mỗi lượt AI trong Cài đặt) – chưa chắc đã chạy hết; resume_run from node kế nếu cần"
	case tr.Reached:
		return "đã chạy tới stopAt – resume_run với from = node kế để chạy tiếp"
	}
	return "xong"
}

// trimMap – bản sao output với chuỗi dài cắt bớt.
func trimMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		if s, ok := v.(string); ok && len([]rune(s)) > maxStrLen {
			v = string([]rune(s)[:maxStrLen]) + "…"
		}
		out[k] = v
	}
	return out
}

// shotImages – ảnh gửi kèm + rộng từng ảnh đã gửi theo tên. want (AI xin theo tên) → đúng các ảnh đó (≤ maxWant);
// không thì ảnh lúc node lỗi (≤ maxShots) + ảnh sau node mới nhất (≤ maxEachSent, shots: each). Gửi theo thứ tự chạy, mỗi
// ảnh có dòng chú thích trước (thứ tự node, ref, thành công / lỗi, tên ảnh) – AI không phải đoán ảnh nào của node nào.
func shotImages(tr session.Trace, want []string) ([]mcp.Content, map[string]int) {
	pick := map[string]bool{}
	if len(want) > 0 {
		for _, name := range want[:min(len(want), maxWant)] {
			pick[name] = true
		}
	} else {
		fails, each := 0, 0
		for i := len(tr.Results) - 1; i >= 0; i-- {
			r := tr.Results[i]
			switch {
			case r.Shot == "":
			case r.Status == model.StatusFail && fails < maxShots:
				fails++
				pick[r.Shot] = true
			case r.Status != model.StatusFail && each < maxEachSent:
				each++
				pick[r.Shot] = true
			}
		}
	}
	var out []mcp.Content
	widths := map[string]int{}
	for i, r := range tr.Results {
		img := tr.Shots[r.Shot]
		if r.Shot == "" || !pick[r.Shot] || img == nil || widths[r.Shot] != 0 {
			continue
		}
		c, w := pngContent(img)
		if c == nil {
			continue
		}
		what := "sau node (thành công)"
		if r.Status == model.StatusFail {
			what = "lúc node lỗi"
		}
		caption := fmt.Sprintf("Ảnh %s – node #%d %s %s", r.Shot, i+1, r.Ref, what)
		out, widths[r.Shot] = append(out, &mcp.TextContent{Text: caption}, c), w
	}
	return out, widths
}

// pngContent – ảnh PNG thu nhỏ còn rộng ≤ imgMaxW + rộng sau thu nhỏ; lỗi mã hoá thì nil.
func pngContent(img image.Image) (*mcp.ImageContent, int) {
	img = vision.Shrink(img, imgMaxW)
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, 0
	}
	return &mcp.ImageContent{Data: buf.Bytes(), MIMEType: "image/png"}, img.Bounds().Dx()
}
