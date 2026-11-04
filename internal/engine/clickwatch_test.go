package engine

import (
	"context"
	"image"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

// click rồi Chờ màn hình thay đổi (hết giờ → lỗi); frames: ảnh lần lượt trả cho mỗi lần chụp.
func runClickThenWait(t *testing.T, watch bool, frames []image.Image) model.StepResult {
	t.Helper()
	click := modeltest.Step(model.StepClick, func(s *model.Step) { s.DelayAfter = 0 })
	wait := modeltest.Step(model.StepWaitScreen, func(s *model.Step) {
		s.WaitMode, s.IntervalMs, s.TimeoutMs, s.DelayAfter = model.WaitChange, 1, 20, 0
	})
	sc := model.Script{Loops: 1, Region: &model.Rect{X: 0, Y: 0, W: 400, H: 300}, Steps: []model.Step{click, wait}}
	e := newEngine(&devicetest.FakeInput{}, scripttest.Linear(sc), nil)
	e.scr, e.watchClicks = &fakeScreen{frames: frames}, watch
	var res model.StepResult
	e.onNode = func(r model.StepResult) { res = r }
	_ = e.Run(context.Background())
	return res
}

func TestScreenUnchangedAfterClick(t *testing.T) {
	res := runClickThenWait(t, true, []image.Image{spinFrame(-1)})
	if res.Error == nil || res.Error.Detail["screenUnchanged"] != "n1" {
		t.Fatalf("muốn screenUnchanged = n1: %+v", res.Error)
	}
	// Click có tác dụng (ảnh trước click khác hẳn lúc lỗi) → không báo.
	res = runClickThenWait(t, true, []image.Image{spinFrame(0), spinFrame(-1)})
	if res.Error == nil || res.Error.Detail["screenUnchanged"] != nil {
		t.Fatalf("màn đã đổi sau click: %+v", res.Error)
	}
	// Không phải lượt AI → không chụp thêm.
	res = runClickThenWait(t, false, []image.Image{spinFrame(-1)})
	if res.Error == nil || res.Error.Detail["screenUnchanged"] != nil {
		t.Fatalf("WatchClicks tắt: %+v", res.Error)
	}
}
