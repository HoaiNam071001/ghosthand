package engine

import (
	"context"
	"reflect"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

func runAskUser(t *testing.T, ask Asker, mod func(*model.Step)) (model.StepResult, *AskQuestion) {
	t.Helper()
	s := modeltest.Step(model.StepAskUser, func(s *model.Step) {
		s.Message, s.AskItems, s.TimeoutMs, s.DelayAfter = "Gửi 2 email?", "a@x.vn\n\n b@x.vn ", 0, 0
		if mod != nil {
			mod(s)
		}
	})
	e := newEngine(&devicetest.FakeInput{}, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	var asked *AskQuestion
	if ask != nil {
		e.ask = func(ctx context.Context, q AskQuestion) (AskAnswer, error) {
			e.mu.Lock()
			asked = e.prog.Ask // thanh mini / wait_run thấy câu hỏi trong lúc chờ
			e.mu.Unlock()
			return ask(ctx, q)
		}
	}
	var res model.StepResult
	e.onNode = func(r model.StepResult) { res = r }
	_ = e.Run(context.Background())
	return res, asked
}

func TestAskUserApprove(t *testing.T) {
	res, asked := runAskUser(t, func(_ context.Context, q AskQuestion) (AskAnswer, error) {
		if !reflect.DeepEqual(q.Items, []string{"a@x.vn", "b@x.vn"}) || q.Message != "Gửi 2 email?" || !q.Input {
			t.Errorf("câu hỏi: %+v", q)
		}
		return AskAnswer{Answer: model.PortApprove, Text: "123456"}, nil
	}, func(s *model.Step) { s.AskInput = true })
	if res.Port != model.PortApprove || res.Output["text"] != "123456" || res.Output["answer"] != model.PortApprove {
		t.Fatalf("kết quả %+v", res)
	}
	if asked == nil || asked.Ref != "n1" {
		t.Errorf("Progress.Ask lúc chờ: %+v", asked)
	}
}

func TestAskUserDenyTimeoutNoHuman(t *testing.T) {
	res, _ := runAskUser(t, func(context.Context, AskQuestion) (AskAnswer, error) { return AskAnswer{Answer: model.PortDeny}, nil }, nil)
	if res.Port != model.PortDeny {
		t.Errorf("từ chối: %+v", res)
	}
	wait := func(ctx context.Context, _ AskQuestion) (AskAnswer, error) { <-ctx.Done(); return AskAnswer{}, ctx.Err() }
	res, _ = runAskUser(t, wait, func(s *model.Step) { s.TimeoutMs = 30 })
	if res.Port != model.PortTimeout || res.Status != model.StatusSuccess {
		t.Errorf("hết giờ: %+v", res)
	}
	res, _ = runAskUser(t, nil, nil) // hẹn giờ / CLI: không có người
	if res.Port != model.PortTimeout {
		t.Errorf("không có người: %+v", res)
	}
}

func TestAskUserStop(t *testing.T) {
	s := modeltest.Step(model.StepAskUser, func(s *model.Step) { s.Message, s.TimeoutMs = "?", 0 })
	e := newEngine(&devicetest.FakeInput{}, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	ctx, cancel := context.WithCancel(context.Background())
	e.ask = func(ctx context.Context, _ AskQuestion) (AskAnswer, error) { cancel(); <-ctx.Done(); return AskAnswer{}, ctx.Err() }
	if err := e.Run(ctx); err == nil {
		t.Fatal("Dừng giữa lúc hỏi phải dừng lần chạy")
	}
}
