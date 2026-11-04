package batch

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"ghosthand/internal/samples"
)

// SamplePrefix – đích dạng mau:<id> = kịch bản mẫu (Mẫu thử).
const SamplePrefix = "mau:"

// Select – chọn thêm mẫu: Samples = mọi mẫu chạy trên sân thử cục bộ (bỏ mẫu web thật / cần chuẩn bị tay, All thì lấy
// cả); Level > 0 = chỉ mẫu mức đó. Mẫu ghi thẳng mau:<id> thì không lọc.
type Select struct {
	Samples bool `json:"samples,omitempty"`
	All     bool `json:"all,omitempty"`
	Level   int  `json:"level,omitempty"`
}

// Request – yêu cầu chạy một lượt (API /batch, MCP run_batch). Preset: bộ input đã lưu – kịch bản không có bộ này
// thì dùng mặc định; Values ghi đè input cùng key ở mọi kịch bản.
type Request struct {
	Targets []string `json:"targets"`
	Select
	Preset string         `json:"preset,omitempty"`
	Values map[string]any `json:"values,omitempty"`
}

// Resolve đổi đích (file .json, thư mục – lấy mọi .json bên trong, mau:<id>) + Select thành danh sách chạy, giữ thứ tự,
// bỏ trùng. Đường dẫn phải tuyệt đối (CLI đổi theo thư mục đang đứng trước khi gửi).
func Resolve(targets []string, sel Select) ([]Item, error) {
	var items []Item
	seen := map[string]bool{}
	add := func(it Item) {
		key := it.Path + "|" + it.Sample
		if !seen[key] {
			seen[key] = true
			items = append(items, it)
		}
	}
	list, err := samples.List()
	if err != nil {
		return nil, err
	}
	for _, t := range targets {
		if id, ok := strings.CutPrefix(t, SamplePrefix); ok {
			if !slices.ContainsFunc(list, func(i samples.Info) bool { return i.ID == id }) {
				return nil, fmt.Errorf("không có mẫu %q", id)
			}
			add(Item{Name: t, Sample: id})
			continue
		}
		files, err := scriptFiles(t)
		if err != nil {
			return nil, err
		}
		for _, f := range files {
			add(Item{Name: f.name, Path: f.path})
		}
	}
	if sel.Samples || sel.All || sel.Level > 0 {
		for _, i := range list {
			if (sel.All || !i.Real && !i.Manual) && (sel.Level == 0 || i.Level == sel.Level) {
				add(Item{Name: SamplePrefix + i.ID, Sample: i.ID})
			}
		}
	}
	if len(items) == 0 {
		return nil, errors.New("không có kịch bản nào để chạy – cho file / thư mục / mau:<id> hoặc --samples")
	}
	return items, nil
}

type scriptFile struct{ name, path string }

// scriptFiles – t là file: chính nó; thư mục: mọi .json bên trong (cả thư mục con, bỏ thư mục ẩn), tên tương đối.
func scriptFiles(t string) ([]scriptFile, error) {
	if !filepath.IsAbs(t) {
		return nil, fmt.Errorf("%s: cần đường dẫn tuyệt đối", t)
	}
	info, err := os.Stat(t)
	if err != nil {
		return nil, fmt.Errorf("không đọc được %s", t)
	}
	if !info.IsDir() {
		return []scriptFile{{strings.TrimSuffix(filepath.Base(t), ".json"), t}}, nil
	}
	var out []scriptFile
	err = filepath.WalkDir(t, func(p string, d fs.DirEntry, err error) error {
		switch {
		case err != nil:
			return err
		case d.IsDir() && p != t && strings.HasPrefix(d.Name(), "."):
			return filepath.SkipDir
		case !d.IsDir() && strings.EqualFold(filepath.Ext(p), ".json"):
			rel, _ := filepath.Rel(t, p)
			out = append(out, scriptFile{strings.TrimSuffix(filepath.ToSlash(rel), filepath.Ext(rel)), p})
		}
		return nil
	})
	if err == nil && len(out) == 0 {
		err = fmt.Errorf("thư mục %s không có file .json nào", t)
	}
	return out, err
}
