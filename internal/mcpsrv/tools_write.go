package mcpsrv

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/store"
)

type validateIn struct {
	Script any    `json:"script,omitempty" jsonschema:"kịch bản cần kiểm tra (object như create_script)"`
	Path   string `json:"path,omitempty" jsonschema:"hoặc kiểm tra kịch bản đã lưu"`
}

type createIn struct {
	Script  any    `json:"script,omitempty" jsonschema:"kịch bản {name, steps, edges?, start?, inputs?, loops?} – node chỉ cần type + trường cần, còn lại lấy mặc định; không có edges thì nối các node theo thứ tự"`
	Scripts []any  `json:"scripts,omitempty" jsonschema:"tạo nhiều kịch bản một lần (thay cho script)"`
	Path    string `json:"path,omitempty" jsonschema:"chỗ lưu (tuỳ chọn, chỉ khi tạo một kịch bản); trống = thư mục kịch bản của AI, tên file theo name"`
}

type updateIn struct {
	Path        string              `json:"path" jsonschema:"kịch bản cần sửa"`
	Revision    *int                `json:"revision" jsonschema:"revision lấy từ read_script"`
	Name        *string             `json:"name,omitempty"`
	Loops       *int                `json:"loops,omitempty" jsonschema:"số vòng chạy, 0 = vô hạn"`
	Human       *string             `json:"human,omitempty" jsonschema:"off | low | medium | high"`
	Start       string              `json:"start,omitempty" jsonschema:"id / ref node chạy đầu"`
	Inputs      []model.ScriptInput `json:"inputs,omitempty" jsonschema:"thay cả danh sách input"`
	Steps       []map[string]any    `json:"steps,omitempty" jsonschema:"node có id / ref đã có → chỉ đè các trường gửi lên; chưa có → thêm node mới (cần type). Gửi type khác loại cũ = đổi loại: node dựng lại theo loại mới, giữ name / pos / enabled / delayAfter / retry và trường cũ loại mới cũng dùng (points, selectors…); cạnh theo cổng loại mới không có bị bỏ (droppedEdges)"`
	RemoveSteps []string            `json:"removeSteps,omitempty" jsonschema:"id / ref node cần xoá (xoá luôn cạnh nối)"`
	Edges       []edgeIn            `json:"edges,omitempty" jsonschema:"thêm cạnh {from, port, to} theo id / ref; cổng đã có cạnh thì thay"`
	RemoveEdges []string            `json:"removeEdges,omitempty" jsonschema:"id cạnh cần xoá"`
}

// edgeIn – cạnh AI gửi: id tuỳ chọn (app tự đặt).
type edgeIn struct {
	ID   string `json:"id,omitempty"`
	From string `json:"from" jsonschema:"id / ref node nguồn"`
	Port string `json:"port" jsonschema:"cổng ra: success, fail, true, false, case:<key>, next, done…"`
	To   string `json:"to" jsonschema:"id / ref node đích"`
}

func (s *Server) addWriteTools() {
	addTool(s, KindRead, &mcp.Tool{Name: "validate_script", Description: "Kiểm tra kịch bản (chưa lưu): cấu trúc flow + dữ liệu cần để chạy. " +
		"Trả {ok, error, code, detail{stepId, ref, field, edgeId, input}} – sửa đúng chỗ rồi kiểm tra lại."}, s.validate)
	addTool(s, KindWrite, &mcp.Tool{Name: "create_script", Description: "Tạo một / nhiều kịch bản mới và lưu file (thư mục kịch bản của AI, " +
		"hiện trong thư viện app với chip AI). Cấu trúc sai → không lưu, trả lỗi. Lưu được nhưng chưa chạy được (vd thiếu ảnh mẫu) → trả problems. " +
		"Không tự mở trên app – gọi open_in_app."}, s.create)
	addTool(s, KindWrite, &mcp.Tool{Name: "update_script", Description: "Sửa một phần kịch bản theo id / ref node (không gửi lại cả file). " +
		"Cần revision từ read_script; kịch bản đã đổi từ lúc đọc → lỗi conflict, đọc lại rồi sửa. " +
		"Người dùng đang sửa dở kịch bản đó trên app → ghi ra bản sao (trả path mới)."}, s.update)
	addTool(s, KindApp, &mcp.Tool{Name: "open_in_app", Description: "Mở kịch bản trên app cho người dùng xem / chạy. " +
		"Người dùng đang có thay đổi chưa lưu ở kịch bản khác → không mở, báo lại."}, s.openInApp)
}

func (s *Server) validate(_ context.Context, _ *mcp.CallToolRequest, in validateIn) (*mcp.CallToolResult, any, error) {
	var sc model.Script
	var err error
	if in.Script != nil {
		sc, err = s.parseScript(in.Script)
	} else if path, e := s.resolvePath(in.Path); e != nil {
		err = e
	} else {
		sc, _, err = s.back.ReadScript(path)
	}
	if err == nil {
		err = s.runnable(sc)
	}
	if err != nil {
		body := errorBody(err)
		body["ok"] = false
		return ok(body)
	}
	return ok(map[string]any{"ok": true, "steps": len(sc.Steps), "edges": len(sc.Edges)})
}

// created – một kịch bản vừa lưu.
type created struct {
	Path     string         `json:"path"`
	Name     string         `json:"name"`
	Revision int            `json:"revision"`
	Problems map[string]any `json:"problems,omitempty"` // lưu được nhưng chưa chạy được
}

func (s *Server) create(_ context.Context, _ *mcp.CallToolRequest, in createIn) (*mcp.CallToolResult, any, error) {
	raws := in.Scripts
	if in.Script != nil {
		raws = append([]any{in.Script}, raws...)
	}
	if len(raws) == 0 {
		return fail(errors.New("thiếu script"))
	}
	if in.Path != "" && len(raws) > 1 {
		return fail(errors.New("path chỉ dùng khi tạo một kịch bản"))
	}
	scs := make([]model.Script, len(raws))
	for i, raw := range raws { // kiểm tra hết trước – lỗi thì không lưu cái nào
		sc, err := s.parseScript(raw)
		if err != nil {
			if len(raws) > 1 {
				err = fmt.Errorf("scripts[%d]: %w", i, err)
			}
			return fail(err)
		}
		sc.Meta = &model.ScriptMeta{CreatedBy: model.CreatedByAI}
		scs[i] = sc
	}
	out := []created{}
	for _, sc := range scs {
		path, err := s.newPath(in.Path, sc.Name)
		if err != nil {
			return fail(err)
		}
		rev, err := s.back.WriteScript(path, sc, -1)
		if err != nil {
			return fail(err)
		}
		c := created{Path: path, Name: sc.Name, Revision: rev}
		if err := s.runnable(sc); err != nil {
			c.Problems = errorBody(err)
		}
		out = append(out, c)
	}
	return ok(map[string]any{"created": out})
}

// newPath – chỗ lưu kịch bản mới: path AI chọn (không ghi đè file đã có) hoặc thư mục của AI theo tên.
func (s *Server) newPath(p, name string) (string, error) {
	if p != "" {
		path, err := s.resolvePath(p)
		if err != nil {
			return "", err
		}
		if !strings.EqualFold(filepath.Ext(path), ".json") { // AI chỉ được tạo file kịch bản
			return "", fmt.Errorf("path phải là file .json – nhận %s", path)
		}
		if _, err := os.Stat(path); err == nil {
			return "", fmt.Errorf("đã có file %s – sửa bằng update_script hoặc chọn path khác", path)
		}
		return path, os.MkdirAll(filepath.Dir(path), 0o755)
	}
	dir, err := s.back.ScriptsDir()
	if err != nil {
		return "", err
	}
	return store.FreePath(dir, script.SafeFileName(name)), nil
}

func (s *Server) update(_ context.Context, _ *mcp.CallToolRequest, in updateIn) (*mcp.CallToolResult, any, error) {
	path, err := s.resolvePath(in.Path)
	if err != nil {
		return fail(err)
	}
	if in.Revision == nil {
		return fail(errors.New("thiếu revision – gọi read_script lấy revision"))
	}
	sc, rev, err := s.back.ReadScript(path)
	if err != nil {
		return fail(err)
	}
	if rev != *in.Revision {
		return fail(&store.ConflictError{Path: path, Have: rev, Got: *in.Revision})
	}
	p := script.Patch{Name: in.Name, Loops: in.Loops, Human: in.Human, Start: in.Start, Inputs: in.Inputs,
		RemoveSteps: in.RemoveSteps, RemoveEdges: in.RemoveEdges}
	for _, e := range in.Edges {
		p.Edges = append(p.Edges, model.Edge(e))
	}
	for _, st := range in.Steps {
		raw, err := jsonRaw(st)
		if err != nil {
			return fail(err)
		}
		p.Steps = append(p.Steps, raw)
	}
	next, dropped, err := script.ApplyPatch(sc, p)
	if err == nil {
		err = s.resolveTemplates(&next)
	}
	if err == nil {
		next, err = checked(next)
	}
	if err != nil {
		return fail(err)
	}
	res := map[string]any{"path": path}
	if ed := s.back.Editor(); samePath(path, ed.Path) && ed.Dirty {
		// người dùng đang sửa dở → không ghi đè, ghi bản sao
		path = store.FreePath(filepath.Dir(path), strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))+" (AI)")
		next.Meta = &model.ScriptMeta{CreatedBy: model.CreatedByAI}
		res["path"], res["copy"] = path, true
		res["note"] = "người dùng đang sửa dở kịch bản này trên app – đã lưu thành bản sao; sửa tiếp trên path mới"
		*in.Revision = -1
	}
	newRev, err := s.back.WriteScript(path, next, *in.Revision)
	if err != nil {
		return fail(err)
	}
	res["revision"] = newRev
	if len(dropped) > 0 { // node đổi loại không còn cổng cũ – AI nối lại nếu cần
		res["droppedEdges"] = dropped
	}
	if err := s.runnable(next); err != nil {
		res["problems"] = errorBody(err)
	}
	return ok(res)
}

func (s *Server) openInApp(_ context.Context, _ *mcp.CallToolRequest, in pathIn) (*mcp.CallToolResult, any, error) {
	path, err := s.resolvePath(in.Path)
	if err != nil {
		return fail(err)
	}
	if _, _, err := s.back.ReadScript(path); err != nil {
		return fail(err)
	}
	if ed := s.back.Editor(); ed.Dirty && !samePath(path, ed.Path) {
		return ok(map[string]any{"opened": false, "code": "busy",
			"error": "người dùng đang có thay đổi chưa lưu ở kịch bản khác – không mở để khỏi mất; kịch bản đã có trong thư viện app"})
	}
	if err := s.back.OpenInApp(path); err != nil {
		return fail(err)
	}
	return ok(map[string]any{"opened": true, "path": path})
}
