package engine

import (
	"reflect"
	"testing"

	"ghosthand/internal/browser/browsertest"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
)

func goStep(url string, f func(s *model.Step)) model.Step {
	return modeltest.Step(model.StepBrowserGo, func(s *model.Step) {
		s.URL, s.TimeoutMs = url, 2000
		if f != nil {
			f(s)
		}
	})
}

// Đổi URL tab đang hiện (không mở tab mới), chờ hết tải rồi trả URL / tiêu đề mới.
func TestBrowserGoWaitsLoad(t *testing.T) {
	e, f := tabEngine()
	f.LoadPolls = 3
	res, _ := e.execNode(t.Context(), goStep("example.com/a?q=1", nil), 1)
	if res.Status != model.StatusSuccess || res.Output["url"] != "https://example.com/a?q=1" || res.Output["tabId"] != int64(2) {
		t.Fatalf("%s %+v %v", res.Status, res.Error, res.Output)
	}
	if !reflect.DeepEqual(f.Calls, []string{"go https://example.com/a?q=1 2"}) || len(f.List) != 5 {
		t.Errorf("gọi %q, %d tab – không được mở tab mới", f.Calls, len(f.List))
	}
	// theo tab khớp chuỗi
	res, _ = e.execNode(t.Context(), goStep("b.vn", func(s *model.Step) { s.Tab = "youtube" }), 1)
	if res.Output["tabId"] != int64(4) {
		t.Errorf("tab khớp: %v", res.Output)
	}
}

func TestBrowserGoErrors(t *testing.T) {
	e, f := tabEngine()
	f.LoadPolls = 1 << 20 // không bao giờ tải xong
	res, _ := e.execNode(t.Context(), goStep("example.com", func(s *model.Step) { s.TimeoutMs = 300 }), 1)
	if res.Error == nil || res.Error.Code != model.ErrTimeout || res.Error.Detail["loading"] != true {
		t.Errorf("tải mãi: %+v", res.Error)
	}
	e, _ = tabEngine()
	res, _ = e.execNode(t.Context(), goStep("example.com", func(s *model.Step) { s.Tab, s.TimeoutMs = "facebook", 300 }), 1)
	if res.Error == nil || res.Error.Code != model.ErrNotFound {
		t.Errorf("không thấy tab: %+v", res.Error)
	}
	res, _ = e.execNode(t.Context(), goStep("Notepad", nil), 1)
	if res.Error == nil || res.Error.Code != model.ErrInvalidInput {
		t.Errorf("không phải URL: %+v", res.Error)
	}
}

// Thử lại khi tab đã ở URL đích và đang tải dở: chỉ chờ tiếp, không Go lại (trang chậm không bị tải từ đầu).
func TestBrowserGoRetryKeepsLoadingPage(t *testing.T) {
	e, f := tabEngine()
	f.LoadPolls = 1 << 20
	e.execNode(t.Context(), goStep("example.com", func(s *model.Step) { s.TimeoutMs = 300 }), 1)
	polls := 0
	f.OnList = func(f *browsertest.Fake) {
		if polls++; polls == 3 {
			f.SetLoading(false)
		}
	}
	res, _ := e.execNode(t.Context(), goStep("example.com", nil), 1)
	if res.Status != model.StatusSuccess {
		t.Fatalf("%s %+v", res.Status, res.Error)
	}
	if !reflect.DeepEqual(f.Calls, []string{"go https://example.com 2"}) {
		t.Errorf("gọi %q – lần thử lại không được Go lại", f.Calls)
	}
}
