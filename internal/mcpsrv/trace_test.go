package mcpsrv

import (
	"image"
	"maps"
	"slices"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
)

// Ảnh gửi kèm: mặc định ảnh lỗi + ảnh sau node mới nhất; AI xin theo tên thì đúng ảnh đó; ảnh đã bỏ không báo tên.
func TestShotImages(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 40, 20))
	tr := session.Trace{Shots: map[string]image.Image{}}
	for _, r := range []model.StepResult{
		{NodeID: "a", Ref: "n1", Status: model.StatusSuccess, Shot: "each-1-n1.png"}, // ảnh đã bị bỏ (giữ 12 ảnh mới nhất)
		{NodeID: "b", Ref: "n2", Status: model.StatusSuccess, Shot: "each-2-n2.png"},
		{NodeID: "c", Ref: "n3", Status: model.StatusSuccess, Shot: "each-3-n3.png"},
		{NodeID: "d", Ref: "n4", Status: model.StatusSuccess, Shot: "each-4-n4.png"},
		{NodeID: "e", Ref: "n5", Status: model.StatusSuccess, Shot: "each-5-n5.png"},
		{NodeID: "f", Ref: "n6", Status: model.StatusFail, Shot: "1.png"},
	} {
		tr.Results = append(tr.Results, r)
		if r.Ref != "n1" {
			tr.Shots[r.Shot] = img
		}
	}
	sent := func(w map[string]int) []string { return slices.Sorted(maps.Keys(w)) }

	_, w := shotImages(tr, nil)
	if got := sent(w); !slices.Equal(got, []string{"1.png", "each-3-n3.png", "each-4-n4.png", "each-5-n5.png"}) {
		t.Errorf("mặc định gửi %v", got)
	}
	// theo thứ tự chạy, chú thích trước mỗi ảnh
	c, _ := shotImages(tr, nil)
	if len(c) != 8 || c[0].(*mcp.TextContent).Text != "Ảnh each-3-n3.png – node #3 n3 sau node (thành công)" ||
		c[6].(*mcp.TextContent).Text != "Ảnh 1.png – node #6 n6 lúc node lỗi" {
		t.Errorf("thứ tự / chú thích ảnh: %d phần, đầu %v", len(c), c[0])
	}
	_, w = shotImages(tr, []string{"each-2-n2.png", "each-1-n1.png", "khong-co.png"})
	if got := sent(w); !slices.Equal(got, []string{"each-2-n2.png"}) {
		t.Errorf("xin theo tên gửi %v", got)
	}
	v := traceView(tr, model.Script{}, nil)["nodes"].([]nodeView)
	if v[0].Shot != "" || v[1].Shot != "each-2-n2.png" {
		t.Errorf("tên ảnh trong vết: %q %q", v[0].Shot, v[1].Shot)
	}
	if _, err := shotEach("all"); err == nil {
		t.Error("shots sai phải lỗi")
	}
}

// current.paused (57 B4): ai dừng + còn bao giây tự chạy tiếp (đụng chuột); bấm Tạm dừng thì không có resumeInS.
func TestPausedInfo(t *testing.T) {
	now := time.UnixMilli(1_000_000)
	got := pausedInfo(engine.Progress{Paused: true, PausedBy: engine.PausedTouch, ResumeAt: now.UnixMilli() + 3_200}, now)
	if got["by"] != "touch" || got["resumeInS"] != 4 {
		t.Errorf("đụng chuột: %v", got)
	}
	if got := pausedInfo(engine.Progress{Paused: true}, now); got["by"] != "button" || got["resumeInS"] != nil {
		t.Errorf("bấm Tạm dừng: %v", got)
	}
	if got := pausedInfo(engine.Progress{Paused: true, Break: "step"}, now); got["by"] != "debug" {
		t.Errorf("debug: %v", got)
	}
}
