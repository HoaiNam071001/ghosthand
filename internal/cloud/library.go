package cloud

import (
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"

	"ghosthand/internal/model"
	"ghosthand/internal/pack"
	"ghosthand/internal/script"
)

// Library – thư mục kịch bản của máy (store.ScriptsDir) dưới dạng cloud.Local (bước 54 C5).
//
//   - scripts/<đường dẫn tương đối>.json ↔ <Root>/<đường dẫn tương đối>.json
//   - assets/<hash12>/<tên> – tệp mà node đọc từ máy (CSV / xlsx, ảnh clipboard, ảnh gửi AI: pack.InputFile). Đặt tên
//     theo nội dung nên máy nào cũng dùng chung; máy nhận đặt vào <Root>/assets/<hash12>/<tên>.
//
// Hash và nội dung đẩy lên là dạng MANG ĐI ĐƯỢC: đường dẫn tuyệt đối của tệp đi kèm viết lại thành assets/…; lúc kéo về
// viết lại thành đường dẫn trên máy nhận. Hai máy khác hệ điều hành vì thế vẫn cùng hash khi không ai sửa.
// Tệp node trỏ tới mà không đọc được → Missing (báo người dùng, đường dẫn giữ nguyên, không im lặng bỏ qua).
type Library struct {
	Root  string
	Trash interface{ MoveToTrash(paths []string) error } // xoá theo cloud thì vào Thùng rác (khôi phục được); nil = xoá hẳn

	mu      sync.Mutex
	assets  map[string]string // đường dẫn cloud → file nguồn ở máy (từ lần quét gần nhất)
	missing []string
	hashes  map[string]fileHash // băm tệp đi kèm, tránh đọc lại tệp lớn khi không đổi
}

type fileHash struct {
	size int64
	mod  int64
	hash string
}

// Missing – tệp đi kèm không đọc được ở lần quét gần nhất ("kịch bản: đường dẫn").
func (l *Library) Missing() []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]string(nil), l.missing...)
}

const assetsLocal = "assets"

func (l *Library) Hashes() (map[string]string, error) {
	out := map[string]string{}
	assets := map[string]string{}
	var missing []string
	err := filepath.WalkDir(l.Root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(l.Root, p)
		if d.IsDir() {
			if rel == assetsLocal || (rel != "." && strings.HasPrefix(d.Name(), ".")) {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.EqualFold(filepath.Ext(p), ".json") || strings.HasPrefix(d.Name(), ".") {
			return nil
		}
		raw, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		cp := ScriptsDir + filepath.ToSlash(rel)
		data, found, miss := l.portable(raw)
		out[cp] = Hash(data)
		for k, v := range found {
			assets[k] = v
		}
		for _, m := range miss {
			missing = append(missing, rel+": "+m)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	for cp, src := range assets {
		h, herr := l.fileHash(src)
		if herr != nil {
			delete(assets, cp)
			continue
		}
		out[cp] = h
	}
	l.mu.Lock()
	l.assets, l.missing = assets, missing
	l.mu.Unlock()
	return out, nil
}

// fileHash – hash nội dung tệp, nhớ theo (cỡ, giờ sửa).
func (l *Library) fileHash(src string) (string, error) {
	st, err := os.Stat(src)
	if err != nil {
		return "", err
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if c, ok := l.hashes[src]; ok && c.size == st.Size() && c.mod == st.ModTime().UnixNano() {
		return c.hash, nil
	}
	b, err := os.ReadFile(src)
	if err != nil {
		return "", err
	}
	if l.hashes == nil {
		l.hashes = map[string]fileHash{}
	}
	h := Hash(b)
	l.hashes[src] = fileHash{st.Size(), st.ModTime().UnixNano(), h}
	return h, nil
}

// assetPath – đường dẫn cloud của tệp đi kèm: assets/<hash12>/<tên>. Hash là hash nội dung → Hashes() của chính tệp
// đó cũng là hash này nên không cần bảng riêng; ở đây chỉ cần tiền tố 12 ký tự.
func assetPath(hash, name string) string { return AssetsDir + hash[:12] + "/" + name }

// portable đổi kịch bản sang dạng mang đi: trả nội dung, tệp đi kèm tìm thấy (đường dẫn cloud → nguồn), tệp thiếu.
// Kịch bản không đọc được (file hỏng / bản mới hơn) đi nguyên văn – vẫn đồng bộ được như một file.
func (l *Library) portable(raw []byte) ([]byte, map[string]string, []string) {
	sc, err := script.DecodeScript(raw)
	if err != nil {
		return raw, nil, nil
	}
	found := map[string]string{}
	var missing []string
	steps := append([]model.Step(nil), sc.Steps...)
	for i, s := range steps {
		p := strings.TrimSpace(s.FilePath)
		if !pack.InputFile(s) || p == "" || strings.Contains(p, "{{") || strings.HasPrefix(p, AssetsDir) {
			continue
		}
		src, err := script.UserPath(p)
		if err != nil {
			continue
		}
		st, err := os.Stat(src)
		if err != nil || st.IsDir() {
			missing = append(missing, p)
			continue
		}
		h, err := l.fileHash(src)
		if err != nil {
			missing = append(missing, p)
			continue
		}
		cp := assetPath(h, safeName(filepath.Base(src)))
		found[cp] = src
		steps[i].FilePath = cp
	}
	sc.Steps = steps
	b, err := script.EncodeScript(sc)
	if err != nil {
		return raw, nil, nil
	}
	return b, found, missing
}

// safeName – tên tệp an toàn trên cloud và mọi hệ điều hành.
func safeName(n string) string {
	n = strings.Map(func(r rune) rune {
		if strings.ContainsRune(`<>:"/\|?*`, r) || r < 32 {
			return '-'
		}
		return r
	}, n)
	if n = strings.Trim(n, ". "); n == "" {
		return "tep"
	}
	return n
}

func (l *Library) Read(cp string) ([]byte, error) {
	if strings.HasPrefix(cp, AssetsDir) {
		l.mu.Lock()
		src, ok := l.assets[cp]
		l.mu.Unlock()
		if !ok {
			return nil, fmt.Errorf("không có tệp đi kèm %s ở máy này", cp)
		}
		return os.ReadFile(src)
	}
	p, err := l.localPath(cp)
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	data, found, _ := l.portable(raw)
	l.mu.Lock()
	if l.assets == nil {
		l.assets = map[string]string{}
	}
	for k, v := range found {
		l.assets[k] = v
	}
	l.mu.Unlock()
	return data, nil
}

func (l *Library) Write(cp string, data []byte) error {
	p, err := l.localPath(cp)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(cp, AssetsDir) {
		data = l.localize(data)
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

// localize: assets/… trong kịch bản nhận về → đường dẫn trên máy này.
func (l *Library) localize(data []byte) []byte {
	sc, err := script.DecodeScript(data)
	if err != nil {
		return data
	}
	steps := append([]model.Step(nil), sc.Steps...)
	for i, s := range steps {
		if rel, ok := strings.CutPrefix(s.FilePath, AssetsDir); ok && pack.InputFile(s) {
			steps[i].FilePath = filepath.Join(l.Root, assetsLocal, filepath.FromSlash(rel))
		}
	}
	sc.Steps = steps
	b, err := script.EncodeScript(sc)
	if err != nil {
		return data
	}
	return b
}

func (l *Library) Remove(cp string) error {
	p, err := l.localPath(cp)
	if err != nil {
		return err
	}
	if l.Trash != nil {
		return l.Trash.MoveToTrash([]string{p})
	}
	return os.Remove(p)
}

// localPath: đường dẫn cloud → file trong Root; từ chối ".." / tuyệt đối (cloud là nguồn không tin cậy).
func (l *Library) localPath(cp string) (string, error) {
	var rel string
	switch {
	case strings.HasPrefix(cp, ScriptsDir):
		rel = strings.TrimPrefix(cp, ScriptsDir)
		if !strings.EqualFold(path.Ext(rel), ".json") {
			return "", fmt.Errorf("đường dẫn kịch bản không hợp lệ: %q", cp)
		}
	case strings.HasPrefix(cp, AssetsDir):
		rel = assetsLocal + "/" + strings.TrimPrefix(cp, AssetsDir)
	default:
		return "", fmt.Errorf("đường dẫn ngoài thư mục kịch bản: %q", cp)
	}
	if rel != path.Clean(rel) || path.IsAbs(rel) || strings.HasPrefix(rel, "../") || strings.Contains(rel, `\`) || strings.Contains(rel, ":") {
		return "", fmt.Errorf("đường dẫn không hợp lệ: %q", cp)
	}
	return filepath.Join(l.Root, filepath.FromSlash(rel)), nil
}
