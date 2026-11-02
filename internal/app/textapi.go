package app

import (
	"time"

	"ghosthand/internal/engine"
	"ghosthand/internal/model"
)

// TextPreview – kết quả Chạy thử node xử lý chữ: cổng ra + output như lúc chạy.
type TextPreview struct {
	Port   string         `json:"port"`
	Output map[string]any `json:"output"`
}

// PreviewText – chạy thử node xử lý chữ (bước 42 G4b) trên chữ đang nhập (chưa thay biến – inspector chỉ gọi khi không
// có biến). Không khớp / không có số → lỗi (lời báo hiện dưới nút).
func (a *App) PreviewText(s model.Step) (TextPreview, error) {
	port, out, err := engine.RunTextNode(s, time.Now())
	return TextPreview{Port: port, Output: out}, err
}
