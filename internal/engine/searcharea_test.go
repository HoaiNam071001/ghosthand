package engine

import (
	"context"
	"errors"
	"testing"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
)

func TestCaptureAreaDisplays(t *testing.T) {
	ds := []model.Rect{{X: 0, Y: 0, W: 1920, H: 1080}, {X: 1920, Y: 406, W: 1512, H: 982}}
	if err := device.CaptureArea(model.Rect{X: 1920, Y: 406, W: 1512, H: 982}, ds); err != nil {
		t.Errorf("cả màn phụ: %v", err)
	}
	if err := device.CaptureArea(model.Rect{X: 1800, Y: 500, W: 300, H: 200}, ds); err == nil {
		t.Error("vắt qua 2 màn phải báo lỗi")
	}
	if err := device.CaptureArea(model.Rect{X: 100, Y: 2000, W: 50, H: 50}, ds); err == nil {
		t.Error("ngoài màn phải báo lỗi")
	}
	e := &Engine{sc: model.Script{Region: &model.Rect{X: 2000, Y: 500, W: 300, H: 200}}, screen: ds[0], displays: ds}
	if got := e.searchArea(model.Step{SearchArea: "screen"}); got != ds[1] {
		t.Errorf("cả màn với vùng ở màn phụ: %v", got)
	}
}

type gameBrowser struct {
	fakeBrowser
	rect model.Rect
	err  error
}

func (g *gameBrowser) GameRect(context.Context, string) (model.Rect, error) { return g.rect, g.err }

func TestSearchAreaGame(t *testing.T) {
	region := model.Rect{X: 10, Y: 10, W: 100, H: 100}
	game := model.Rect{X: 300, Y: 200, W: 1000, H: 600}
	s := model.Step{SearchArea: model.SearchGame}

	e := &Engine{sc: model.Script{Region: &region}, browser: &gameBrowser{rect: game}}
	if err := e.resolveGameArea(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	if got := e.searchArea(s); got != game {
		t.Errorf("khung game: %v", got)
	}
	if got := e.searchArea(model.Step{}); got != region {
		t.Errorf("node khác vẫn theo vùng kịch bản: %v", got)
	}
	// node sau không dùng game: bỏ khung cũ
	if err := e.resolveGameArea(context.Background(), model.Step{}); err != nil || e.gameArea != nil {
		t.Errorf("phải xoá khung cũ: %v %v", err, e.gameArea)
	}

	e.browser = &gameBrowser{err: errors.New("thu nhỏ")}
	if err := e.resolveGameArea(context.Background(), s); err == nil {
		t.Error("Wisp báo lỗi phải thành lỗi node")
	}
	e.browser = &fakeBrowser{} // không phải Wisp
	if err := e.resolveGameArea(context.Background(), s); err == nil {
		t.Error("trình duyệt không báo được khung game phải báo lỗi nói cách sửa")
	}
}
