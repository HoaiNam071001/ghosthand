package engine

import (
	"context"
	"image"
	"strings"
	"testing"

	"ghosthand/internal/ai/aitest"
	"ghosthand/internal/model"
	"ghosthand/internal/script/scripttest"
	"ghosthand/internal/vision/visiontest"
)

func TestParseAIBox(t *testing.T) {
	ok := func(s string) aiBox {
		b, err := parseAIBox(s, 400, 300)
		if err != nil {
			t.Fatalf("%q: %v", s, err)
		}
		return b
	}
	if b := ok("```json\n{\"found\":true,\"x\":10,\"y\":20,\"w\":30,\"h\":40}\n```"); !b.Found || b.X != 10 || b.H != 40 {
		t.Errorf("hàng rào: %+v", b)
	}
	for _, s := range []string{`{"found":false}`, `{"found":true,"x":390,"y":0,"w":50,"h":10}`, `{"found":true,"x":0,"y":0,"w":0,"h":5}`, `{"found":true,"x":-1,"y":0,"w":5,"h":5}`} {
		if b := ok(s); b.Found {
			t.Errorf("%s: phải coi là không thấy", s)
		}
	}
	if _, err := parseAIBox("không phải json", 400, 300); err == nil {
		t.Error("chữ lạ phải lỗi ai_error")
	}
}

func aiFindEngine(f *aitest.Fake, scale int) (*Engine, model.Rect) {
	img, _ := screenWithButton(scale, true)
	e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1}), nil)
	e.scr = &fakeScreen{frames: []image.Image{img}}
	e.aiNew = f.Factory
	return e, model.Rect{X: 100, Y: 50, W: 400, H: 300}
}

func TestAILocateMapsToScreen(t *testing.T) {
	// ảnh chụp 800×600 (Retina 2x) cho vùng 400×300 → gửi AI nguyên cỡ (≤ 1280); khung (500,240) 120×40 px ảnh = (250,120) 60×20 điểm
	f := &aitest.Fake{Reply: `{"found":true,"x":500,"y":240,"w":120,"h":40}`}
	e, area := aiFindEngine(f, 2)
	box, ok, err := e.aiLocate(context.Background(), model.Step{FindText: "nút Gửi"}, area)
	if err != nil || !ok || box != (model.Rect{X: 350, Y: 170, W: 60, H: 20}) {
		t.Fatalf("box=%+v ok=%v err=%v", box, ok, err)
	}
	if len(f.Asked) != 1 || len(f.Asked[0].Images) != 1 || !f.Asked[0].JSON || !strings.Contains(f.Asked[0].Prompt, "nút Gửi") || !strings.Contains(f.Asked[0].Prompt, "800×600") {
		t.Errorf("câu hỏi gửi AI sai: %+v", f.Asked)
	}
}

func TestAILocateNotFoundAndErrors(t *testing.T) {
	e, area := aiFindEngine(&aitest.Fake{Reply: `{"found":false}`}, 2)
	if _, ok, err := e.aiLocate(context.Background(), model.Step{FindText: "x"}, area); ok || err != nil {
		t.Fatalf("không thấy: ok=%v err=%v", ok, err)
	}
	if _, _, err := e.aiLocate(context.Background(), model.Step{}, area); err == nil || errCode(err) != model.ErrInvalidInput {
		t.Errorf("thiếu mô tả: %v", err)
	}
	e, area = aiFindEngine(&aitest.Fake{Reply: "xin chào"}, 2)
	if _, _, err := e.aiLocate(context.Background(), model.Step{FindText: "x"}, area); errCode(err) != model.ErrAI {
		t.Errorf("trả sai dạng phải ai_error: %v", err)
	}
}

func TestFindAIStepAndOnce(t *testing.T) {
	f := &aitest.Fake{Reply: `{"found":true,"x":500,"y":240,"w":120,"h":40}`}
	e, area := aiFindEngine(f, 2)
	s := model.Step{FindText: "nút Gửi", TimeoutMs: 5000, IntervalMs: 100}
	h, err := e.findAIStep(context.Background(), s, area)
	if err != nil || h.Box.X != 350 || h.Score != 100 {
		t.Fatalf("hit=%+v err=%v", h, err)
	}
	r, err := e.findAIOnce(context.Background(), s, area)
	if err != nil || !r.Found || r.X != 350 || r.W != 60 {
		t.Fatalf("once=%+v err=%v", r, err)
	}
}

func TestScaleForAI(t *testing.T) {
	big := visiontest.Scene(2560, 1440, 3)
	if b := scaleForAI(big).Bounds(); b.Dx() != 1280 || b.Dy() != 720 {
		t.Errorf("cỡ sau thu nhỏ %v", b)
	}
	small := visiontest.Scene(800, 600, 3)
	if scaleForAI(small) != image.Image(small) {
		t.Error("ảnh nhỏ phải giữ nguyên")
	}
}
