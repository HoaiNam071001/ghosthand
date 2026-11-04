package engine

import (
	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Click không tác dụng (bước 56 A3, chỉ lượt AI – Options.WatchClicks): chụp nhỏ màn hình trước node chuột; node chạy
// ngay sau đó lỗi mà màn hình gần như y hệt lúc trước click → error.detail.screenUnchanged = ref node chuột. AI biết
// click trượt / trang chưa phản hồi / bị lớp phủ chặn thay vì sửa node đang lỗi.

// mouseSteps – node bấm / kéo bằng chuột thật.
var mouseSteps = map[string]bool{
	model.StepClick: true, model.StepDouble: true, model.StepHold: true, model.StepDrag: true,
	model.StepClickImage: true, model.StepPath: true, model.StepWebClick: true,
}

const unchangedPct = 0.2 // % điểm ảnh đổi ≤ mức này = coi như không đổi (con trỏ chữ, đồng hồ giây)

type clickMark struct {
	ref   string
	thumb vision.Gray
}

// markClick – ảnh nhỏ trước node chuột s (nil: không theo dõi / không phải node chuột / chụp lỗi).
func (e *Engine) markClick(s model.Step) *clickMark {
	if !e.watchClicks || !mouseSteps[s.Type] {
		return nil
	}
	img, err := e.scr.Capture(e.searchArea(model.Step{SearchArea: "screen"}))
	if err != nil {
		return nil
	}
	return &clickMark{ref: s.Ref, thumb: vision.Thumb(img)}
}

// noteUnchanged – res (node ngay sau node chuột m) lỗi: màn hình lúc này so với trước click.
func (e *Engine) noteUnchanged(res *model.StepResult, m *clickMark) {
	if m == nil || res.Error == nil || res.Error.Code == model.ErrPermission || res.Error.Code == model.ErrEnd {
		return
	}
	img, err := e.scr.Capture(e.searchArea(model.Step{SearchArea: "screen"}))
	if err != nil || vision.DiffPercent(m.thumb, vision.Thumb(img)) > unchangedPct {
		return
	}
	if res.Error.Detail == nil {
		res.Error.Detail = map[string]any{}
	}
	res.Error.Detail["screenUnchanged"] = m.ref
}
