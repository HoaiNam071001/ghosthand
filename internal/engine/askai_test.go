package engine

import (
	"errors"
	"testing"

	"ghosthand/internal/ai"
	"ghosthand/internal/ai/aitest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

// code – mã lỗi của node ("" = không lỗi).
func code(e *Engine) string {
	if r := e.results[e.sc.Steps[0].ID]; r != nil && r.Error != nil {
		return r.Error.Code
	}
	return ""
}

func runAsk(t *testing.T, f *aitest.Fake, patch func(*model.Step)) (map[string]any, error) {
	out, _, err := runAskCode(t, f, patch)
	return out, err
}

func runAskCode(t *testing.T, f *aitest.Fake, patch func(*model.Step)) (map[string]any, string, error) {
	t.Helper()
	s := modeltest.Step(model.StepAskAI, func(s *model.Step) {
		s.Prompt = "xin chào"
		if patch != nil {
			patch(s)
		}
	})
	e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	e.aiNew = f.Factory
	e.rv.secrets = map[string]string{"k": "giatri-key"}
	err := e.Run(t.Context())
	if r := e.results[e.sc.Steps[0].ID]; r != nil {
		return r.Output, code(e), err
	}
	return nil, code(e), err
}

func TestAskAIText(t *testing.T) {
	f := &aitest.Fake{Reply: "  chào bạn \n"}
	out, err := runAsk(t, f, func(s *model.Step) { s.AIKind, s.AIModel, s.AIKey = "anthropic", "m1", "{{secret.k}}" })
	if err != nil || out["text"] != "chào bạn" || len(f.Asked) != 1 || f.Asked[0].Prompt != "xin chào" || f.Asked[0].JSON {
		t.Fatalf("out=%v err=%v asked=%+v", out, err, f.Asked)
	}
	if c := f.Cfgs[0]; c.Kind != "anthropic" || c.Model != "m1" || c.Key != "giatri-key" {
		t.Errorf("config sai: %+v", c)
	}
}

func TestAskAIJSONStripsFence(t *testing.T) {
	f := &aitest.Fake{Reply: "```json\n{\"can\": true, \"n\": 3}\n```"}
	out, err := runAsk(t, f, func(s *model.Step) { s.AIFormat = model.AIFormatJSON })
	j, _ := out["json"].(map[string]any)
	if err != nil || j["can"] != true || j["n"] != 3 || !f.Asked[0].JSON {
		t.Fatalf("out=%v err=%v", out, err)
	}
}

func TestAskAIBadJSONIsAIError(t *testing.T) {
	_, c, err := runAskCode(t, &aitest.Fake{Reply: "không phải json"}, func(s *model.Step) { s.AIFormat = model.AIFormatJSON })
	if err == nil || c != model.ErrAI {
		t.Fatalf("err=%v code=%s", err, c)
	}
}

func TestAskAIEmptyPromptInvalid(t *testing.T) {
	// engine.Run kiểm tra kịch bản trước khi chạy nên bị chặn từ đầu
	if _, err := runAsk(t, &aitest.Fake{}, func(s *model.Step) { s.Prompt = " " }); err == nil {
		t.Fatal("câu hỏi trống phải lỗi")
	}
}

func TestAskAIProviderRejectsIsFailEvenWithFallback(t *testing.T) {
	f := &aitest.Fake{Err: &ai.Error{Status: 401, Msg: "AI trả HTTP 401 – key sai"}}
	_, c, _ := runAskCode(t, f, func(s *model.Step) { s.AIFallback = "dự phòng" })
	if c != model.ErrAI {
		t.Fatalf("code=%s", c)
	}
}

func TestAskAIFallbackWhenUnavailable(t *testing.T) {
	// mất mạng
	f := &aitest.Fake{Err: errors.New("không gọi được AI: dial tcp")}
	out, err := runAsk(t, f, func(s *model.Step) { s.AIFallback = "dự phòng" })
	if err != nil || out["text"] != "dự phòng" || out["skipped"] != true {
		t.Fatalf("mạng: out=%v err=%v", out, err)
	}
	// không fallback → lỗi network
	if _, c, _ := runAskCode(t, f, nil); c != model.ErrNetwork {
		t.Fatalf("code=%s", c)
	}
}

func TestAskAINoKeyUsesRealResolver(t *testing.T) {
	run := func(patch func(*model.Step)) (map[string]any, string, error) {
		s := modeltest.Step(model.StepAskAI, func(s *model.Step) { s.Prompt = "q"; patch(s) })
		e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
		err := e.Run(t.Context())
		return e.results[e.sc.Steps[0].ID].Output, code(e), err
	}
	if _, c, _ := run(func(*model.Step) {}); c != model.ErrInvalidInput {
		t.Fatalf("thiếu key phải invalid_input: %s", c)
	}
	out, _, err := run(func(s *model.Step) { s.AIFallback = "{\"a\":1}"; s.AIFormat = model.AIFormatJSON })
	if err != nil || out["skipped"] != true || out["json"] == nil {
		t.Fatalf("fallback JSON: out=%v err=%v", out, err)
	}
}

func TestAskAIFileImageMissing(t *testing.T) {
	_, c, _ := runAskCode(t, &aitest.Fake{Reply: "x"}, func(s *model.Step) { s.AIImage, s.FilePath = model.AIImageFile, "/khong/co/anh.png" })
	if c != model.ErrNotFound {
		t.Fatalf("code=%s", c)
	}
}

func TestAskAIUsesDefaultProvider(t *testing.T) {
	run := func(def ai.Config, patch func(*model.Step)) ai.Config {
		f := &aitest.Fake{Reply: "ok"}
		s := modeltest.Step(model.StepAskAI, func(s *model.Step) { s.Prompt = "q"; patch(s) })
		e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
		e.aiNew, e.aiDef = f.Factory, def
		e.rv.secrets = map[string]string{"mk": "giatri-mk"}
		if err := e.Run(t.Context()); err != nil {
			t.Fatal(err)
		}
		return f.Cfgs[0]
	}
	def := ai.Config{Kind: "anthropic", Model: "m-def", Key: "{{secret.mk}}"}
	// node trống → thừa hưởng cả bốn
	if c := run(def, func(*model.Step) {}); c.Kind != "anthropic" || c.Model != "m-def" || c.Key != "giatri-mk" {
		t.Errorf("thừa hưởng sai: %+v", c)
	}
	// node đặt riêng → giữ của node
	if c := run(def, func(s *model.Step) { s.AIModel = "m-node" }); c.Model != "m-node" || c.Key != "giatri-mk" {
		t.Errorf("ghi đè sai: %+v", c)
	}
	// node chọn loại khác mặc định → không lấy model / key của mặc định
	if c := run(def, func(s *model.Step) { s.AIKind, s.AIKey = "gemini", "{{secret.mk}}" }); c.Kind != "gemini" || c.Model != "" {
		t.Errorf("khác loại vẫn thừa hưởng: %+v", c)
	}
}
