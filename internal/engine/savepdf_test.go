package engine

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/browser"
	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

func pdfStep(path string) model.Step {
	return modeltest.Step(model.StepSavePdf, func(s *model.Step) { s.FilePath, s.TimeoutMs, s.IntervalMs = path, 600, 10 })
}

func pdfBtn(name string) element.Node {
	return element.Node{Role: "button", Title: name, Box: elemBox(10, 10, 80, 30)}
}

// Cmd+P → nút Lưu → ô tên .pdf → gõ đường dẫn + Enter → file xuất hiện.
func TestSavePdf(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bao-cao.pdf")
	e, f := tabEngine()
	in := e.in.(*devicetest.FakeInput)
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{
		{pdfBtn("Cancel"), pdfBtn("Save")},
		{{Role: "textbox", Value: "Sân thử.pdf", Box: elemBox(0, 0, 100, 20)}},
	}}
	go func() { time.Sleep(80 * time.Millisecond); os.WriteFile(path, []byte("%PDF-1.4"), 0o644) }()
	res, _ := e.execNode(t.Context(), pdfStep(path), 1)
	if res.Status != model.StatusSuccess {
		t.Fatalf("%s %+v", res.Status, res.Error)
	}
	if res.Output["path"] != path || res.Output["size"] != int64(8) || res.Output["tabId"] != nil && false {
		t.Errorf("output %v", res.Output)
	}
	if want := []string{"activate 2"}; len(f.Calls) != 1 || f.Calls[0] != want[0] {
		t.Errorf("tab gọi %q", f.Calls)
	}
	if fe := e.elems.(*devicetest.FakeElements); len(fe.Acts) != 1 || fe.Acts[0] != "1:press:" || fe.Apps[0] != browser.ElementApp(model.BrowserChrome) {
		t.Errorf("acts %v apps %v", fe.Acts, fe.Apps)
	}
	if !strings.Contains(strings.Join(in.Lines(), "\n"), path) {
		t.Errorf("chưa gõ đường dẫn: %q", in.Lines())
	}
}

// Đích đang là máy in thật (nút In) → invalid_input, không gõ gì.
func TestSavePdfPrinterDestination(t *testing.T) {
	e, _ := tabEngine()
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{{pdfBtn("Cancel"), pdfBtn("Print")}}}
	res, _ := e.execNode(t.Context(), pdfStep(filepath.Join(t.TempDir(), "a.pdf")), 1)
	if res.Error == nil || res.Error.Code != "invalid_input" || !strings.Contains(res.Error.Message, "máy in") {
		t.Fatalf("%+v", res.Error)
	}
}

// Không thấy hộp in → timeout kèm bước kẹt.
func TestSavePdfNoDialog(t *testing.T) {
	e, _ := tabEngine()
	e.elems = &devicetest.FakeElements{Frames: [][]element.Node{{pdfBtn("Cancel")}}}
	res, _ := e.execNode(t.Context(), pdfStep(filepath.Join(t.TempDir(), "a.pdf")), 1)
	if res.Error == nil || res.Error.Code != "timeout" || res.Error.Detail["stage"] != "print" {
		t.Fatalf("%+v", res.Error)
	}
}

func TestSavePdfBadPath(t *testing.T) {
	for _, p := range []string{"", "/tmp/a.txt", "/khong/co/thu/muc/a.pdf"} {
		e, _ := tabEngine()
		res, _ := e.execNode(t.Context(), pdfStep(p), 1)
		if res.Error == nil || res.Error.Code != "invalid_input" {
			t.Errorf("%q: %+v", p, res.Error)
		}
	}
}
