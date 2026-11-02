package app

import (
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
)

// PreviewList – đọc thử danh sách của node Lặp qua danh sách (bước 42 G2): số phần tử, cột CSV / xlsx → khoá biến.
func (a *App) PreviewList(s model.Step) (engine.ListPreview, error) { return engine.PreviewList(s) }
