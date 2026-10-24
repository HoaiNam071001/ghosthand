package mcpsrv

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/model"
	"ghosthand/internal/session"
)

// AI soạn bằng cách thử (bước 31c): run_step chạy MỘT node trên máy thật; thành công thì node được nối vào kịch bản nháp
// (kèm ảnh màn hình sau node) và các node sau dùng được kết quả của nó ({{n1.output…}}) nhờ nạp lại lần chạy trước
// (SeedRun) – node trước không chạy lại. Xong thì draft action=save ghi thành kịch bản để lần sau chạy không cần AI.

const defaultDraft = "nhap"

type draft struct {
	steps   []any    // node đã chạy thành công, theo thứ tự (dạng gọn như create_script)
	lastRun string   // runId của node cuối – nguồn kết quả cho node kế
	shots   [][]byte // PNG màn hình sau từng node
}

type drafts struct {
	mu   sync.Mutex
	byID map[string]*draft
}

func (d *drafts) get(name string) *draft {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.byID == nil {
		d.byID = map[string]*draft{}
	}
	if d.byID[name] == nil {
		d.byID[name] = &draft{}
	}
	return d.byID[name]
}

func (d *drafts) drop(name string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.byID, name)
}

type runStepIn struct {
	Step  any    `json:"step" jsonschema:"một node dạng gọn như trong create_script (type + trường); không cần id / cạnh – tự nối sau node trước của nháp"`
	Draft string `json:"draft,omitempty" jsonschema:"tên nháp (mặc định \"nhap\") – mỗi tên một kịch bản nháp"`
	WaitS *int   `json:"waitS,omitempty" jsonschema:"chờ tối đa bấy nhiêu giây (mặc định 20, tối đa 30); quá thì node bị dừng và không vào nháp"`
}

type draftIn struct {
	Action string `json:"action" jsonschema:"show (xem nháp) | save (ghi thành kịch bản) | reset (bỏ nháp)"`
	Draft  string `json:"draft,omitempty" jsonschema:"tên nháp (mặc định \"nhap\")"`
	Name   string `json:"name,omitempty" jsonschema:"save: tên kịch bản (mặc định = tên nháp)"`
	Path   string `json:"path,omitempty" jsonschema:"save: path file .json (bỏ trống = thư mục kịch bản của AI)"`
}

func (s *Server) addDraftTools() {
	addTool(s, KindRun, &mcp.Tool{Name: "run_step", Description: "Soạn bằng cách thử: chạy MỘT node trên máy thật ngay, xem kết quả + ảnh màn hình, thành công thì node được nối vào kịch bản nháp. " +
		"Node sau dùng được biến của node trước ({{n1.output.text}}) mà node trước không chạy lại. Lỗi → node KHÔNG vào nháp, đọc error.detail rồi gọi lại với step đã sửa. " +
		"Xong thì draft action=save để ghi thành kịch bản (kèm ảnh từng bước) – lần sau chạy không cần AI. Cần mức AI cho chạy (Cài đặt)."}, s.runStep)
	addTool(s, KindWrite, &mcp.Tool{Name: "draft", Description: "Kịch bản nháp của run_step: show (các node đã thử thành công), save (ghi thành kịch bản + thư mục ảnh từng bước cạnh file), reset (bỏ nháp, thử lại từ đầu)."}, s.draftTool)
}

func (s *Server) runStep(ctx context.Context, _ *mcp.CallToolRequest, in runStepIn) (*mcp.CallToolResult, any, error) {
	if in.Step == nil {
		return fail(errors.New("thiếu step"))
	}
	name := draftName(in.Draft)
	d := s.drafts.get(name)
	raws := append(append([]any{}, d.steps...), in.Step)
	sc, err := s.parseScript(map[string]any{"name": name, "steps": raws})
	if err != nil {
		return fail(err)
	}
	cur := sc.Steps[len(sc.Steps)-1]
	opt := session.Options{From: cur.ID, Only: true, SeedRun: d.lastRun, Source: session.SourceAI, NoHistory: true}
	id, err := s.back.Run(sc, "", nil, opt)
	if err != nil {
		return fail(err)
	}
	s.temp.put(id, sc)
	wait := defaultWaitS
	if in.WaitS != nil {
		wait = min(max(*in.WaitS, 0), maxWaitS)
	}
	wctx, cancel := context.WithTimeout(ctx, time.Duration(wait)*time.Second)
	defer cancel()
	_ = s.back.Wait(wctx, id)
	tr, err := s.back.Trace(id)
	if err != nil {
		return fail(err)
	}
	if !tr.Done() {
		s.back.Stop(id)
		return fail(fmt.Errorf("node %s chưa xong sau %d s – đã dừng, KHÔNG vào nháp. Rút ngắn (timeout nhỏ hơn) hoặc chia nhỏ", cur.Ref, wait))
	}
	note := fmt.Sprintf("Node %s lỗi – KHÔNG vào nháp (nháp %q còn %d node). Sửa step rồi gọi lại run_step.", cur.Ref, name, len(d.steps))
	var shot []byte
	if tr.State == session.StateSuccess {
		d.steps, d.lastRun = raws, id
		shot = s.stepShot()
		d.shots = append(d.shots, shot)
		note = fmt.Sprintf("Node %s thành công, đã vào nháp %q (%d node). Tiếp: run_step node kế, hoặc draft save.", cur.Ref, name, len(d.steps))
	}
	res, _, err := s.report(ctx, id, sc, nil, nil)
	if err != nil || res == nil {
		return res, nil, err
	}
	res.Content = append(res.Content, &mcp.TextContent{Text: note})
	if shot != nil {
		res.Content = append(res.Content, &mcp.ImageContent{Data: shot, MIMEType: "image/png"})
	}
	return res, nil, nil
}

// stepShot – ảnh màn hình chính sau node (nil nếu không chụp được).
func (s *Server) stepShot() []byte {
	r, err := s.area(areaIn{})
	if err != nil {
		return nil
	}
	img, err := s.back.Capture(r)
	if err != nil {
		return nil
	}
	s.back.NoteCapture()
	if c, _ := pngContent(img); c != nil {
		return c.Data
	}
	return nil
}

func draftName(n string) string {
	if n = strings.TrimSpace(n); n != "" {
		return n
	}
	return defaultDraft
}

func (s *Server) draftTool(_ context.Context, _ *mcp.CallToolRequest, in draftIn) (*mcp.CallToolResult, any, error) {
	name := draftName(in.Draft)
	d := s.drafts.get(name)
	switch in.Action {
	case "show":
		sc, err := s.draftScript(name, d)
		if err != nil {
			return fail(err)
		}
		type row struct{ Ref, Type string }
		rows := []row{}
		for _, st := range sc.Steps {
			rows = append(rows, row{st.Ref, st.Type})
		}
		return ok(map[string]any{"draft": name, "steps": rows, "nextRef": fmt.Sprintf("n%d", len(rows)+1)})
	case "reset":
		s.drafts.drop(name)
		return ok(map[string]any{"draft": name, "reset": true})
	case "save":
		return s.saveDraft(name, d, in)
	}
	return fail(fmt.Errorf("action %q không hợp lệ – show | save | reset", in.Action))
}

func (s *Server) draftScript(name string, d *draft) (model.Script, error) {
	if len(d.steps) == 0 {
		return model.Script{}, fmt.Errorf("nháp %q chưa có node nào – dùng run_step", name)
	}
	return s.parseScript(map[string]any{"name": name, "steps": d.steps})
}

func (s *Server) saveDraft(name string, d *draft, in draftIn) (*mcp.CallToolResult, any, error) {
	scName := strings.TrimSpace(in.Name)
	if scName == "" {
		scName = name
	}
	sc, err := s.draftScript(scName, d)
	if err != nil {
		return fail(err)
	}
	sc.Meta = &model.ScriptMeta{CreatedBy: model.CreatedByAI}
	path, err := s.newPath(in.Path, sc.Name)
	if err != nil {
		return fail(err)
	}
	rev, err := s.back.WriteScript(path, sc, -1)
	if err != nil {
		return fail(err)
	}
	out := map[string]any{"path": path, "revision": rev, "steps": len(sc.Steps)}
	if dir := shotsFolder(path); dir != "" {
		if n := writeShots(dir, sc, d.shots); n > 0 {
			out["shotsDir"], out["shots"] = dir, n
		}
	}
	s.drafts.drop(name)
	return ok(out)
}

// shotsFolder – thư mục ảnh từng bước cạnh file kịch bản: "<tên> (ảnh các bước)".
func shotsFolder(path string) string {
	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	return filepath.Join(filepath.Dir(path), base+" (ảnh các bước)")
}

// writeShots ghi ảnh sau từng node: <ref>.png (n1.png…). Lỗi ghi ảnh không làm hỏng việc lưu kịch bản.
func writeShots(dir string, sc model.Script, shots [][]byte) int {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return 0
	}
	n := 0
	for i, b := range shots {
		if i >= len(sc.Steps) || b == nil {
			continue
		}
		if os.WriteFile(filepath.Join(dir, sc.Steps[i].Ref+".png"), b, 0o644) == nil {
			n++
		}
	}
	return n
}
