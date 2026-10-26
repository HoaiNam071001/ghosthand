package mcpsrv

import (
	"context"
	"encoding/json"
	"errors"
	"image"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/perm"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// fakeBackend – file thật trong thư mục tạm, revision trong bộ nhớ.
type fakeBackend struct {
	dir           string
	revs          *store.Revisions
	recent        []string
	editor        Editor
	opened        []string
	sess          *session.Manager // phiên chạy thật, thiết bị giả (runBackend trong run_test.go)
	in            *devicetest.FakeInput
	perms         []perm.Item
	settings      store.MCPSettings // tool tắt (31b2)
	page          web.PageCheck     // probe_page trả (44)
	outline       web.Outline       // read_web_outline trả (46)
	tabs          []web.Tab
	lastOpt       session.Options // Run gần nhất (46 B1)
	outlineTab    string
	outlineDialog bool
	probed        string
	elems         []element.Node // Elements trả (43 A)
	elemReads     int
	captures      int        // số lần NoteCapture
	found         model.Step // node FindImage nhận lần cuối
}

func (f *fakeBackend) Enabled() bool          { return true }
func (f *fakeBackend) MCP() store.MCPSettings { return f.settings }
func (f *fakeBackend) CheckPage(_ context.Context, u string) (web.PageCheck, error) {
	f.probed = u
	return f.page, nil
}
func (f *fakeBackend) ReadOutline(_ context.Context, tab string, dialog bool) (web.Outline, []web.Tab, error) {
	f.outlineTab, f.outlineDialog = tab, dialog
	return f.outline, f.tabs, nil
}
func (f *fakeBackend) TabShot(_ context.Context, tab string) (web.TabShot, error) {
	f.outlineTab = tab
	return web.TabShot{Image: image.NewRGBA(image.Rect(0, 0, 2400, 1200)), Tab: "AB12", URL: f.outline.URL, CSSWidth: 1200}, nil
}
func (f *fakeBackend) SetNodePref(p string) error {
	if p != store.NodePrefVision && p != store.NodePrefWeb {
		return errors.New("ưu tiên node không hợp lệ")
	}
	f.settings.NodePref = p
	return nil
}
func (f *fakeBackend) ToolAllowed(c, t string) bool { return f.settings.ToolAllowed(c, t) }
func (f *fakeBackend) Recent() []string             { return f.recent }
func (f *fakeBackend) Editor() Editor               { return f.editor }
func (f *fakeBackend) ScriptsDir() (string, error)  { return f.dir, nil }
func (f *fakeBackend) OpenInApp(path string) error  { f.opened = append(f.opened, path); return nil }
func (f *fakeBackend) Permissions() []perm.Item     { return f.perms }
func (f *fakeBackend) SecretNames() []string        { return []string{"mat_khau_email"} }
func (f *fakeBackend) Displays() []Display {
	return []Display{{Rect: model.Rect{W: 1920, H: 1080}, Scale: 1, Main: true}}
}
func (f *fakeBackend) ReadScript(p string) (model.Script, int, error) {
	sc, err := store.ReadScriptFile(p)
	return sc, f.revs.Get(p), err
}
func (f *fakeBackend) WriteScript(p string, sc model.Script, rev int) (int, error) {
	return f.revs.Write(p, rev, func() error { return store.WriteScriptFile(p, sc) })
}

func connect(t *testing.T) (*mcp.ClientSession, *fakeBackend) {
	t.Helper()
	back := &fakeBackend{dir: t.TempDir(), revs: store.NewRevisions()}
	back.sess, back.in = fakeSession()
	srv := New(back)
	ct, st := mcp.NewInMemoryTransports()
	ctx := context.Background()
	if _, err := srv.mcp.Connect(ctx, st, nil); err != nil {
		t.Fatal(err)
	}
	cs, err := mcp.NewClient(&mcp.Implementation{Name: "test"}, nil).Connect(ctx, ct, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cs.Close() })
	return cs, back
}

// call gọi tool, trả JSON kết quả + cờ lỗi.
func call(t *testing.T, cs *mcp.ClientSession, name string, args map[string]any) (map[string]any, bool) {
	t.Helper()
	res, err := cs.CallTool(context.Background(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	var out map[string]any
	text := res.Content[0].(*mcp.TextContent).Text
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		t.Fatalf("%s: kết quả không phải JSON: %s", name, text)
	}
	return out, res.IsError
}

const musicScript = `{"name":"Mở nhạc","steps":[
	{"type":"open","target":"https://www.youtube.com/results?search_query={{bai_hat}}","delayAfter":3000},
	{"type":"waitImage","findBy":"text","findText":"{{bai_hat}}","timeoutMs":10000},
	{"type":"clickImage","imageSource":"node","imageFrom":"n2"}],
	"inputs":[{"key":"bai_hat","label":"Bài hát","type":"text","default":"Tinh Hà Say 2"}]}`

func TestCreateReadUpdate(t *testing.T) {
	cs, back := connect(t)
	var sc map[string]any
	json.Unmarshal([]byte(musicScript), &sc)

	if out, isErr := call(t, cs, "validate_script", map[string]any{"script": sc}); isErr || out["ok"] != true {
		t.Fatalf("validate: %v", out)
	}
	out, isErr := call(t, cs, "create_script", map[string]any{"script": sc})
	if isErr {
		t.Fatalf("create: %v", out)
	}
	c := out["created"].([]any)[0].(map[string]any)
	path := c["path"].(string)
	if filepath.Dir(path) != back.dir || filepath.Base(path) != "Mở nhạc.json" || c["problems"] != nil {
		t.Fatalf("create: %v", c)
	}
	saved, _, err := back.ReadScript(path)
	if err != nil || saved.Meta == nil || saved.Meta.CreatedBy != model.CreatedByAI || len(saved.Edges) != 2 {
		t.Fatalf("file đã lưu: %+v, %v", saved, err)
	}
	if saved.Steps[2].ImageFrom != "s2" {
		t.Errorf("imageFrom trỏ ref (n2) phải đổi sang id – hiện %q", saved.Steps[2].ImageFrom)
	}

	// tạo lần nữa cùng tên → không ghi đè
	out, _ = call(t, cs, "create_script", map[string]any{"script": sc})
	if p := out["created"].([]any)[0].(map[string]any)["path"].(string); filepath.Base(p) != "Mở nhạc 2.json" {
		t.Errorf("trùng tên: %s", p)
	}

	read, _ := call(t, cs, "read_script", map[string]any{"path": "Mở nhạc"})
	rev := read["revision"]
	out, isErr = call(t, cs, "update_script", map[string]any{"path": path, "revision": rev,
		"steps": []any{map[string]any{"ref": "n1", "delayAfter": 4000}, map[string]any{"type": "key", "keys": []string{"space"}}},
		"edges": []any{map[string]any{"from": "n3", "port": "success", "to": "s4"}}})
	if isErr {
		t.Fatalf("update: %v", out)
	}
	saved, _, _ = back.ReadScript(path)
	if saved.Steps[0].DelayAfter != 4000 || saved.Steps[0].Target == "" || len(saved.Steps) != 4 || len(saved.Edges) != 3 {
		t.Errorf("sau update: %+v", saved)
	}

	// revision cũ → conflict
	out, isErr = call(t, cs, "update_script", map[string]any{"path": path, "revision": rev, "name": "X"})
	if !isErr || out["code"] != "conflict" {
		t.Errorf("revision cũ phải conflict: %v", out)
	}
}

func TestCreateInvalid(t *testing.T) {
	cs, back := connect(t)
	out, isErr := call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "Hỏng",
		"steps": []any{map[string]any{"type": "wait"}}, "edges": []any{map[string]any{"from": "s1", "port": "success", "to": "s9"}}}})
	if !isErr || out["detail"] == nil || !strings.Contains(out["error"].(string), "s9") {
		t.Errorf("cạnh trỏ node không có phải báo lỗi có cấu trúc: %v", out)
	}
	if files, _ := os.ReadDir(back.dir); len(files) != 0 {
		t.Error("lỗi cấu trúc thì không lưu")
	}
	out, _ = call(t, cs, "validate_script", map[string]any{"script": `{"steps":[{"type":"open","target":""}]}`})
	if out["ok"] != false || out["detail"].(map[string]any)["field"] != "target" {
		t.Errorf("chuỗi JSON + lỗi lúc chạy: %v", out)
	}
	out, isErr = call(t, cs, "create_script", map[string]any{"script": map[string]any{"steps": []any{map[string]any{"type": "open"}}}})
	if isErr || out["created"].([]any)[0].(map[string]any)["problems"] == nil {
		t.Errorf("cấu trúc đúng nhưng chưa chạy được: lưu + trả problems: %v", out)
	}
}

func TestUpdateDirtyMakesCopy(t *testing.T) {
	cs, back := connect(t)
	var sc map[string]any
	json.Unmarshal([]byte(musicScript), &sc)
	out, _ := call(t, cs, "create_script", map[string]any{"script": sc})
	path := out["created"].([]any)[0].(map[string]any)["path"].(string)
	back.editor = Editor{Path: path, Dirty: true}

	out, isErr := call(t, cs, "update_script", map[string]any{"path": path, "revision": 1, "name": "Đổi tên"})
	if isErr || out["copy"] != true || filepath.Base(out["path"].(string)) != "Mở nhạc (AI).json" {
		t.Fatalf("đang sửa dở → bản sao: %v", out)
	}
	if orig, _, _ := back.ReadScript(path); orig.Name != "Mở nhạc" {
		t.Error("không được ghi đè kịch bản người dùng đang sửa")
	}

	// open_in_app: kịch bản khác đang dở → không mở
	out, _ = call(t, cs, "open_in_app", map[string]any{"path": out["path"]})
	if out["opened"] != false || len(back.opened) != 0 {
		t.Errorf("đang có thay đổi chưa lưu → không mở: %v", out)
	}
	back.editor.Dirty = false
	if out, _ = call(t, cs, "open_in_app", map[string]any{"path": path}); out["opened"] != true || len(back.opened) != 1 {
		t.Errorf("open_in_app: %v", out)
	}
}

func TestListAndDocs(t *testing.T) {
	cs, back := connect(t)
	call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "A", "steps": []any{map[string]any{"type": "wait"}}}})
	back.recent = []string{filepath.Join(back.dir, "đã xoá.json")}
	out, _ := call(t, cs, "list_scripts", nil)
	list := out["scripts"].([]any)
	if len(list) != 1 || list[0].(map[string]any)["createdBy"] != "ai" {
		t.Errorf("list_scripts (bỏ file không còn): %v", list)
	}
	out, _ = call(t, cs, "get_step_types", nil)
	if len(out["stepTypes"].([]any)) != len(model.StepTypeDocs()) || out["tips"] == "" {
		t.Errorf("get_step_types thiếu: %v", out["tips"])
	}
	out, _ = call(t, cs, "get_step_types", map[string]any{"compact": true})
	if cl := out["stepTypes"].([]any); len(cl) != len(model.StepTypeDocs()) || cl[0].(map[string]any)["example"] != nil || cl[0].(map[string]any)["use"] == "" {
		t.Errorf("compact: %v", cl[0])
	}
	if _, isErr := call(t, cs, "get_step_types", map[string]any{"type": "bay"}); !isErr {
		t.Error("loại lạ phải lỗi")
	}
	out, _ = call(t, cs, "get_node_guide", map[string]any{"type": "click"})
	if out["tech"] == "" {
		t.Errorf("get_node_guide click: %v", out)
	}
	if _, isErr := call(t, cs, "get_node_guide", map[string]any{"type": "bay"}); !isErr {
		t.Error("node lạ phải lỗi")
	}
	for _, uri := range []string{"ghosthand://guide", "ghosthand://manual", "ghosthand://schema", "ghosthand://examples"} {
		res, err := cs.ReadResource(context.Background(), &mcp.ReadResourceParams{URI: uri})
		if err != nil || !json.Valid([]byte(res.Contents[0].Text)) {
			t.Errorf("%s: %v", uri, err)
		}
	}
	p, err := cs.GetPrompt(context.Background(), &mcp.GetPromptParams{Name: "tao_kich_ban", Arguments: map[string]string{"muc_tieu": "mở nhạc"}})
	if err != nil || !strings.Contains(p.Messages[0].Content.(*mcp.TextContent).Text, "mở nhạc") {
		t.Errorf("prompt: %v", err)
	}
}

// Ví dụ trong ghosthand://examples phải tạo được bằng create_script.
func TestExamplesCreate(t *testing.T) {
	cs, _ := connect(t)
	ex, err := examples()
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range ex.(map[string]any)["compact"].([]map[string]any) {
		var sc map[string]any
		json.Unmarshal(e["script"].(json.RawMessage), &sc)
		if out, isErr := call(t, cs, "create_script", map[string]any{"script": sc}); isErr {
			t.Errorf("%s: %v", e["id"], out)
		}
	}
}

// Schema sinh từ struct Go: mọi trường trong mô tả loại node (steptypes.go) phải có trong schema của node.
func TestSchemaMatchesStepDocs(t *testing.T) {
	sc, err := ScriptSchema()
	if err != nil {
		t.Fatal(err)
	}
	step := sc.Properties["steps"].Items
	for _, d := range model.StepTypeDocs() {
		if !slices.Contains(step.Properties["type"].Enum, any(d.Type)) {
			t.Errorf("enum type thiếu %s", d.Type)
		}
		for _, f := range append(d.Fields, d.Pinnable...) {
			f, _, _ = strings.Cut(f, "[")
			if step.Properties[f] == nil {
				t.Errorf("%s: trường %q không có trong schema Step", d.Type, f)
			}
		}
	}
	if len(sc.Required) != 0 || sc.Defs["cond"] == nil {
		t.Error("schema: bỏ required, có $defs.cond")
	}
}
