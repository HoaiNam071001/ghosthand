package engine

import (
	"strings"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

func TestWebDialogFailsAtOnce(t *testing.T) {
	alert := web.Found{Selector: -1, Tab: "file:///a.html", Dialog: &web.Dialog{Type: "alert", Message: "Hết phiên"}}
	b := &fakeBrowser{finds: []web.Found{alert}}
	in, res, err := runWeb(t, b, webNode(model.StepWebClick, func(s *model.Step) { s.TimeoutMs = 5000 }))
	if err == nil || res[0].Error.Code != model.ErrWebDialog || !strings.Contains(res[0].Error.Message, "Hết phiên") {
		t.Fatalf("muốn lỗi web_dialog kèm chữ hộp thoại: %+v", res)
	}
	if d, _ := res[0].Error.Detail["dialog"].(web.Dialog); d.Message != "Hết phiên" {
		t.Errorf("detail: %v", res[0].Error.Detail)
	}
	if b.n != 1 || len(in.Lines()) != 0 {
		t.Errorf("không chờ hết giờ, không bấm: tìm %d lần, %q", b.n, in.Lines())
	}
}

func TestWebDialogHandled(t *testing.T) {
	ok := found(0, model.Rect{X: 100, Y: 200, W: 40, H: 20})
	ok.Handled = &web.Dialog{Type: "confirm", Message: "Xoá mục này?"}
	b := &fakeBrowser{finds: []web.Found{ok}}
	_, res, err := runWeb(t, b, webNode(model.StepWebWait, func(s *model.Step) { s.WebDialog = model.WebDialogAccept }))
	if err != nil {
		t.Fatal(err)
	}
	if b.queries[0].Dialog != model.WebDialogAccept || res[0].Output["dialogText"] != "Xoá mục này?" {
		t.Errorf("query %+v, output %v", b.queries[0], res[0].Output)
	}
	// Node sau không có hộp thoại → không còn dialogText của node trước.
	b2 := &fakeBrowser{finds: []web.Found{ok, found(0, model.Rect{W: 10, H: 10})}}
	_, res, _ = runWeb(t, b2, webNode(model.StepWebWait, nil), webNode(model.StepWebWait, nil))
	if res[1].Output["dialogText"] != nil {
		t.Errorf("node 2: %v", res[1].Output)
	}
}
