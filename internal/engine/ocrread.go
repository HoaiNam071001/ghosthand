package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Node Đọc chữ vùng (bước 28 R1): OCR mọi chữ trong vùng (như Chụp màn hình) vào text / lines theo thứ tự đọc – cho app
// không có cây phần tử (game, ảnh, remote desktop) mà Đọc chữ trang không đọc được. Chờ tới khi vùng có chữ.

func (e *Engine) ocrRead(ctx context.Context, s model.Step) (map[string]any, error) {
	area, err := e.shotArea(s)
	if err != nil {
		return nil, err
	}
	if err := device.CaptureArea(area, e.displays); err != nil {
		return nil, err
	}
	var lines []string
	_, err = e.waitLoop(ctx, s, "text", func() (bool, int, error) {
		read, err := e.readArea(area)
		if err != nil {
			return false, 0, err
		}
		lines = vision.TextLines(read, 0)
		return len(lines) > 0, 0, nil
	})
	if errors.Is(err, errTimeout) {
		return nil, &notFoundErr{msg: fmt.Sprintf("không đọc được chữ nào trong vùng sau %s", fmtSeconds(s.TimeoutMs)),
			detail: map[string]any{"kind": "text", "area": area}}
	}
	if err != nil {
		return nil, err
	}
	items := make([]any, len(lines)) // []any: nối vào forEach / đọc lines.0 trong biến (như pageText)
	for i, l := range lines {
		items[i] = l
	}
	return map[string]any{"text": strings.Join(lines, "\n"), "lines": items, "count": len(lines)}, nil
}
