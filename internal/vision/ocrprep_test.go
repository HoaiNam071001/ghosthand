package vision

import (
	"image"
	"image/color"
	"image/draw"
	"testing"

	"ghosthand/internal/model"
)

// Chữ đen trên nền trắng và chữ trắng trên nút xanh đều ra đen trên trắng, ảnh phóng đúng hệ số.
func TestPrepOCR(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 120, 40))
	fill := func(r image.Rectangle, c color.Color) {
		draw.Draw(img, r, image.NewUniform(c), image.Point{}, draw.Src)
	}
	fill(img.Rect, color.White)
	fill(image.Rect(60, 0, 120, 40), color.RGBA{37, 99, 235, 255}) // nút xanh
	fill(image.Rect(20, 10, 23, 30), color.Black)                  // nét chữ tối
	fill(image.Rect(80, 10, 83, 30), color.White)                  // nét chữ trắng trên nút

	g := PrepOCR(img, 2, 5)
	if g.Rect.Dx() != 250 || g.Rect.Dy() != 90 {
		t.Fatalf("cỡ %v", g.Rect)
	}
	at := func(x, y int) uint8 { return g.GrayAt(x*2+1+5, y*2+1+5).Y }
	for _, p := range []image.Point{{21, 20}, {81, 20}} {
		if v := at(p.X, p.Y); v > 60 {
			t.Errorf("nét chữ ở %v phải đen, được %d", p, v)
		}
	}
	for _, p := range []image.Point{{5, 5}, {40, 20}, {70, 5}, {100, 30}} {
		if v := at(p.X, p.Y); v < 200 {
			t.Errorf("nền ở %v phải trắng, được %d", p, v)
		}
	}
}

func TestShrinkGray(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 100, 40))
	draw.Draw(img, img.Rect, image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, 50, 40), image.NewUniform(color.Black), image.Point{}, draw.Src) // nét dày giữ nguyên đen
	g := ShrinkGray(img, 0.5, 3)
	if g.Rect.Dx() != 56 || g.Rect.Dy() != 26 {
		t.Fatalf("cỡ %v", g.Rect)
	}
	if v := g.GrayAt(3+10, 3+10).Y; v > 10 {
		t.Errorf("lòng nét phải đen, được %d", v)
	}
	if v := g.GrayAt(0, 0).Y; v != 255 {
		t.Errorf("lề phải trắng, được %d", v)
	}
}

func TestMergeBigLines(t *testing.T) {
	ln := func(s string, x, y, w, h int) TextLine {
		return TextLine{Text: s, Box: model.Rect{X: x, Y: y, W: w, H: h}}
	}
	base := []TextLine{ln("Đơn #42", 10, 10, 100, 20), ln("N", 30, 100, 10, 12), ln("1", 60, 110, 8, 12)}
	big := []TextLine{ln("ĐANG CHỜ", 20, 95, 300, 60), ln("Đơn #42", 10, 10, 100, 22), ln("nhỏ", 400, 400, 50, 20), ln("TO", 400, 500, 80, 40)}
	got := TextLines(MergeBigLines(base, big), 0)
	want := []string{"Đơn #42", "ĐANG CHỜ", "TO"} // dòng nhỏ của lượt chữ to bỏ
	if len(got) != len(want) {
		t.Fatalf("%q", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("%q, muốn %q", got, want)
		}
	}
}
