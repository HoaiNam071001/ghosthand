package store

import (
	"bytes"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
	"unicode"

	"ghosthand/internal/model"
)

// Lịch sử chạy (bước 20 F5): mỗi lần chạy lưu một file runs/<kịch bản>/<id>.json (model.RunRecord) + ảnh màn hình
// <id>-<n>.png lúc node thất bại. Giữ maxRuns lần gần nhất mỗi kịch bản.

const maxRuns = 50

// RunsDir – thư mục lịch sử của một kịch bản: runs/<tên>-<8 ký tự hash đường dẫn>. Chưa lưu thì hash theo tên.
func RunsDir(base, name, path string) string {
	key := path
	if key == "" {
		key = "unsaved:" + name
	}
	h := sha1.Sum([]byte(key))
	return filepath.Join(base, "runs", slug(name)+"-"+hex.EncodeToString(h[:4]))
}

// slug – tên kịch bản thành tên file: chữ thường, ký tự khác chữ / số thành -, tối đa 40 ký tự.
func slug(name string) string {
	s := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return unicode.ToLower(r)
		}
		return '-'
	}, name)
	if r := []rune(strings.Trim(s, "-")); len(r) > 40 {
		s = string(r[:40])
	}
	return strings.Trim(s, "-")
}

// NewRunID – id theo giờ bắt đầu (sắp theo tên = theo thời gian).
func NewRunID(t time.Time) string { return t.Format("20060102-150405.000") }

// SaveRun ghi lần chạy + ảnh lúc lỗi vào dir rồi xoá các lần cũ quá maxRuns.
func SaveRun(dir string, rec model.RunRecord, shots map[string]image.Image) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	for name, img := range shots {
		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dir, rec.ID+"-"+name), buf.Bytes(), 0o644); err != nil {
			return err
		}
	}
	b, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, rec.ID+".json"), b, 0o644); err != nil {
		return err
	}
	ids := runIDs(dir)
	for _, id := range ids[min(len(ids), maxRuns):] {
		olds, _ := filepath.Glob(filepath.Join(dir, id+"-*.png"))
		for _, f := range append(olds, filepath.Join(dir, id+".json")) {
			os.Remove(f)
		}
	}
	return nil
}

// runIDs – id các lần chạy trong dir, mới nhất trước.
func runIDs(dir string) []string {
	files, _ := filepath.Glob(filepath.Join(dir, "*.json"))
	ids := make([]string, len(files))
	for i, f := range files {
		ids[i] = strings.TrimSuffix(filepath.Base(f), ".json")
	}
	slices.Sort(ids)
	slices.Reverse(ids)
	return ids
}

// listRuns đọc tóm tắt các lần chạy trong dir, mới nhất trước (file hỏng thì bỏ qua).
func listRuns(dir string) []model.RunSummary {
	out := []model.RunSummary{}
	for _, id := range runIDs(dir) {
		var r struct{ model.RunSummary }
		if b, err := os.ReadFile(filepath.Join(dir, id+".json")); err == nil && json.Unmarshal(b, &r) == nil {
			out = append(out, r.RunSummary)
		}
	}
	return out
}

// safeName chặn tên file có đường dẫn (id / tên ảnh đến từ frontend) và ký tự glob (deleteRun ghép id vào mẫu tìm ảnh).
func safeName(n string) error {
	if n == "" || n != filepath.Base(n) || strings.HasPrefix(n, ".") || strings.ContainsAny(n, `*?[\/`) {
		return errors.New("tên file lịch sử không hợp lệ")
	}
	return nil
}

func loadRun(dir, id string) (model.RunRecord, error) {
	var r model.RunRecord
	if err := safeName(id); err != nil {
		return r, err
	}
	b, err := os.ReadFile(filepath.Join(dir, id+".json"))
	if err != nil {
		return r, fmt.Errorf("không đọc được lần chạy: %w", err)
	}
	return r, json.Unmarshal(b, &r)
}

// RunsOf – lịch sử chạy của kịch bản (tên + đường dẫn file như lúc chạy), mới nhất trước.
func RunsOf(name, path string) []model.RunSummary {
	base, err := ConfigDir()
	if err != nil {
		return []model.RunSummary{}
	}
	return listRuns(RunsDir(base, name, path))
}

// GetRun – toàn bộ một lần chạy (nhật ký từng node).
func GetRun(name, path, id string) (model.RunRecord, error) {
	base, err := ConfigDir()
	if err != nil {
		return model.RunRecord{}, err
	}
	return loadRun(RunsDir(base, name, path), id)
}

// RunShot – ảnh màn hình lúc node thất bại (StepResult.Shot) dạng data URL.
func RunShot(name, path, id, shot string) (string, error) {
	base, err := ConfigDir()
	if err != nil {
		return "", err
	}
	if err := safeName(id + "-" + shot); err != nil {
		return "", err
	}
	b, err := os.ReadFile(filepath.Join(RunsDir(base, name, path), id+"-"+shot))
	if err != nil {
		return "", fmt.Errorf("không đọc được ảnh: %w", err)
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(b), nil
}

// deleteRun xoá một lần chạy trong dir: <id>.json + ảnh <id>-*.png.
func deleteRun(dir, id string) error {
	if err := safeName(id); err != nil {
		return err
	}
	shots, _ := filepath.Glob(filepath.Join(dir, id+"-*.png"))
	for _, f := range shots {
		if err := os.Remove(f); err != nil {
			return fmt.Errorf("không xoá được ảnh của lần chạy: %w", err)
		}
	}
	if err := os.Remove(filepath.Join(dir, id+".json")); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("không xoá được lần chạy: %w", err)
	}
	return nil
}

// DeleteRun – xoá một lần chạy trong lịch sử của kịch bản.
func DeleteRun(name, path, id string) error {
	base, err := ConfigDir()
	if err != nil {
		return err
	}
	return deleteRun(RunsDir(base, name, path), id)
}

// ClearRuns – xoá cả thư mục lịch sử của kịch bản (mọi lần chạy + ảnh).
func ClearRuns(name, path string) error {
	base, err := ConfigDir()
	if err != nil {
		return err
	}
	if err := os.RemoveAll(RunsDir(base, name, path)); err != nil {
		return fmt.Errorf("không xoá được lịch sử chạy: %w", err)
	}
	return nil
}
