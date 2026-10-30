package engine

import (
	"context"
	"image"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
	"ghosthand/internal/vision"
)

func runOcrRead(t *testing.T, frames []image.Image, reads [][]vision.TextLine) model.StepResult {
	t.Helper()
	s := modeltest.Step(model.StepOcrRead, func(s *model.Step) { s.IntervalMs, s.TimeoutMs = 1, 200 })
	sc := model.Script{Loops: 1, Region: &model.Rect{X: 0, Y: 0, W: 400, H: 300}, Steps: []model.Step{s}}
	e := newEngine(&devicetest.FakeInput{}, scripttest.Linear(sc), nil)
	e.scr, e.ocr = &fakeScreen{frames: frames}, &fakeOCR{reads: reads}
	var res model.StepResult
	e.onNode = func(r model.StepResult) { res = r }
	_ = e.Run(context.Background())
	return res
}

func TestOcrReadWaitsThenReadsInOrder(t *testing.T) {
	// lần đầu vùng chưa có chữ (trang đang tải); khung khác nhau để không dùng lại kết quả OCR cũ
	res := runOcrRead(t, []image.Image{spinFrame(0), spinFrame(1)}, [][]vision.TextLine{
		{},
		{line("Tổng: 120.000 đ", 10, 80, 200, 20), line("Đơn #42", 10, 10, 100, 20), line("Đơn #42", 10, 10, 100, 20), line("  ", 0, 50, 10, 10)},
	})
	if res.Status != model.StatusSuccess {
		t.Fatalf("muốn thành công: %+v", res.Error)
	}
	if res.Output["text"] != "Đơn #42\nTổng: 120.000 đ" || res.Output["count"] != 2 {
		t.Errorf("output %v", res.Output)
	}
	if l, _ := res.Output["lines"].([]any); len(l) != 2 || l[0] != "Đơn #42" {
		t.Errorf("lines %v", res.Output["lines"])
	}
}

func TestOcrReadNoTextFails(t *testing.T) {
	res := runOcrRead(t, []image.Image{spinFrame(0)}, [][]vision.TextLine{{}})
	if res.Status != model.StatusFail || res.Error == nil || res.Error.Code != model.ErrNotFound {
		t.Fatalf("muốn not_found: %s %+v", res.Status, res.Error)
	}
}
