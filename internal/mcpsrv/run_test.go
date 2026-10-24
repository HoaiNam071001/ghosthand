package mcpsrv

import (
	"context"
	"image"
	"os"
	"strings"
	"testing"

	"ghosthand/internal/device"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/vision"
	"ghosthand/internal/web"
)

// fakeSession – phiên chạy thật với chuột / phím giả, không lưu lịch sử, không Chrome.
func fakeSession() (*session.Manager, *devicetest.FakeInput) {
	in := &devicetest.FakeInput{}
	return session.New(nil, session.Deps{
		Input:       func() device.Input { return in },
		Screen:      func() model.Rect { return model.Rect{W: 1920, H: 1080} },
		Displays:    func() []model.Rect { return []model.Rect{{W: 1920, H: 1080}} },
		AllowDanger: func(model.Script, string, string) (bool, error) { return false, nil },
		Browser:     func(func(x, y int) error) (web.Browser, func(), error) { return nil, func() {}, nil },
		Corners:     func(context.Context, *device.TrackingInput, func()) {},
		Touch:       func(context.Context, *device.TrackingInput, func() bool, func()) {},
		SaveRun:     func(model.RunRecord, string, map[string]image.Image) error { return nil },
	}), in
}

func (f *fakeBackend) Run(sc model.Script, _ string, values map[string]any, opt session.Options) (string, error) {
	f.lastOpt = opt
	return f.sess.Start(sc, values, opt)
}
func (f *fakeBackend) Wait(ctx context.Context, id string) error {
	_, err := f.sess.Wait(ctx, id)
	return err
}
func (f *fakeBackend) Trace(id string) (session.Trace, error) { return f.sess.Trace(id) }
func (f *fakeBackend) Stop(id string) bool                    { return f.sess.Stop(id) }
func (f *fakeBackend) Capture(r model.Rect) (image.Image, error) {
	return image.NewRGBA(image.Rect(0, 0, r.W, r.H)), nil
}
func (f *fakeBackend) ReadText(image.Image) ([]vision.TextLine, error) {
	return []vision.TextLine{{Text: "Gửi", Box: model.Rect{X: 10, Y: 20, W: 30, H: 10}}}, nil
}
func (f *fakeBackend) Elements(string) ([]element.Node, error) {
	f.elemReads++
	return f.elems, nil
}
func (f *fakeBackend) FindImage(s model.Step, area model.Rect) (engine.FindResult, error) {
	f.found = s
	return engine.FindResult{Found: true, Score: 97, X: area.X + 10, Y: area.Y + 20, W: 30, H: 10, Area: area}, nil
}
func (f *fakeBackend) TemplateScale(image.Image, model.Rect) float64 { return 2 }
func (f *fakeBackend) MousePosition() (int, int)                     { return 300, 400 }
func (f *fakeBackend) Windows() ([]model.WindowInfo, error) {
	return []model.WindowInfo{{Title: "Notepad", App: "notepad", Box: model.Rect{X: 100, Y: 100, W: 800, H: 600}}}, nil
}

// Vòng thử – sửa: n2 dùng biến của node chạy sau nó → lỗi; sửa n2 rồi resume_run → chạy tiếp từ n2 với kết quả n1 cũ,
// n1 không chạy lại.
func TestRunFixResume(t *testing.T) {
	cs, back := connect(t)
	out, isErr := call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "Thử sửa", "steps": []any{
		map[string]any{"type": "wait", "delayAfter": 1},
		map[string]any{"type": "type", "text": "{{n3.status}}"},
		map[string]any{"type": "wait", "delayAfter": 1},
	}}})
	if isErr {
		t.Fatalf("create: %v", out)
	}
	path := out["created"].([]any)[0].(map[string]any)["path"].(string)

	out, isErr = call(t, cs, "run_script", map[string]any{"path": path})
	if isErr || out["state"] != "fail" || out["failedStep"] != "s2" || out["done"] != true {
		t.Fatalf("run: %v", out)
	}
	nodes := out["nodes"].([]any)
	failed := nodes[len(nodes)-1].(map[string]any)
	if failed["ref"] != "n2" || failed["error"].(map[string]any)["code"] != model.ErrInvalidInput || failed["type"] != model.StepText {
		t.Fatalf("node lỗi: %v", failed)
	}
	runID := out["runId"].(string)

	read, _ := call(t, cs, "read_script", map[string]any{"path": path})
	if out, isErr := call(t, cs, "update_script", map[string]any{"path": path, "revision": read["revision"],
		"steps": []any{map[string]any{"ref": "n2", "text": "{{n1.status}}"}}}); isErr {
		t.Fatalf("update: %v", out)
	}
	before := len(back.in.Lines())
	out, isErr = call(t, cs, "resume_run", map[string]any{"runId": runID})
	if isErr || out["state"] != "success" {
		t.Fatalf("resume: %v", out)
	}
	var refs []string
	for _, n := range out["nodes"].([]any) {
		refs = append(refs, n.(map[string]any)["ref"].(string))
	}
	if strings.Join(refs, ",") != "n2,n3" {
		t.Errorf("chạy tiếp các node %v, muốn n2,n3", refs)
	}
	typed := strings.Join(back.in.Lines()[before:], "")
	if !strings.Contains(strings.ReplaceAll(typed, "type ", ""), "success") {
		t.Errorf("gõ %q – biến n1 phải lấy từ lần chạy trước", typed)
	}
}

func TestRunStopAt(t *testing.T) {
	cs, _ := connect(t)
	out, _ := call(t, cs, "create_script", map[string]any{"script": map[string]any{"name": "Hai node", "steps": []any{
		map[string]any{"type": "wait", "delayAfter": 1}, map[string]any{"type": "wait", "delayAfter": 1}}}})
	path := out["created"].([]any)[0].(map[string]any)["path"].(string)
	out, isErr := call(t, cs, "run_script", map[string]any{"path": path, "stopAt": "n1"})
	if isErr || out["reached"] != true || len(out["nodes"].([]any)) != 1 {
		t.Errorf("stopAt: %v", out)
	}
	out, isErr = call(t, cs, "resume_run", map[string]any{"runId": out["runId"]}) // không có node lỗi, thiếu from
	if !isErr {
		t.Errorf("resume không from mà không báo lỗi: %v", out)
	}
}

func TestDescribeScreen(t *testing.T) {
	cs, _ := connect(t)
	out, isErr := call(t, cs, "describe_screen", map[string]any{"window": "notepad"})
	if isErr {
		t.Fatal(out)
	}
	area := out["area"].(map[string]any)
	line := out["lines"].([]any)[0].(map[string]any)
	box := line["box"].(map[string]any)
	if area["x"] != 100.0 || line["text"] != "Gửi" || box["x"] != 110.0 || box["y"] != 120.0 {
		t.Errorf("describe: %v", out)
	}
	if out, isErr := call(t, cs, "describe_screen", map[string]any{"window": "không có"}); !isErr {
		t.Errorf("cửa sổ không có mà không lỗi: %v", out)
	}
}

// Kịch bản tạm (46 B1): run_script nhận script, không tạo file, không ghi lịch sử; resume_run nhận bản đã sửa.
func TestRunTempScript(t *testing.T) {
	cs, back := connect(t)
	temp := func(text string) map[string]any {
		return map[string]any{"name": "Tạm", "steps": []any{
			map[string]any{"type": "wait", "delayAfter": 1},
			map[string]any{"type": "type", "text": text},
			map[string]any{"type": "wait", "delayAfter": 1},
		}}
	}
	out, isErr := call(t, cs, "run_script", map[string]any{"script": temp("{{n3.status}}")})
	if isErr || out["state"] != "fail" || out["failedStep"] != "s2" {
		t.Fatalf("run: %v", out)
	}
	if !back.lastOpt.NoHistory || back.lastOpt.Path != "" {
		t.Errorf("kịch bản tạm phải không ghi lịch sử: %+v", back.lastOpt)
	}
	if entries, _ := os.ReadDir(back.dir); len(entries) != 0 {
		t.Errorf("không được tạo file: %v", entries)
	}
	runID := out["runId"]
	if out, isErr := call(t, cs, "wait_run", map[string]any{"runId": runID}); isErr || out["state"] != "fail" {
		t.Errorf("wait_run: %v", out)
	}
	if out, isErr := call(t, cs, "run_script", map[string]any{"script": temp("x"), "path": "a.json"}); !isErr {
		t.Errorf("gửi cả path lẫn script phải lỗi: %v", out)
	}
	out, isErr = call(t, cs, "resume_run", map[string]any{"runId": runID, "script": temp("{{n1.status}}")})
	if isErr || out["state"] != "success" || len(out["nodes"].([]any)) != 2 {
		t.Fatalf("resume với bản sửa: %v", out)
	}
	if !strings.Contains(strings.ReplaceAll(strings.Join(back.in.Lines(), ""), "type ", ""), "success") {
		t.Errorf("biến n1 phải lấy từ lần chạy trước: %q", back.in.Lines())
	}
}
