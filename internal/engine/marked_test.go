package engine

import (
	"errors"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
)

// Node đánh dấu ghi / xoá chưa được đồng ý thì không chạy (lớp phòng thủ thứ hai sau session.AllowDanger).
func TestMarkedNodeNeedsConsent(t *testing.T) {
	in := &devicetest.FakeInput{}
	s := model.Step{ID: "s1", Ref: "n1", Type: model.StepClick, Enabled: true, Confirm: true, Points: []model.Point{{X: 5, Y: 5}}}
	e := New(in, model.Script{}, Options{})
	if _, err := e.runStep(t.Context(), s, 0); !errors.Is(err, errDangerNotAllowed) || errCode(err) != model.ErrPermission {
		t.Fatalf("chưa đồng ý: %v", err)
	}
	e = New(in, model.Script{}, Options{AllowDanger: true})
	if _, err := e.runStep(t.Context(), s, 0); err != nil {
		t.Fatalf("đã đồng ý: %v", err)
	}
}
