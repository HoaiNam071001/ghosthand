package engine

import (
	"context"
	"fmt"
	"slices"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

const (
	maxShots  = 5    // ảnh lúc lỗi tối đa mỗi lần chạy (vòng thử lại qua cổng fail không chụp mãi)
	shotMaxW  = 1600 // ảnh rộng hơn thì thu nhỏ (Retina) cho file nhẹ
	maxEach   = 12   // ảnh sau mỗi node giữ tối đa (mới nhất) – vòng lặp dài không phình bộ nhớ
	eachShotW = 1280 // ảnh sau mỗi node: cỡ ảnh AI nhận (mcpsrv imgMaxW)
)

// shoot chụp màn chứa vùng kịch bản lúc node thất bại (tối đa maxShots mỗi lần chạy); lỗi chụp thì bỏ qua.
func (e *Engine) shoot(res *model.StepResult) {
	if e.shots == nil || e.failN >= maxShots || res.Error == nil || res.Error.Code == model.ErrPermission || res.Error.Code == model.ErrEnd {
		return
	}
	img, err := e.scr.Capture(e.searchArea(model.Step{SearchArea: "screen"}))
	if err != nil {
		return
	}
	e.failN++
	res.Shot = fmt.Sprintf("%d.png", e.failN)
	e.shots[res.Shot] = vision.Shrink(img, shotMaxW)
}

// shootAfter – chế độ chụp sau mỗi node (Options.ShotEach): node thành công thì chờ DelayAfter trước (màn kịp đổi sau
// click / gõ) rồi chụp; trả thời gian còn phải chờ (0 khi đã chờ ở đây). Chỉ giữ maxEach ảnh mới nhất – ảnh cũ bị bỏ
// thì StepResult.Shot của node đó trỏ tới ảnh không còn (người đọc kiểm tra có ảnh).
func (e *Engine) shootAfter(ctx context.Context, res *model.StepResult, wait int) int {
	if !e.eachShot || res.Status != model.StatusSuccess {
		return wait
	}
	if Sleep(ctx, wait) != nil {
		return 0
	}
	res.Changes = e.treeChanges()
	img, err := e.scr.Capture(e.searchArea(model.Step{SearchArea: "screen"}))
	if err != nil {
		return 0
	}
	e.eachN++ // số thứ tự ảnh trong lần chạy – tên không trùng kể cả node chạy lại / ảnh cũ đã bỏ
	name := fmt.Sprintf("each-%d-%s.png", e.eachN, res.Ref)
	res.Shot = name
	e.shots[name] = vision.Compact(vision.Shrink(img, eachShotW))
	if e.eachKeep = append(e.eachKeep, name); len(e.eachKeep) > maxEach {
		delete(e.shots, e.eachKeep[0])
		e.eachKeep = slices.Delete(e.eachKeep, 0, 1)
	}
	return 0
}
