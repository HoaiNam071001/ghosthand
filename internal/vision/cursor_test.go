package vision

import (
	"image"
	"image/color"
	"testing"

	"ghosthand/internal/model"
)

func TestDrawCursor(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 200, 100)) // vùng 100×50 chụp ở ×2
	area := model.Rect{X: 1000, Y: 500, W: 100, H: 50}
	out, in := DrawCursor(src, area, 1050, 525) // → (100, 50) px ảnh
	if !in {
		t.Fatal("chuột trong vùng mà báo ngoài")
	}
	if src.At(110, 50) != (color.RGBA{}) {
		t.Fatal("ảnh gốc bị sửa")
	}
	if out.At(110, 50) != cursorInk || out.At(100, 40) != cursorInk {
		t.Fatal("chưa vẽ nhánh chữ thập")
	}
	if out.At(100, 50) != (color.RGBA{}) {
		t.Fatal("che mất đúng điểm chuột")
	}
	if _, in := DrawCursor(src, area, 999, 525); in {
		t.Fatal("chuột ngoài vùng mà vẫn vẽ")
	}
}
