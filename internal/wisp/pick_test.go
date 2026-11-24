package wisp

import (
	"context"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/model"
)

func TestPickEventSubscribeAndCommands(t *testing.T) {
	br, cmds, args := testBrowser(t, func(cmd string, a map[string]any) (any, *CmdError) { return map[string]any{}, nil })
	evs := make(chan PickEvent, 1)
	br.OnPick(func(e PickEvent) { evs <- e })
	ctx := context.Background()
	if err := br.Pick(ctx, true); err != nil {
		t.Fatal(err)
	}
	select {
	case e := <-evs:
		if e.Action != "type" || e.Selector != "aria=Tìm kiếm" || e.Input != "xin {{k}}" || e.Count != 1 || len(e.Selectors) != 2 {
			t.Errorf("sự kiện pick: %+v", e)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("không nhận sự kiện pick")
	}
	if a := args("pick"); a["on"] != true {
		t.Errorf("đối số pick: %v", a)
	}
	br.PickDone(ctx, "Đã thêm n5")
	if a := args("pickDone"); a["message"] != "Đã thêm n5" {
		t.Errorf("đối số pickDone: %v (%v)", a, cmds())
	}
}

func TestPickOldWisp(t *testing.T) {
	br, _, _ := testBrowser(t, func(cmd string, a map[string]any) (any, *CmdError) {
		if cmd == "pick" {
			return nil, &CmdError{Code: "bad_args", Detail: "unknown cmd"}
		}
		return map[string]any{}, nil
	})
	if err := br.Pick(context.Background(), true); err == nil || !strings.Contains(err.Error(), "cập nhật Wisp") {
		t.Errorf("Wisp cũ: %v", err)
	}
}

func TestPickStep(t *testing.T) {
	cases := []struct {
		ev   PickEvent
		typ  string
		warn bool
	}{
		{PickEvent{Action: "click", Selector: "text=Gửi", Count: 1}, model.StepWebClick, false},
		{PickEvent{Action: "waitFor", Selector: "css=#a", Selectors: []string{"css=#a", "aria=A"}, Count: 2}, model.StepWebWait, true},
		{PickEvent{Action: "read", Selector: "css=#a", Count: 1}, model.StepWebRead, false},
		{PickEvent{Action: "type", Selector: "aria=Q", Input: "xin {{k}}", Count: 0}, model.StepWebType, true},
	}
	for _, c := range cases {
		st, warn, ok := PickStep(c.ev)
		if !ok || st.Type != c.typ || warn != c.warn || st.Selectors[0] != c.ev.Selector {
			t.Errorf("%s: %+v warn=%v ok=%v", c.ev.Action, st, warn, ok)
		}
	}
	st, _, _ := PickStep(cases[1].ev)
	if len(st.Selectors) != 2 {
		t.Errorf("bỏ trùng ứng viên: %v", st.Selectors)
	}
	st, _, _ = PickStep(cases[3].ev)
	if st.Text != "xin {{k}}" || !st.WebClear {
		t.Errorf("webType: %+v", st)
	}
	if _, _, ok := PickStep(PickEvent{Action: "copy", Selector: "x"}); ok {
		t.Error("action lạ phải bị bỏ")
	}
	if _, _, ok := PickStep(PickEvent{Action: "click"}); ok {
		t.Error("không selector phải bị bỏ")
	}
}

func TestPickReconnectsAfterUserDisconnect(t *testing.T) {
	br, _, _ := testBrowser(t, func(cmd string, a map[string]any) (any, *CmdError) { return map[string]any{}, nil })
	ctx := context.Background()
	if err := br.Pick(ctx, true); err != nil {
		t.Fatal(err)
	}
	br.conn.fail(&ErrClosed{ByUser: true}) // như bấm chip Ghosthand trong Wisp
	if err := br.Pick(ctx, true); err != nil {
		t.Errorf("bấm lại phải nối lại được: %v", err)
	}
}
