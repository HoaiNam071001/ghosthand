package envcheck

import (
	"errors"
	"path/filepath"
	"testing"

	"ghosthand/internal/model"
)

func step(t string, f func(*model.Step)) model.Step {
	s := model.Step{Type: t, Enabled: true}
	if f != nil {
		f(&s)
	}
	return s
}

func kinds(ws []Warning) []string {
	out := []string{}
	for _, w := range ws {
		out = append(out, w.Kind)
	}
	return out
}

func eq(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

var smallChrome = model.WindowInfo{App: "Google Chrome", Title: "Trang chủ", Box: model.Rect{W: 800, H: 700}}

func TestCheck(t *testing.T) {
	openURL := step(model.StepOpen, func(s *model.Step) { s.Target = "https://example.com" })
	dl := step(model.StepWaitDownload, nil)
	norm := step(model.StepBrowserNorm, func(s *model.Step) { s.NormSize = true })
	saveDlg := model.WindowInfo{App: "Google Chrome", Title: "Save As", Box: model.Rect{W: 500, H: 400}}
	tests := []struct {
		name string
		sc   *model.Script
		env  Env
		want []string
	}{
		{"dò chung: tải + hộp thoại, không xét cỡ", nil, Env{Downloads: []string{"Google Chrome"}, Windows: []model.WindowInfo{saveDlg, smallChrome}},
			[]string{KindDownloadPrompt, KindDialog}},
		{"không tải tệp thì bỏ hỏi nơi lưu", &model.Script{Steps: []model.Step{openURL}}, Env{Downloads: []string{"Google Chrome"}},
			[]string{}},
		{"có chờ tải xong", &model.Script{Steps: []model.Step{openURL, dl}}, Env{Downloads: []string{"Google Chrome"}},
			[]string{KindDownloadPrompt}},
		{"cửa sổ nhỏ", &model.Script{Steps: []model.Step{openURL}}, Env{Windows: []model.WindowInfo{smallChrome}},
			[]string{KindSmallWindow}},
		{"tự đặt cỡ thì bỏ qua cỡ", &model.Script{Steps: []model.Step{norm, openURL}}, Env{Windows: []model.WindowInfo{smallChrome}},
			[]string{}},
		{"không dùng trình duyệt", &model.Script{Steps: []model.Step{step(model.StepClick, nil)}}, Env{Windows: []model.WindowInfo{smallChrome}},
			[]string{}},
		{"hộp thoại hệ thống theo app", &model.Script{}, Env{Windows: []model.WindowInfo{{App: "UserNotificationCenter"}}},
			[]string{KindDialog}},
		{"tab trùng chữ một phần không tính", &model.Script{}, Env{Windows: []model.WindowInfo{{App: "Google Chrome", Title: "Save money – Google"}}},
			[]string{}},
	}
	for _, tc := range tests {
		if got := kinds(Check(tc.sc, tc.env)); !eq(got, tc.want) {
			t.Errorf("%s: %v, muốn %v", tc.name, got, tc.want)
		}
	}
}

func TestFrontBrowserSkipsPopup(t *testing.T) {
	popup := model.WindowInfo{App: "Google Chrome", Title: "", Box: model.Rect{W: 300, H: 100}}
	big := model.WindowInfo{App: "Google Chrome", Title: "x", Box: model.Rect{W: 1400, H: 900}}
	if w, ok := frontBrowser([]model.WindowInfo{popup, big}); !ok || w.Box.W != 1400 {
		t.Fatalf("lấy nhầm %v", w)
	}
}

func TestDownloadPrompts(t *testing.T) {
	files := map[string]string{
		filepath.Join("a", "Local State"):              `{"profile":{"last_used":"Profile 1"}}`,
		filepath.Join("a", "Profile 1", "Preferences"): `{"download":{"prompt_for_download":true}}`,
		filepath.Join("a", "Default", "Preferences"):   `{"download":{"prompt_for_download":false}}`,
		filepath.Join("b", "Default", "Preferences"):   `{"download":{"prompt_for_download":true}}`,
		filepath.Join("c", "Default", "Preferences"):   `{}`,
	}
	read := func(p string) ([]byte, error) {
		if s, ok := files[p]; ok {
			return []byte(s), nil
		}
		return nil, errors.New("không có")
	}
	got := DownloadPrompts([]Profile{{"A", "a"}, {"B", "b"}, {"C", "c"}, {"D", "d"}}, read)
	if !eq(got, []string{"A", "B"}) {
		t.Fatalf("%v", got)
	}
}
