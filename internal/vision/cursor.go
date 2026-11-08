package vision

import (
	"image"
	"image/color"
	"image/draw"

	"ghosthand/internal/model"
)

var (
	cursorInk  = color.RGBA{230, 40, 40, 255}
	cursorHalo = color.RGBA{255, 255, 255, 255}
)

// DrawCursor vẽ dấu vị trí chuột (x, y – toạ độ chuột) lên bản sao của img (MCP screenshot cursor – bước 56 C3):
// chữ thập đỏ viền trắng để thấy được trên nền sáng lẫn tối. Chuột ngoài vùng → false, img giữ nguyên.
func DrawCursor(img image.Image, area model.Rect, x, y int) (image.Image, bool) {
	if x < area.X || y < area.Y || x >= area.X+area.W || y >= area.Y+area.H {
		return img, false
	}
	out := image.NewRGBA(img.Bounds())
	draw.Draw(out, out.Bounds(), img, img.Bounds().Min, draw.Src)
	k := ImageScale(img, area)
	p := image.Pt(int(float64(x-area.X)*k), int(float64(y-area.Y)*k))
	arm := max(int(10*k), 8)
	// viền trắng dày 3 px trước, nét đỏ 1 px đè lên; chừa 2 px giữa để không che đúng điểm chuột
	cross(out, p, arm, 1, 2, cursorHalo)
	cross(out, p, arm, 0, 2, cursorInk)
	return out, true
}

// cross – 4 nhánh chữ thập quanh p, dài arm, dày 2·half+1, bỏ trống gap px ở giữa.
func cross(img *image.RGBA, p image.Point, arm, half, gap int, c color.RGBA) {
	u := image.NewUniform(c)
	for _, r := range []image.Rectangle{
		image.Rect(p.X-arm, p.Y-half, p.X-gap, p.Y+half+1), image.Rect(p.X+gap+1, p.Y-half, p.X+arm+1, p.Y+half+1),
		image.Rect(p.X-half, p.Y-arm, p.X+half+1, p.Y-gap), image.Rect(p.X-half, p.Y+gap+1, p.X+half+1, p.Y+arm+1),
	} {
		draw.Draw(img, r.Intersect(img.Bounds()), u, image.Point{}, draw.Src)
	}
}
