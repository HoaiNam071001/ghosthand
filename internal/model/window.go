package model

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// Cửa sổ / app đang chạy (bước 26) – kiểu thuần cho device.Windows / device.Apps, node Cửa sổ / Ứng dụng và tool MCP
// list_windows / list_apps.

// WindowInfo – một cửa sổ cấp cao đang mở (không tính cửa sổ của ghosthand).
type WindowInfo struct {
	ID        uint64 `json:"id"`        // HWND (Windows) / CGWindowID (macOS) – chỉ dùng trong lần chạy, không lưu vào kịch bản
	Title     string `json:"title"`     // tiêu đề
	App       string `json:"app"`       // tên app: Windows tên tệp chạy không .exe (chrome), macOS tên hiển thị
	AppID     string `json:"appId"`     // đường dẫn exe (Windows) / bundle id (macOS)
	PID       int    `json:"pid"`       // tiến trình
	Box       Rect   `json:"box"`       // khung nhìn thấy, cùng hệ toạ độ với điểm click (Windows px thật, macOS point)
	Minimized bool   `json:"minimized"` // đang thu nhỏ – Box rỗng
	Front     bool   `json:"front,omitempty"` // cửa sổ đang nhận phím (app đang active) – thứ tự chồng không đủ tin (57 A1)
}

// AppInfo – một tiến trình / app đang chạy; Windows = số cửa sổ đang mở (0 = chạy nền / chưa có cửa sổ).
type AppInfo struct {
	Name    string `json:"name"` // như WindowInfo.App
	ID      string `json:"id"`   // như WindowInfo.AppID (có thể trống – tiến trình hệ thống không đọc được đường dẫn)
	PID     int    `json:"pid"`
	Windows int    `json:"windows"`
}

// Thao tác của node Cửa sổ (Step.WinOp).
const (
	WinFocus     = ""          // đưa lên trước (bỏ thu nhỏ); chưa thấy thì chờ tới TimeoutMs
	WinWaitOpen  = "waitOpen"  // chờ cửa sổ khớp hiện
	WinWaitClose = "waitClose" // chờ cửa sổ khớp mất
	WinSetBounds = "setBounds" // đặt vị trí + cỡ (WinPreset / WinRect)
	WinMin       = "minimize"
	WinMax       = "maximize"
	WinRestoreOp = "restore"
	WinClose     = "close" // như bấm × – app có thể hỏi lưu
	WinRead      = "read"  // chỉ đọc thông tin
)

var WinOps = []string{WinFocus, WinWaitOpen, WinWaitClose, WinSetBounds, WinMin, WinMax, WinRestoreOp, WinClose, WinRead}

// Cách so tên app / tiêu đề (Step.WinMatch).
const (
	MatchContains = ""      // chứa – không phân biệt hoa thường, không dấu
	MatchExact    = "exact" // đúng cả chuỗi (cũng không phân biệt hoa thường, dấu)
	MatchRegex    = "regex" // biểu thức chính quy, không phân biệt hoa thường
)

var NameMatches = []string{MatchContains, MatchExact, MatchRegex}

// Khung đặt sẵn của setBounds (Step.WinPreset) – tính trong vùng làm việc của màn (WindowPreset).
const (
	PresetRect   = ""       // đúng WinRect (toạ độ màn hình)
	PresetCenter = "center" // cỡ WinRect, giữa màn
	PresetLeft   = "left"   // cỡ WinRect, góc trên trái (cỡ 0 = nửa trái)
	PresetRight  = "right"  // cỡ WinRect, góc trên phải (cỡ 0 = nửa phải)
	PresetFull   = "full"   // cả vùng làm việc
)

var WinPresets = []string{PresetRect, PresetCenter, PresetLeft, PresetRight, PresetFull}

// foldName – chuỗi để so tên: chữ thường, bỏ dấu tiếng Việt, gọn khoảng trắng hai đầu.
func foldName(s string) string {
	var b strings.Builder
	for _, r := range norm.NFD.String(strings.ToLower(strings.TrimSpace(s))) {
		switch {
		case unicode.Is(unicode.Mn, r):
		case r == 'đ':
			b.WriteRune('d')
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// MatchName – got khớp want theo mode (NameMatches). want "" → khớp mọi chuỗi. Regex sai cú pháp → lỗi.
// Cùng công thức matchName (frontend/src/flow/window.ts), test chung testdata/windows.json.
func MatchName(got, want, mode string) (bool, error) {
	if want == "" {
		return true, nil
	}
	switch mode {
	case MatchRegex:
		re, err := regexp.Compile("(?i)" + want)
		if err != nil {
			return false, fmt.Errorf("mẫu regex không hợp lệ: %v", err)
		}
		return re.MatchString(got), nil
	case MatchExact:
		return foldName(got) == foldName(want), nil
	}
	return strings.Contains(foldName(got), foldName(want)), nil
}

// appNames – các tên của app để so: tên hiển thị, id (bundle id / đường dẫn exe) và tên tệp trong id (chrome.exe).
func appNames(name, id string) []string {
	out := []string{name}
	if id != "" {
		out = append(out, id)
		if i := strings.LastIndexAny(id, `\/`); i >= 0 && i < len(id)-1 {
			out = append(out, id[i+1:])
		}
	}
	return out
}

// MatchApp – app (tên, id) khớp want theo mode: so với tên hiển thị, id hoặc tên tệp chạy.
func MatchApp(name, id, want, mode string) (bool, error) {
	for _, n := range appNames(name, id) {
		ok, err := MatchName(n, want, mode)
		if err != nil || ok {
			return ok, err
		}
	}
	return false, nil
}

// MatchWindow – chỉ số cửa sổ đầu tiên trong wins (thứ tự chồng, trên cùng trước) khớp app + title; -1 = không có.
func MatchWindow(wins []WindowInfo, app, title, mode string) (int, error) {
	for i, w := range wins {
		ok, err := MatchApp(w.App, w.AppID, app, mode)
		if err != nil {
			return -1, err
		}
		if !ok {
			continue
		}
		if ok, err = MatchName(w.Title, title, mode); err != nil {
			return -1, err
		} else if ok {
			return i, nil
		}
	}
	return -1, nil
}

// WindowPreset – khung đích của setBounds: preset trong vùng làm việc work, cỡ lấy từ want (preset "" = đúng want).
// Cỡ lớn hơn vùng làm việc thì thu lại vừa. Cùng công thức windowPreset (frontend/src/flow/window.ts), test chung
// testdata/window_presets.json.
func WindowPreset(preset string, work, want Rect) Rect {
	w, h := want.W, want.H
	switch preset {
	case PresetFull:
		return work
	case PresetLeft, PresetRight:
		if w <= 0 {
			w = work.W / 2
		}
		if h <= 0 {
			h = work.H
		}
	case PresetCenter:
		if w <= 0 {
			w = work.W * 2 / 3
		}
		if h <= 0 {
			h = work.H * 2 / 3
		}
	default:
		return want
	}
	w, h = min(w, work.W), min(h, work.H)
	r := Rect{X: work.X, Y: work.Y, W: w, H: h}
	switch preset {
	case PresetRight:
		r.X = work.X + work.W - w
	case PresetCenter:
		r.X, r.Y = work.X+(work.W-w)/2, work.Y+(work.H-h)/2
	}
	return r
}
