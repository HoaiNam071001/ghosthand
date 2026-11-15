// Package wisp – node web chạy trên trình duyệt Wisp (bước 62) qua cổng Ghosthand của Wisp: WebSocket 127.0.0.1 +
// token đọc từ <thư mục dữ liệu Wisp>/ghosthand.json, lệnh mức cao (find / click / type…) – Wisp tự bấm bằng sự kiện
// thật trong trình duyệt nên không cần chuột thật, không đưa cửa sổ lên. Giao thức: ../flash-app/docs/plan/01-cong-ghosthand.md.
package wisp

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// API – phiên bản giao thức cổng Wisp mà bản này hiểu.
const API = 1

// infoFile – Wisp ghi lúc mở app (quyền 600), xoá lúc thoát.
const infoFile = "ghosthand.json"

// Info – nội dung ghosthand.json.
type Info struct {
	Port    int    `json:"port"`
	Token   string `json:"token"`
	PID     int    `json:"pid"`
	Version string `json:"version"`
	API     int    `json:"api"`
}

// DataDir – thư mục dữ liệu Wisp: WISP_USER_DATA (Wisp chạy dev / thư mục riêng) hoặc thư mục mặc định của Electron
// (productName "Wisp"). env đọc biến môi trường (test).
func DataDir(goos string, env func(string) string) string {
	if d := env("WISP_USER_DATA"); d != "" {
		return d
	}
	switch goos {
	case "darwin":
		return filepath.Join(env("HOME"), "Library", "Application Support", "Wisp")
	case "windows":
		return filepath.Join(env("APPDATA"), "Wisp")
	}
	if d := env("XDG_CONFIG_HOME"); d != "" {
		return filepath.Join(d, "Wisp")
	}
	return filepath.Join(env("HOME"), ".config", "Wisp")
}

// Lỗi đọc ghosthand.json – chọn câu báo cho người dùng (status.go).
var (
	ErrNotRunning = errors.New("Wisp chưa mở hoặc cổng Ghosthand đang tắt")
	ErrOldAPI     = errors.New("bản Wisp không khớp giao thức")
)

// ReadInfo đọc ghosthand.json của dir; alive kiểm pid còn chạy (file sót lại khi Wisp bị tắt ngang).
func ReadInfo(dir string, alive func(pid int) bool) (Info, error) {
	b, err := os.ReadFile(filepath.Join(dir, infoFile))
	if err != nil {
		return Info{}, ErrNotRunning
	}
	var in Info
	if err := json.Unmarshal(b, &in); err != nil || in.Port <= 0 || in.Token == "" {
		return Info{}, ErrNotRunning
	}
	if in.PID > 0 && !alive(in.PID) {
		return Info{}, ErrNotRunning
	}
	if in.API != API {
		return in, fmt.Errorf("%w: Wisp %s dùng api %d, Ghosthand cần api %d – cập nhật %s", ErrOldAPI, in.Version, in.API, API, newer(in.API))
	}
	return in, nil
}

func newer(api int) string {
	if api > API {
		return "Ghosthand"
	}
	return "Wisp"
}
