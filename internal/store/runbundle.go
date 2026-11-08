package store

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"ghosthand/internal/model"
	"ghosthand/internal/secrets"
)

// Gói lỗi (56 D2): một lần chạy trong lịch sử + kịch bản + máy đang dùng → .zip để gửi báo lỗi. Lịch sử đã qua
// masker của engine; ở đây che thêm lần nữa (giá trị bí mật hiện có trong kho, input tên kiểu mật khẩu) vì kịch bản
// có thể chứa mật khẩu gõ thẳng và bí mật có thể được thêm sau lần chạy.

// BundleInfo – máy + app lúc xuất gói (info.json).
type BundleInfo struct {
	App     string `json:"app"`
	OS      string `json:"os"`
	OSVer   string `json:"osVersion,omitempty"`
	Arch    string `json:"arch"`
	Created string `json:"created"`
	RunID   string `json:"runId"`
	Script  string `json:"script"`
}

// BundleName – tên file gợi ý cho hộp Lưu.
func BundleName(script, id string) string {
	n := slug(script)
	if n == "" {
		n = "kich-ban"
	}
	return "ghosthand-loi-" + n + "-" + id + ".zip"
}

// WriteRunBundle ghi gói lỗi của lần chạy id (kịch bản name / path như lịch sử) vào w: info.json, run.json,
// script.json (bản người dùng đang mở) và shots/<ảnh lúc lỗi>. vals: giá trị bí mật cần che (tên → giá trị).
func WriteRunBundle(w io.Writer, name, path, id string, script model.Script, info BundleInfo, vals map[string]string) error {
	base, err := ConfigDir()
	if err != nil {
		return err
	}
	return writeBundle(w, RunsDir(base, name, path), id, script, info, secretRedactor(vals))
}

func writeBundle(w io.Writer, dir, id string, script model.Script, info BundleInfo, redact func(string) string) error {
	rec, err := loadRun(dir, id)
	if err != nil {
		return err
	}
	for k := range rec.Inputs {
		if model.IsSecretKey(k) {
			rec.Inputs[k] = "••••"
		}
	}
	zw := zip.NewWriter(w)
	for _, f := range []struct {
		name string
		v    any
	}{{"info.json", info}, {"run.json", rec}, {"script.json", script}} {
		if err := addJSON(zw, f.name, f.v, redact); err != nil {
			return err
		}
	}
	shots, _ := filepath.Glob(filepath.Join(dir, id+"-*.png"))
	for _, s := range shots {
		if err := addFile(zw, "shots/"+strings.TrimPrefix(filepath.Base(s), id+"-"), s); err != nil {
			return err
		}
	}
	return zw.Close()
}

func addJSON(zw *zip.Writer, name string, v any, redact func(string) string) error {
	b, err := json.MarshalIndent(v, "", " ")
	if err != nil {
		return err
	}
	f, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = io.WriteString(f, redact(string(b)))
	return err
}

func addFile(zw *zip.Writer, name, src string) error {
	b, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("không đọc được ảnh: %w", err)
	}
	f, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = f.Write(b)
	return err
}

// secretRedactor – che giá trị bí mật (từ MinLen ký tự, dài trước) cả nguyên văn lẫn dạng đã thoát trong chuỗi JSON
// (bí mật có " \ hay ký tự điều khiển thì bản trong file JSON khác nguyên văn).
func secretRedactor(vals map[string]string) func(string) string {
	var olds []string
	for _, v := range vals {
		if len(v) < secrets.MinLen { // như engine/mask.go: che "ab" sẽ phá nát chữ khác
			continue
		}
		olds = append(olds, v)
		if b, err := json.Marshal(v); err == nil && string(b[1:len(b)-1]) != v {
			olds = append(olds, string(b[1:len(b)-1]))
		}
	}
	// Replacer thử mẫu theo thứ tự tại mỗi vị trí – dài trước để bí mật chứa bí mật khác được che trọn
	slices.SortFunc(olds, func(a, b string) int { return len(b) - len(a) })
	pairs := make([]string, 0, 2*len(olds))
	for _, o := range olds {
		pairs = append(pairs, o, "••••")
	}
	return strings.NewReplacer(pairs...).Replace
}
