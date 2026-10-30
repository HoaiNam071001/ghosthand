// Package pack – gói kịch bản để chia sẻ (bước 28 R3): một file .zip gồm script.json + các file mà node đọc từ máy
// (CSV / xlsx của Lặp qua danh sách, ảnh của Clipboard, ảnh gửi Hỏi AI). Ảnh mẫu đã nhúng base64 trong kịch bản nên
// không cần chép. Trong gói đường dẫn file là "files/<tên>"; nhập gói thì giải nén ra thư mục cạnh kịch bản và đổi
// đường dẫn sang chỗ mới. File ghi ra (Chụp màn hình, Lưu PDF…) không đóng gói – đường dẫn giữ nguyên.
package pack

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

const (
	scriptEntry = "script.json"
	filesDir    = "files/"
	maxEntry    = 200 << 20 // giới hạn mỗi file khi giải nén – gói lạ không làm đầy ổ đĩa
)

// Result – tóm tắt một lần xuất / nhập để báo người dùng.
type Result struct {
	Path    string   `json:"path"`    // file .zip đã ghi (xuất) / file kịch bản đã tạo (nhập)
	Files   []string `json:"files"`   // tên các file kèm theo
	Missing []string `json:"missing"` // xuất: đường dẫn node trỏ tới mà không đọc được (node đó cần chọn lại file sau khi nhập)
}

// inputFile – node đọc file FilePath từ máy (cần đóng gói).
func inputFile(s model.Step) bool {
	switch s.Type {
	case model.StepForEach:
		return s.ListFrom == model.ListFile
	case model.StepClipboard:
		return s.ClipOp == model.ClipImage
	case model.StepAskAI:
		return s.AIImage == model.AIImageFile
	}
	return false
}

// Export ghi gói của sc ra dest (.zip). Đường dẫn có {{biến}} không đóng gói được – giữ nguyên.
func Export(sc model.Script, dest string) (Result, error) {
	res := Result{Path: dest, Files: []string{}, Missing: []string{}}
	out := sc
	out.Steps = append([]model.Step(nil), sc.Steps...)
	type entry struct{ name, src string }
	var files []entry
	byPath := map[string]string{} // file gốc → tên trong gói (nhiều node cùng một file)
	used := map[string]bool{}
	for i, s := range out.Steps {
		p := strings.TrimSpace(s.FilePath)
		if !inputFile(s) || p == "" || strings.Contains(p, "{{") {
			continue
		}
		src, err := script.UserPath(p)
		if err != nil {
			return res, err
		}
		if st, err := os.Stat(src); err != nil || st.IsDir() {
			res.Missing = append(res.Missing, p)
			continue
		}
		name, ok := byPath[src]
		if !ok {
			name = uniqueName(filepath.Base(src), used)
			byPath[src] = name
			files = append(files, entry{name, src})
			res.Files = append(res.Files, name)
		}
		out.Steps[i].FilePath = filesDir + name
	}
	b, err := script.EncodeScript(out)
	if err != nil {
		return res, err
	}
	f, err := os.Create(dest)
	if err != nil {
		return res, err
	}
	zw := zip.NewWriter(f)
	err = writeEntry(zw, scriptEntry, func(w io.Writer) error { _, err := w.Write(b); return err })
	for _, e := range files {
		if err != nil {
			break
		}
		err = writeEntry(zw, filesDir+e.name, func(w io.Writer) error { return copyFile(w, e.src) })
	}
	if cerr := zw.Close(); err == nil {
		err = cerr
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(dest)
	}
	return res, err
}

// Import giải nén gói src vào dir: kịch bản thành dir/<tên>.json (trùng thì thêm số), file kèm vào dir/<tên>-files/.
func Import(src, dir string) (Result, error) {
	res := Result{Files: []string{}, Missing: []string{}}
	zr, err := zip.OpenReader(src)
	if err != nil {
		return res, fmt.Errorf("không đọc được gói %s: %w", filepath.Base(src), err)
	}
	defer zr.Close()
	var sc model.Script
	found := false
	for _, f := range zr.File {
		if f.Name != scriptEntry {
			continue
		}
		b, err := readEntry(f)
		if err != nil {
			return res, err
		}
		if sc, err = script.DecodeScript(b); err != nil {
			return res, fmt.Errorf("kịch bản trong gói không hợp lệ: %w", err)
		}
		found = true
	}
	if !found {
		return res, errors.New("không phải gói kịch bản Ghosthand (thiếu script.json)")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return res, err
	}
	name := safeBase(sc.Name)
	scriptPath := freePath(dir, name, ".json")
	base := strings.TrimSuffix(filepath.Base(scriptPath), ".json")
	filesAt := filepath.Join(dir, base+"-files")
	for _, f := range zr.File {
		// chỉ file phẳng ngay trong files/ – tên lồng thư mục, "..", đường dẫn tuyệt đối bị bỏ (zip slip)
		rel, ok := strings.CutPrefix(f.Name, filesDir)
		if !ok || rel == "" || rel != path.Base(rel) || rel == ".." || f.FileInfo().IsDir() {
			continue
		}
		b, err := readEntry(f)
		if err != nil {
			return res, err
		}
		if err := os.MkdirAll(filesAt, 0o755); err != nil {
			return res, err
		}
		if err := os.WriteFile(filepath.Join(filesAt, rel), b, 0o644); err != nil {
			return res, err
		}
		res.Files = append(res.Files, rel)
	}
	for i, s := range sc.Steps {
		if rel, ok := strings.CutPrefix(s.FilePath, filesDir); ok {
			sc.Steps[i].FilePath = filepath.Join(filesAt, path.Base(rel))
		}
	}
	b, err := script.EncodeScript(sc)
	if err != nil {
		return res, err
	}
	if err := os.WriteFile(scriptPath, b, 0o644); err != nil {
		return res, err
	}
	res.Path = scriptPath
	return res, nil
}

func writeEntry(zw *zip.Writer, name string, fill func(io.Writer) error) error {
	w, err := zw.Create(name)
	if err != nil {
		return err
	}
	return fill(w)
}

func copyFile(w io.Writer, src string) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(w, f)
	return err
}

func readEntry(f *zip.File) ([]byte, error) {
	if f.UncompressedSize64 > maxEntry {
		return nil, fmt.Errorf("file %s trong gói quá lớn", f.Name)
	}
	r, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer r.Close()
	b, err := io.ReadAll(io.LimitReader(r, maxEntry+1))
	if err != nil {
		return nil, err
	}
	if len(b) > maxEntry {
		return nil, fmt.Errorf("file %s trong gói quá lớn", f.Name)
	}
	return b, nil
}

// uniqueName – tên chưa dùng trong gói: a.csv, a-2.csv…
func uniqueName(name string, used map[string]bool) string {
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	n := name
	for i := 2; used[strings.ToLower(n)]; i++ {
		n = fmt.Sprintf("%s-%d%s", stem, i, ext)
	}
	used[strings.ToLower(n)] = true
	return n
}

// safeBase – tên kịch bản làm tên file: bỏ ký tự không hợp lệ trên Windows / macOS.
func safeBase(name string) string {
	n := strings.Map(func(r rune) rune {
		if strings.ContainsRune(`<>:"/\|?*`, r) || r < 32 {
			return '-'
		}
		return r
	}, strings.TrimSpace(name))
	if n = strings.Trim(n, ". "); n == "" {
		n = "kich-ban"
	}
	return n
}

// freePath – dir/name+ext chưa có file; có rồi thì name-2, name-3…
func freePath(dir, name, ext string) string {
	p := filepath.Join(dir, name+ext)
	for i := 2; ; i++ {
		if _, err := os.Stat(p); os.IsNotExist(err) {
			return p
		}
		p = filepath.Join(dir, fmt.Sprintf("%s-%d%s", name, i, ext))
	}
}
