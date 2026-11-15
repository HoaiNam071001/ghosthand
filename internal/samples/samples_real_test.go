package samples_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/samples"
	"ghosthand/internal/script"
	"ghosthand/internal/web"
	"ghosthand/internal/wisp"
)

// testProfile – profile Chrome riêng cho test (không đụng profile của app); giữ giữa các lần chạy để không bật lại.
func testProfile() string { return filepath.Join(os.TempDir(), "ghosthand-test-browser") }

// Chạy mẫu thật bằng engine (chuột thật, chụp + OCR thật, mở trình duyệt mặc định) – chỉ khi GHOSTHAND_REAL=1.
// GHOSTHAND_BROWSER=wisp: node web chạy trên Wisp đang mở (WISP_USER_DATA nếu là Wisp dev) – sân thử phục vụ qua
// http (cổng Wisp không mở file://).
// GHOSTHAND_SAMPLES=id1,id2 chọn mẫu (trống = tất cả mẫu sân thử; mẫu web thật chỉ chạy khi ghi tên). Cần quyền Accessibility + Screen Recording.
// Mẫu kết thúc thất bại có chủ đích: ket-thuc-that-bai.
func TestRealSamples(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để chạy mẫu trên máy thật")
	}
	dir := t.TempDir()
	if err := samples.WriteSandbox(dir); err != nil {
		t.Fatal(err)
	}
	list, err := samples.List()
	if err != nil {
		t.Fatal(err)
	}
	base := samples.FileURL(dir)
	if os.Getenv("GHOSTHAND_BROWSER") == "wisp" {
		srv := httptest.NewServer(http.FileServer(http.Dir(dir)))
		defer srv.Close()
		base = srv.URL
	}
	want := map[string]bool{}
	for _, id := range strings.Split(os.Getenv("GHOSTHAND_SAMPLES"), ",") {
		if id = strings.TrimSpace(id); id != "" {
			want[id] = true
		}
	}
	for _, info := range list {
		if (len(want) > 0 && !want[info.ID]) || (len(want) == 0 && info.Real) { // web thật chỉ chạy khi gọi tên
			continue
		}
		t.Run(info.ID, func(t *testing.T) { runSample(t, info.ID, base) })
	}
}

func runSample(t *testing.T, id, sandbox string) {
	sc, err := samples.Open(id, sandbox)
	if err != nil {
		t.Fatal(err)
	}
	if sc, err = script.ResolveInputs(sc, nil); err != nil {
		t.Fatal(err)
	}
	var last model.StepResult
	in := device.RobotgoInput{}
	var br web.Browser = web.NewChrome(testProfile(), in.Move)
	if os.Getenv("GHOSTHAND_BROWSER") == "wisp" {
		br = wisp.New(false)
	}
	defer br.Close()
	eng := engine.New(in, sc, engine.Options{
		Screen: device.MainScreen(), Displays: device.Displays(), Browser: br,
		AllowDanger: true, // chạy thật là người dùng chủ động (GHOSTHAND_REAL) – mẫu chỉ xoá file / thoát app nó tự mở
		OnNode: func(r model.StepResult) {
			last = r
			msg := ""
			if r.Error != nil {
				msg = r.Error.Code + ": " + r.Error.Message
			}
			t.Logf("  %s %s +%dms %-8s → %-8s %s %v", r.StartedAt.Format("05.000"), r.Ref, r.DurationMs, r.Status, r.Port, msg, r.Output)
		},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	err = eng.Run(ctx)
	expectFail := id == "ket-thuc-that-bai"
	switch {
	case err != nil && !expectFail:
		t.Errorf("lỗi: %v (node cuối %s)", err, last.Ref)
	case err == nil && expectFail:
		t.Errorf("mong đợi kết thúc thất bại")
	default:
		t.Logf("xong: %v", err)
	}
	time.Sleep(time.Second)
}
