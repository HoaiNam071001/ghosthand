package vision

import (
	"image"
	"image/color"
	"image/draw"
	"strconv"

	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"

	"ghosthand/internal/model"
)

// Mark – một khung cần đánh số trên ảnh (toạ độ chuột, cùng hệ với vùng chụp).
type Mark struct {
	N   int
	Box model.Rect
}

var markPalette = []color.RGBA{{230, 40, 40, 255}, {20, 120, 230, 255}, {20, 150, 70, 255}, {200, 90, 0, 255}, {140, 40, 200, 255}}

// DrawMarks vẽ khung + số lên bản sao của img (set of marks – bước 43 A1). area = vùng đã chụp ra img (toạ độ chuột);
// khung ngoài vùng bị bỏ. Số nằm ở góc trên-trái trong khung, nền đặc cùng màu viền để đọc được trên mọi nền.
func DrawMarks(img image.Image, area model.Rect, marks []Mark) image.Image {
	out := image.NewRGBA(img.Bounds())
	draw.Draw(out, out.Bounds(), img, img.Bounds().Min, draw.Src)
	k := ImageScale(img, area)
	for _, m := range marks {
		x0, y0 := int(float64(m.Box.X-area.X)*k), int(float64(m.Box.Y-area.Y)*k)
		x1, y1 := x0+max(int(float64(m.Box.W)*k), 2), y0+max(int(float64(m.Box.H)*k), 2)
		r := image.Rect(x0, y0, x1, y1).Intersect(out.Bounds())
		if r.Empty() {
			continue
		}
		c := markPalette[m.N%len(markPalette)]
		rectOutline(out, r, c)
		label(out, r.Min, strconv.Itoa(m.N), c)
	}
	return out
}

func rectOutline(img *image.RGBA, r image.Rectangle, c color.RGBA) {
	u := image.NewUniform(c)
	for _, e := range []image.Rectangle{
		{Min: r.Min, Max: image.Pt(r.Max.X, r.Min.Y+1)}, {Min: image.Pt(r.Min.X, r.Max.Y-1), Max: r.Max},
		{Min: r.Min, Max: image.Pt(r.Min.X+1, r.Max.Y)}, {Min: image.Pt(r.Max.X-1, r.Min.Y), Max: r.Max},
	} {
		draw.Draw(img, e.Intersect(img.Bounds()), u, image.Point{}, draw.Src)
	}
}

func label(img *image.RGBA, at image.Point, s string, bg color.RGBA) {
	face := basicfont.Face7x13
	w, h := font.MeasureString(face, s).Ceil()+4, 13
	box := image.Rect(at.X, at.Y, at.X+w, at.Y+h).Intersect(img.Bounds())
	draw.Draw(img, box, image.NewUniform(bg), image.Point{}, draw.Src)
	d := font.Drawer{Dst: img, Src: image.White, Face: face, Dot: fixed.P(at.X+2, at.Y+10)}
	d.DrawString(s)
}
