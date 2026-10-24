package mcpsrv

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/model"
	"ghosthand/internal/perm"
	"ghosthand/internal/script"
	"ghosthand/internal/session"
)

// Vòng thử – sửa (bước 31b): AI chạy kịch bản đã lưu (cả / đến node / một cụm), đọc kết quả từng node + chi tiết lỗi +
// ảnh lúc lỗi, sửa bằng update_script rồi resume_run chạy tiếp từ node lỗi với biến của lần trước.
// Chạy không chặn: run_* chờ tối đa waitS rồi trả; chưa xong thì gọi wait_run (client MCP hay cắt tool chạy lâu).

const (
	defaultWaitS = 20
	maxWaitS     = 30
)

type runIn struct {
	Path   string         `json:"path,omitempty" jsonschema:"kịch bản đã lưu (đường dẫn hoặc tên – xem list_scripts); bỏ trống khi gửi script"`
	Script any            `json:"script,omitempty" jsonschema:"kịch bản tạm (dạng như create_script) – chạy thử không lưu file, không ghi lịch sử; sửa rồi gửi lại ở resume_run"`
	Inputs map[string]any `json:"inputs,omitempty" jsonschema:"giá trị input {key: giá trị}; thiếu thì lấy mặc định của input"`
	From   string         `json:"from,omitempty" jsonschema:"id / ref node bắt đầu (biến của node trước trống, trừ khi resume_run)"`
	StopAt string         `json:"stopAt,omitempty" jsonschema:"id / ref node: chạy xong node này thì dừng (kết quả reached)"`
	Only   []string       `json:"only,omitempty" jsonschema:"chỉ chạy cụm node này (id / ref) – cạnh đi ra ngoài cụm bị bỏ"`
	WaitS  *int           `json:"waitS,omitempty" jsonschema:"chờ tối đa bấy nhiêu giây rồi trả (mặc định 20, tối đa 30); chưa xong thì gọi wait_run"`
	Shots  string         `json:"shots,omitempty" jsonschema:"fail (mặc định) = chụp màn lúc node lỗi; each = chụp thêm sau mỗi node thành công (sau delayAfter, giữ 12 ảnh mới nhất) – chậm hơn, dùng khi cần xem từng bước"`
}

type resumeIn struct {
	RunID  string   `json:"runId" jsonschema:"lần chạy trước (đã xong) – lấy kết quả node + biến của nó"`
	Script any      `json:"script,omitempty" jsonschema:"lần chạy trước là kịch bản tạm: bản đã sửa (bỏ trống = bản đã gửi lần trước)"`
	From   string   `json:"from,omitempty" jsonschema:"id / ref node chạy tiếp; trống = node đã lỗi"`
	StopAt string   `json:"stopAt,omitempty"`
	Only   []string `json:"only,omitempty"`
	WaitS  *int     `json:"waitS,omitempty"`
	Shots  string   `json:"shots,omitempty" jsonschema:"fail | each – như run_script"`
}

type runIDIn struct {
	RunID string   `json:"runId"`
	WaitS *int     `json:"waitS,omitempty" jsonschema:"chờ tối đa bấy nhiêu giây (mặc định 20, tối đa 30)"`
	Shots []string `json:"shots,omitempty" jsonschema:"tên ảnh (trường shot của node) muốn xem – tối đa 4; mặc định gửi ảnh lỗi + vài ảnh mới nhất"`
}

// shotEach – tham số shots của run_script / resume_run.
func shotEach(v string) (bool, error) {
	switch v {
	case "", "fail":
		return false, nil
	case "each":
		return true, nil
	}
	return false, fmt.Errorf("shots “%s” không hợp lệ – fail hoặc each", v)
}

func (s *Server) addRunTools() {
	addTool(s, KindRun, &mcp.Tool{Name: "run_script", Description: "Chạy kịch bản trên máy thật (chuột / phím thật): kịch bản đã lưu (path) hoặc kịch bản tạm (script – thử nhanh, không tạo file, không ghi lịch sử). " +
		"Chạy cả, đến một node (stopAt), từ một node (from) hoặc chỉ một cụm (only). App hỏi người dùng trước khi chạy (tuỳ Cài đặt). " +
		"Trả runId + kết quả từng node đã chạy; node lỗi có error.code / message / detail (chỗ khớp nhất, chữ đọc được, cửa sổ đang trước…) " +
		"kèm ảnh màn hình lúc lỗi. Lỗi → sửa bằng update_script (kịch bản tạm: gửi script đã sửa vào resume_run) rồi resume_run. " +
		"Kịch bản tạm chạy ổn mà người dùng muốn giữ → create_script."}, s.runScript)
	addTool(s, KindRun, &mcp.Tool{Name: "wait_run", Description: "Chờ lần chạy runId xong (tối đa waitS giây) rồi trả kết quả như run_script. " +
		"Chưa xong thì done=false + node đang chạy – gọi lại. Xem ảnh của node bất kỳ (trường shot, khi chạy với shots: each): shots = [tên ảnh]."}, s.waitRun)
	addTool(s, KindRun, &mcp.Tool{Name: "stop_run", Description: "Dừng lần chạy runId đang chạy."}, s.stopRun)
	addTool(s, KindRun, &mcp.Tool{Name: "resume_run", Description: "Chạy tiếp sau khi sửa: đọc lại kịch bản (bản mới nhất), " +
		"chạy từ node đã lỗi (hoặc from) với output / biến các node trước lấy từ lần chạy runId – không chạy lại từ đầu."}, s.resumeRun)
}

func (s *Server) runScript(ctx context.Context, _ *mcp.CallToolRequest, in runIn) (*mcp.CallToolResult, any, error) {
	each, err := shotEach(in.Shots)
	if err != nil {
		return fail(err)
	}
	opt := session.Options{From: in.From, StopAt: in.StopAt, Nodes: in.Only, ShotEach: each}
	if in.Script != nil {
		if in.Path != "" {
			return fail(errors.New("chỉ gửi một trong path (kịch bản đã lưu) hoặc script (kịch bản tạm)"))
		}
		sc, err := s.parseScript(in.Script)
		if err != nil {
			return fail(err)
		}
		return s.start(ctx, sc, "", in.Inputs, opt, in.WaitS)
	}
	path, err := s.resolvePath(in.Path)
	if err != nil {
		return fail(err)
	}
	sc, _, err := s.back.ReadScript(path)
	if err != nil {
		return fail(err)
	}
	return s.start(ctx, sc, path, in.Inputs, opt, in.WaitS)
}

// scriptOf – kịch bản của lần chạy tr: file (đọc bản mới nhất) hoặc kịch bản tạm đã gửi.
func (s *Server) scriptOf(tr session.Trace) (model.Script, error) {
	if tr.Path != "" {
		sc, _, err := s.back.ReadScript(tr.Path)
		return sc, err
	}
	if sc, ok := s.temp.get(tr.RunID); ok {
		return sc, nil
	}
	return model.Script{}, errors.New("kịch bản tạm của lần chạy này không còn (app đã mở lại / quá nhiều lần chạy) – gửi lại script")
}

func (s *Server) resumeRun(ctx context.Context, _ *mcp.CallToolRequest, in resumeIn) (*mcp.CallToolResult, any, error) {
	each, err := shotEach(in.Shots)
	if err != nil {
		return fail(err)
	}
	prev, err := s.back.Trace(in.RunID)
	if err != nil {
		return fail(err)
	}
	if !prev.Done() {
		return fail(fmt.Errorf("lần chạy %s chưa xong – wait_run hoặc stop_run trước", in.RunID))
	}
	from := in.From
	if from == "" {
		from = prev.FailedStep
	}
	if from == "" {
		return fail(errors.New("lần chạy trước không có node lỗi – cho biết from (node chạy tiếp)"))
	}
	var sc model.Script
	switch {
	case in.Script != nil && prev.Path != "":
		return fail(errors.New("lần chạy trước là kịch bản đã lưu – sửa bằng update_script, không gửi script"))
	case in.Script != nil:
		sc, err = s.parseScript(in.Script)
	default:
		sc, err = s.scriptOf(prev)
	}
	if err != nil {
		return fail(err)
	}
	return s.start(ctx, sc, prev.Path, prev.Inputs, session.Options{From: from, StopAt: in.StopAt, Nodes: in.Only, SeedRun: in.RunID, ShotEach: each}, in.WaitS)
}

// start đổi ref → id theo kịch bản sc, chạy (Backend hỏi quyền), chờ tối đa waitS rồi trả vết chạy. path "" = kịch bản
// tạm: không ghi lịch sử, giữ sc theo runId cho wait_run / resume_run.
func (s *Server) start(ctx context.Context, sc model.Script, path string, inputs map[string]any, opt session.Options, waitS *int) (*mcp.CallToolResult, any, error) {
	opt.Path, opt.Source, opt.NoHistory = path, session.SourceAI, path == ""
	opt.From, opt.StopAt = nodeID(sc, opt.From), nodeID(sc, opt.StopAt)
	for i, n := range opt.Nodes {
		opt.Nodes[i] = nodeID(sc, n)
	}
	id, err := s.back.Run(sc, path, inputs, opt)
	if err != nil {
		return fail(err)
	}
	if path == "" {
		s.temp.put(id, sc)
	}
	return s.report(ctx, id, sc, waitS, nil)
}

func (s *Server) waitRun(ctx context.Context, _ *mcp.CallToolRequest, in runIDIn) (*mcp.CallToolResult, any, error) {
	tr, err := s.back.Trace(in.RunID)
	if err != nil {
		return fail(err)
	}
	sc, _ := s.scriptOf(tr) // chỉ để lấy loại node – đọc lỗi thì bỏ
	return s.report(ctx, in.RunID, sc, in.WaitS, in.Shots)
}

func (s *Server) stopRun(_ context.Context, _ *mcp.CallToolRequest, in runIDIn) (*mcp.CallToolResult, any, error) {
	return ok(map[string]any{"stopped": s.back.Stop(in.RunID)})
}

// report chờ tối đa waitS giây rồi trả vết chạy (chữ) + ảnh (want = tên ảnh AI xin; nil = ảnh lỗi + ảnh mới nhất).
func (s *Server) report(ctx context.Context, id string, sc model.Script, waitS *int, want []string) (*mcp.CallToolResult, any, error) {
	wait := defaultWaitS
	if waitS != nil {
		wait = min(max(*waitS, 0), maxWaitS)
	}
	wctx, cancel := context.WithTimeout(ctx, time.Duration(wait)*time.Second)
	defer cancel()
	_ = s.back.Wait(wctx, id) // lỗi lúc chạy nằm trong Trace
	tr, err := s.back.Trace(id)
	if err != nil {
		return fail(err)
	}
	imgs, widths := shotImages(tr, want)
	view := traceView(tr, sc, widths)
	if miss := perm.Missing(s.back.Permissions(), perm.Needs(sc)); len(miss) > 0 {
		view["missingPermissions"] = miss // node cần quyền macOS chưa cấp → lỗi permission; nhờ người dùng cấp (Cài đặt → Quyền)
	}
	res, _, err := ok(view)
	if err != nil {
		return nil, nil, err
	}
	res.Content = append(res.Content, imgs...)
	return res, nil, nil
}

func nodeID(sc model.Script, idOrRef string) string {
	if idOrRef == "" {
		return ""
	}
	return script.NodeID(sc.Steps, idOrRef)
}
