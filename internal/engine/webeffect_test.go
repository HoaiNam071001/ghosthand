package engine

import (
	"errors"
	"reflect"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/web"
)

// Click / gõ / phím web: đánh dấu tab trước thao tác, output navigated / url / popup theo Settle (56 B2).
func TestWebEffectOutput(t *testing.T) {
	eff := web.Effect{Navigated: true, URL: "https://shop.vn/don", Popup: "https://pay.vn/", Settled: true}
	nodes := []struct {
		step model.Step
		mark string
	}{
		{webNode(model.StepWebClick, nil), " true"},
		{webNode(model.StepWebType, func(s *model.Step) { s.Text, s.Tab = "a", "shop" }), "shop true"},
		{modeltest.Step(model.StepWebKey, func(s *model.Step) { s.Keys, s.Tab = []string{"enter"}, "shop" }), "shop false"},
	}
	for _, n := range nodes {
		b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 10, Y: 10, W: 20, H: 20})}, effect: eff}
		_, res, err := runWeb(t, b, n.step)
		if err != nil {
			t.Fatalf("%s: %v", n.step.Type, err)
		}
		o := res[0].Output
		if o["navigated"] != true || o["url"] != eff.URL || o["popup"] != eff.Popup {
			t.Errorf("%s: output %v", n.step.Type, o)
		}
		if !reflect.DeepEqual(b.marks, []string{n.mark}) {
			t.Errorf("%s: mark %q, muốn %q", n.step.Type, b.marks, n.mark)
		}
	}
}

// Không đánh dấu được tab (trình duyệt không trả lời) – vẫn click, chỉ không có output điều hướng.
func TestWebEffectMarkFails(t *testing.T) {
	b := &fakeBrowser{finds: []web.Found{found(0, model.Rect{X: 10, Y: 10, W: 20, H: 20})}, markErr: errors.New("mất kết nối")}
	in, res, err := runWeb(t, b, webNode(model.StepWebClick, nil))
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := res[0].Output["navigated"]; ok || len(in.Lines()) != 2 {
		t.Errorf("output %v, thao tác %q", res[0].Output, in.Lines())
	}
}
