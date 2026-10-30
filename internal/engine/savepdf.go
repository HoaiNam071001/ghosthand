package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"ghosthand/internal/browser"
	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Node In / lưu PDF (bước 43 B7): đưa tab lên trước → Cmd / Ctrl+P → nút Lưu của hộp in Chrome (đích phải là
// *Lưu dưới dạng PDF*) → hộp lưu file của hệ điều hành: gõ đường dẫn đầy đủ + Enter → chờ file có và cỡ đứng yên.
// Hộp in là trang web của Chrome, hộp lưu là của hệ điều hành – cả hai đọc qua cây accessibility, nên giao diện đổi
// theo phiên bản Chrome thì node báo rõ đang kẹt ở bước nào (error.detail.stage) thay vì đoán mò.

var (
	pdfSaveLabels  = []string{"save", "lưu"} // nút của hộp in khi đích là Lưu dưới dạng PDF
	pdfPrintLabels = []string{"print", "in"} // đích đang là máy in thật
)

func (e *Engine) savePdf(ctx context.Context, s model.Step) (map[string]any, error) {
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	path, err := pdfTarget(s.FilePath)
	if err != nil {
		return nil, err
	}
	t, err := e.waitTab(ctx, s)
	if err != nil {
		return nil, err
	}
	app := browser.ElementApp(t.Browser)
	if err := e.tabs.Activate(ctx, t); err != nil {
		return nil, err
	}
	if err := e.pressKeys(ctx, model.Step{Keys: []string{"p"}, Modifiers: []string{shortcutMod()}}); err != nil {
		return nil, err
	}
	stage, why := "print", ""
	fail := func(msg string) error {
		return &timeoutErr{msg: fmt.Sprintf("%s (bước %s, sau %s)", msg, stage, fmtSeconds(s.TimeoutMs)), detail: map[string]any{"stage": stage, "why": why, "browser": t.Browser}}
	}
	// 1. hộp in: nút Lưu hiện ra = đích là PDF
	var saveIdx int
	_, err = e.waitLoop(ctx, s, "print", func() (bool, int, error) {
		nodes, err := e.elems.Elements(app)
		if err != nil {
			if waitable(err) {
				why = err.Error()
				return false, 0, nil
			}
			return false, 0, err
		}
		if i := findButton(nodes, pdfSaveLabels); i >= 0 {
			saveIdx = i
			return true, 100, nil
		}
		if findButton(nodes, pdfPrintLabels) >= 0 {
			why = "hộp in đang chọn máy in thật – chọn đích *Lưu dưới dạng PDF* một lần, Chrome sẽ nhớ"
			return false, 0, &invalidErr{why}
		}
		why = "chưa thấy hộp in của trình duyệt"
		return false, 0, nil
	})
	if err != nil {
		return nil, e.pdfErr(err, fail, "không mở được hộp in")
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return nil, &invalidErr{fmt.Sprintf("không ghi đè được %s: %v", path, err)}
	}
	if err := e.elems.Act(app, saveIdx, model.ElActPress, ""); err != nil {
		return nil, err
	}
	// 2. hộp lưu file: ô tên có đuôi .pdf
	stage = "save"
	_, err = e.waitLoop(ctx, s, "save", func() (bool, int, error) {
		nodes, err := e.elems.Elements(app)
		if err != nil {
			return false, 0, nil
		}
		for _, n := range nodes {
			if n.Role == "textbox" && strings.HasSuffix(strings.ToLower(strings.TrimSpace(n.Value)), ".pdf") {
				return true, 100, nil
			}
		}
		why = "chưa thấy hộp lưu file"
		return false, 0, nil
	})
	if err != nil {
		return nil, e.pdfErr(err, fail, "không thấy hộp lưu file")
	}
	if err := e.pressKeys(ctx, model.Step{Keys: []string{"a"}, Modifiers: []string{shortcutMod()}}); err != nil {
		return nil, err
	}
	if err := e.in.TypeStr(path); err != nil {
		return nil, err
	}
	if err := e.pressKeys(ctx, model.Step{Keys: []string{"enter"}}); err != nil {
		return nil, err
	}
	// 3. chờ file ghi xong
	stage = "file"
	var size int64
	_, err = e.waitLoop(ctx, s, "download", func() (bool, int, error) {
		st, err := os.Stat(path)
		if err != nil || st.Size() == 0 {
			why = "file chưa có"
			return false, 0, nil
		}
		ok := st.Size() == size
		size = st.Size()
		return ok, 0, nil
	})
	if err != nil {
		return nil, e.pdfErr(err, fail, "file PDF chưa ghi xong")
	}
	return map[string]any{"path": path, "name": filepath.Base(path), "size": size, "url": t.URL, "title": t.Title}, nil
}

func (e *Engine) pdfErr(err error, fail func(string) error, msg string) error {
	if err == errTimeout {
		return fail(msg)
	}
	return err
}

// pdfTarget – đường dẫn file đích: tuyệt đối / ~, đuôi .pdf, thư mục đã có.
func pdfTarget(p string) (string, error) {
	if strings.TrimSpace(p) == "" {
		return "", &invalidErr{"chưa nhập nơi lưu file PDF"}
	}
	path, err := userPath(p)
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(filepath.Ext(path), ".pdf") {
		return "", &invalidErr{fmt.Sprintf("%s phải có đuôi .pdf", path)}
	}
	if st, err := os.Stat(filepath.Dir(path)); err != nil || !st.IsDir() {
		return "", &invalidErr{fmt.Sprintf("thư mục %s chưa có", filepath.Dir(path))}
	}
	return path, nil
}

// findButton – nút có tên đúng một trong labels (không phân biệt hoa thường); -1 = không có.
func findButton(nodes []element.Node, labels []string) int {
	for i, n := range nodes {
		if n.Role != "button" {
			continue
		}
		name := strings.ToLower(strings.TrimSpace(n.Name()))
		for _, l := range labels {
			if name == l && n.Shown() {
				return i
			}
		}
	}
	return -1
}
