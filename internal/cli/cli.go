// Package cli – lệnh dòng lệnh của app (bước 22): `ghosthand run <file> …` gửi sang app đang mở qua API local
// (internal/api, thông tin cổng + token trong api.json); app chưa mở thì mở rồi chờ. Không tự chạy engine – quyền
// macOS, lịch sử, F8 / thanh mini đều của app.
package cli

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Mã thoát.
const (
	ExitOK      = 0
	ExitFail    = 1 // kịch bản lỗi / bị dừng / app từ chối chạy
	ExitUsage   = 2
	ExitConnect = 3 // không nối được app
)

const usage = `Cách dùng:
  ghosthand run <file.json> [--preset "Tên bộ"] [--set KEY=GIÁ_TRỊ]… [--countdown GIÂY] [--no-wait]
  ghosthand quit      thoát app đang mở (từ chối khi đang chạy kịch bản / kịch bản chưa lưu), chờ tới khi tắt hẳn

  --preset     bộ giá trị input đã lưu trong form Chạy của app
  --set        giá trị một input (ghi đè preset), lặp lại được
  --countdown  đếm ngược trước khi chạy (mặc định 0)
  --no-wait    gửi lệnh rồi thoát ngay, in runId (mặc định: chờ xong, in tiến độ)

Mã thoát: 0 xong · 1 lỗi / bị dừng · 2 sai lệnh · 3 không nối được app`

// Args – lệnh run đã đọc.
type Args struct {
	Path      string
	Preset    string
	Values    map[string]any
	Countdown int
	NoWait    bool
}

// IsCommand – args (không gồm tên chương trình) là lệnh CLI (không mở giao diện).
func IsCommand(args []string) bool {
	return len(args) > 0 && (args[0] == "run" || args[0] == "quit" || args[0] == "help" || args[0] == "--help" || args[0] == "-h")
}

var errHelp = errors.New("help")

// Parse đọc `run <file> [cờ]…` – cờ đứng trước hay sau tên file đều được.
func Parse(args []string) (Args, error) {
	a := Args{Values: map[string]any{}}
	if len(args) == 0 || args[0] != "run" {
		return a, errHelp
	}
	rest := args[1:]
	next := func(i *int, name string) (string, error) {
		if *i+1 >= len(rest) {
			return "", fmt.Errorf("%s thiếu giá trị", name)
		}
		*i++
		return rest[*i], nil
	}
	for i := 0; i < len(rest); i++ {
		arg := rest[i]
		name, val, hasVal := strings.Cut(arg, "=")
		if !strings.HasPrefix(arg, "--") {
			if a.Path != "" {
				return a, fmt.Errorf("thừa %q – chỉ một file kịch bản", arg)
			}
			a.Path = arg
			continue
		}
		var err error
		if !hasVal && name != "--no-wait" && name != "--help" {
			val, err = next(&i, name)
			if err != nil {
				return a, err
			}
		}
		switch name {
		case "--preset":
			a.Preset = val
		case "--set":
			k, v, ok := strings.Cut(val, "=")
			if !ok || k == "" {
				return a, fmt.Errorf("--set cần dạng KEY=GIÁ_TRỊ, nhận %q", val)
			}
			a.Values[k] = v
		case "--countdown":
			if a.Countdown, err = strconv.Atoi(val); err != nil || a.Countdown < 0 {
				return a, fmt.Errorf("--countdown cần số giây ≥ 0, nhận %q", val)
			}
		case "--no-wait":
			a.NoWait = true
		case "--help":
			return a, errHelp
		default:
			return a, fmt.Errorf("không biết cờ %s", name)
		}
	}
	if a.Path == "" {
		return a, errors.New("thiếu file kịch bản")
	}
	return a, nil
}

// Main chạy lệnh CLI, trả mã thoát.
func Main(args []string, c *Client, out, errOut io.Writer) int {
	if len(args) == 1 && args[0] == "quit" {
		return c.Quit(out, errOut)
	}
	a, err := Parse(args)
	if errors.Is(err, errHelp) {
		fmt.Fprintln(out, usage)
		return ExitOK
	}
	if err != nil {
		fmt.Fprintf(errOut, "Lỗi: %v\n\n%s\n", err, usage)
		return ExitUsage
	}
	if abs, e := filepath.Abs(a.Path); e == nil {
		a.Path = abs
	}
	if _, err := os.Stat(a.Path); err != nil {
		fmt.Fprintf(errOut, "Lỗi: không đọc được %s\n", a.Path)
		return ExitUsage
	}
	return c.Run(a, out, errOut)
}
