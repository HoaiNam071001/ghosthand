package model

import "slices"

// Hệ điều hành chạy được của từng loại node (bước 50 D1) – chỉ liệt kê loại KHÔNG chạy ở cả hai; vắng = macOS + Windows.
// UI hiện nhãn "Chỉ macOS / Chỉ Windows" ở bảng thêm node, UI đọc qua App.StepOnlyOS. Khoá = GOOS.
// Khi làm xong bản của hệ còn lại cho một loại thì xoá dòng ở đây.
var onlyOS = map[string][]string{
	StepOSShortcut: {"darwin"},
}

// SupportedOn – loại node chạy được trên goos (runtime.GOOS).
func SupportedOn(stepType, goos string) bool {
	only, ok := onlyOS[stepType]
	return !ok || slices.Contains(only, goos)
}

// OnlyOS – loại node → các GOOS chạy được, cho loại bị giới hạn (bản sao, UI đọc qua App.StepOnlyOS).
func OnlyOS() map[string][]string {
	out := make(map[string][]string, len(onlyOS))
	for k, v := range onlyOS {
		out[k] = slices.Clone(v)
	}
	return out
}
