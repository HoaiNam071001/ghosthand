package vision

import (
	"image"
	"image/color"
	"testing"

	"ghosthand/internal/model"
)

func TestDrawMarks(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 200, 100)) // vùng 100×50 chụp ở ×2
	area := model.Rect{X: 1000, Y: 500, W: 100, H: 50}
	out := DrawMarks(src, area, []Mark{{N: 1, Box: model.Rect{X: 1010, Y: 510, W: 40, H: 20}}, {N: 2, Box: model.Rect{X: 5000, Y: 5000, W: 10, H: 10}}})
	if src.At(20, 20) != (color.RGBA{}) {
		t.Fatal("ảnh gốc bị sửa")
	}
	// góc khung #1 ở (20,20) px ảnh được tô viền; khung ngoài vùng bị bỏ không lỗi
	if out.At(20, 20) == (color.RGBA{}) || out.At(79, 59) == (color.RGBA{}) {
		t.Fatal("khung #1 chưa được vẽ")
	}
	if out.At(150, 90) != (color.RGBA{}) {
		t.Fatal("khung ngoài vùng không được vẽ")
	}
}
