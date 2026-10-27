package mcpsrv

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	manual "ghosthand/internal/guide"
	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

type pathIn struct {
	Path string `json:"path" jsonschema:"đường dẫn file kịch bản (từ list_scripts) hoặc tên kịch bản"`
}

type readIn struct {
	Path string `json:"path" jsonschema:"đường dẫn file kịch bản (từ list_scripts) hoặc tên kịch bản"`
	Full bool   `json:"full,omitempty" jsonschema:"true = đủ mọi trường (mặc định: dạng gọn – chỉ trường khác mặc định, cạnh thành flow)"`
}

type typesIn struct {
	Type    string `json:"type,omitempty" jsonschema:"chi tiết loại node (trường, ví dụ, output), nhiều loại cách dấu phẩy: waitImage,clickImage,forEach"`
	Compact bool   `json:"compact,omitempty" jsonschema:"true = hướng dẫn flow + mỗi loại node một dòng (khi nào dùng, cổng) – đọc cái này trước"`
	Topic   string `json:"topic,omitempty" jsonschema:"debug = mẹo thử – sửa: run_script, đọc error.detail, ảnh lỗi"`
}

// ScriptEntry – một kịch bản trong list_scripts.
type ScriptEntry struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Steps     int    `json:"steps"`
	CreatedBy string `json:"createdBy,omitempty"` // "ai" = AI tạo
	Open      bool   `json:"open,omitempty"`      // đang mở trên app
	Unsaved   bool   `json:"unsaved,omitempty"`   // đang mở và có thay đổi chưa lưu – update_script sẽ ghi ra bản sao
	Error     string `json:"error,omitempty"`     // không đọc được file
}

func (s *Server) addReadTools() {
	addTool(s, KindRead, &mcp.Tool{Name: "list_scripts", Description: "Danh sách kịch bản: mở gần đây trên app + thư mục kịch bản của AI. " +
		"Mỗi mục: path, name, số node, createdBy (ai), open / unsaved (đang mở trên app)."}, s.listScripts)
	addTool(s, KindRead, &mcp.Tool{Name: "read_script", Description: "Đọc một kịch bản: {path, revision, script}. " +
		"script dạng gọn như create_script (node xếp theo thứ tự chạy, trường bằng mặc định bị bỏ, cạnh = flow). " +
		"Giữ revision để gửi kèm update_script."}, s.readScript)
	addTool(s, KindRead, &mcp.Tool{Name: "get_step_types", Description: "Hướng dẫn viết kịch bản: cấu trúc flow, biến {{…}}, trường chung, " +
		"từng loại node app hỗ trợ (mô tả, trường, ví dụ JSON, output, cổng ra) và mẹo viết kịch bản bền. Đọc trước khi tạo / sửa. " +
		"Đầy đủ rất dài: compact=true trước, rồi type=a,b,c lấy chi tiết các loại sẽ dùng; topic=debug khi chạy thử."}, s.stepTypes)
	addTool(s, KindRead, &mcp.Tool{Name: "get_node_guide", Description: "Trang hướng dẫn của một loại node (cùng nội dung modal Hướng dẫn của người dùng): " +
		"công nghệ bên dưới, chạy được với web / app nào, độ chính xác, tốc độ, nên / không nên dùng, mẹo, trường quan trọng. " +
		"Dùng để chọn đúng node cho trang / app; trường + ví dụ JSON lấy ở get_step_types. Khoá = tên loại node (vd clickText, waitImage)."}, s.nodeGuide)
	addTool(s, KindRead, &mcp.Tool{Name: "list_secrets", Description: "Tên các bí mật người dùng đã lưu trong Cài đặt → Bí mật (mật khẩu, token…). " +
		"CHỈ có tên, không bao giờ có giá trị. Dùng trong ô chữ của node bằng {{secret.<tên>}}; app điền giá trị thật lúc chạy và che trong kết quả. " +
		"Cần bí mật chưa có thì bảo người dùng thêm ở Cài đặt → Bí mật, đừng xin giá trị."}, s.listSecrets)
	addTool(s, KindRead, &mcp.Tool{Name: "get_screen_info", Description: "Các màn hình: khung theo toạ độ chuột (x, y, w, h), tỷ lệ DPI / Retina, màn chính. " +
		"Toạ độ trong kịch bản dùng cùng hệ này."}, s.screenInfo)
}

// paths – mở gần đây (mới nhất trước) rồi file trong thư mục kịch bản của AI, không trùng.
func (s *Server) paths() []string {
	out := slices.Clone(s.back.Recent())
	if dir, err := s.back.ScriptsDir(); err == nil {
		files, _ := filepath.Glob(filepath.Join(dir, "*.json"))
		for _, f := range files {
			if !slices.ContainsFunc(out, func(p string) bool { return strings.EqualFold(p, f) }) {
				out = append(out, f)
			}
		}
	}
	return out
}

func (s *Server) listScripts(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	ed := s.back.Editor()
	list := []ScriptEntry{}
	for _, p := range s.paths() {
		e := ScriptEntry{Path: p, Name: strings.TrimSuffix(filepath.Base(p), filepath.Ext(p)), Open: samePath(p, ed.Path)}
		e.Unsaved = e.Open && ed.Dirty
		if sc, _, err := s.back.ReadScript(p); err != nil {
			if os.IsNotExist(err) {
				continue
			}
			e.Error = err.Error()
		} else {
			e.Name, e.Steps = sc.Name, len(sc.Steps)
			if sc.Meta != nil {
				e.CreatedBy = sc.Meta.CreatedBy
			}
		}
		list = append(list, e)
	}
	dir, _ := s.back.ScriptsDir()
	return ok(map[string]any{"scripts": list, "aiFolder": dir})
}

func (s *Server) readScript(_ context.Context, _ *mcp.CallToolRequest, in readIn) (*mcp.CallToolResult, any, error) {
	path, err := s.resolvePath(in.Path)
	if err != nil {
		return fail(err)
	}
	sc, rev, err := s.back.ReadScript(path)
	if err != nil {
		return fail(err)
	}
	var body any = sc
	if !in.Full {
		if body, err = script.Shrink(sc); err != nil {
			return fail(err)
		}
	}
	ed := s.back.Editor()
	return ok(map[string]any{"path": path, "revision": rev, "script": body, "unsaved": samePath(path, ed.Path) && ed.Dirty})
}

func (s *Server) stepTypes(_ context.Context, _ *mcp.CallToolRequest, in typesIn) (*mcp.CallToolResult, any, error) {
	if in.Topic == "debug" {
		return ok(map[string]string{"debug": debugTips})
	}
	if in.Type != "" {
		var out []typeDoc
		for _, t := range strings.Split(in.Type, ",") {
			t = strings.TrimSpace(t)
			i := slices.IndexFunc(model.StepTypeDocs(), func(d model.StepTypeDoc) bool { return d.Type == t })
			if i < 0 {
				return fail(&model.ScriptError{Field: "type", Msg: "không có loại node " + t + " – xem danh sách ở get_step_types compact=true"})
			}
			out = append(out, withUse(model.StepTypeDocs()[i]))
		}
		if len(out) == 1 {
			return ok(out[0])
		}
		return ok(map[string]any{"types": out})
	}
	g := guideDoc(s.back.MCP().NodePreference())
	if in.Compact {
		return ok(toCompact(g))
	}
	return ok(g)
}

type nodeGuideIn struct {
	Type string `json:"type" jsonschema:"khoá node, vd clickText, waitImage, browserTab – danh sách ở resource ghosthand://manual"`
}

func (s *Server) nodeGuide(_ context.Context, _ *mcp.CallToolRequest, in nodeGuideIn) (*mcp.CallToolResult, any, error) {
	g, err := manual.Load()
	if err != nil {
		return fail(err)
	}
	n, found := g.Nodes[in.Type]
	if !found {
		return fail(&model.ScriptError{Field: "type", Msg: "chưa có trang hướng dẫn cho " + in.Type + " – xem danh sách ở resource ghosthand://manual"})
	}
	return ok(n)
}

func (s *Server) screenInfo(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	return ok(map[string]any{"displays": s.back.Displays(),
		"note": "Toạ độ theo hệ của chuột (robotgo): Windows là pixel thật, macOS là điểm logic (Retina scale 2 = 1 điểm 2 pixel)."})
}

func (s *Server) listSecrets(_ context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
	return ok(map[string]any{"secrets": s.back.SecretNames()})
}

func samePath(a, b string) bool {
	return a != "" && strings.EqualFold(filepath.Clean(a), filepath.Clean(b))
}
