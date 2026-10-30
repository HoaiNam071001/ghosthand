package device

import (
	"math"
	"strconv"
	"strings"
	"unicode/utf16"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// tessMinConf – bỏ từ độ tin cậy thấp hơn: rác từ góc bo của nút (“2À”, “—N”) đo ở 40 O1 có conf 18–66, chữ thật ≥ 88.
const tessMinConf = 60

// parseTessTSV đổi kết quả TSV của Tesseract (TessBaseAPIGetTsvText) thành dòng chữ có khung từng từ. Cột:
// level page block par line word left top width height conf text; chỉ dòng level 5 (từ) mang chữ. Khung chia scale
// để về px ảnh gốc sau khi bỏ lề pad (scale < 1: ảnh đã thu nhỏ – lượt chữ to) (ảnh đưa Tesseract đã phóng + thêm lề – vision.PrepOCR).
func parseTessTSV(tsv string, scale float64, pad int) []vision.TextLine {
	type key struct{ block, par, line int }
	var lines []vision.TextLine
	idx := map[key]int{}
	for _, row := range strings.Split(tsv, "\n") {
		f := strings.Split(strings.TrimRight(row, "\r"), "\t")
		if len(f) < 12 || f[0] != "5" {
			continue
		}
		text := strings.TrimSpace(f[11])
		if conf, _ := strconv.ParseFloat(f[10], 64); text == "" || conf < tessMinConf {
			continue
		}
		n := make([]int, 10)
		for i := range n {
			n[i], _ = strconv.Atoi(f[i])
			if i == 6 || i == 7 {
				n[i] = max(n[i]-pad, 0)
			}
		}
		k := key{n[2], n[3], n[4]}
		i, ok := idx[k]
		if !ok {
			i = len(lines)
			idx[k] = i
			lines = append(lines, vision.TextLine{})
		}
		l := &lines[i]
		pos := len(utf16.Encode([]rune(l.Text)))
		if l.Text != "" {
			l.Text += " "
			pos++
		}
		div := func(v int) float64 { return float64(v) / scale }
		x, y := int(div(n[6])), int(div(n[7]))
		box := model.Rect{X: x, Y: y, W: max(int(math.Ceil(div(n[6]+n[8])))-x, 1), H: max(int(math.Ceil(div(n[7]+n[9])))-y, 1)}
		l.Words = append(l.Words, vision.TextWord{Start: pos, Len: len(utf16.Encode([]rune(text))), Box: box})
		l.Box = vision.Union(l.Box, box)
		l.Text += text
	}
	return lines
}
