//go:build !darwin && !windows

package browser

import (
	"context"
	"errors"

	"ghosthand/internal/model"
)

// Cầu nối tạm (bước 43 B1): Windows đọc thanh tab qua UI Automation làm trên máy Windows (43 B1w) – xoá khi có
// tabs_windows.go (Linux vẫn cần bản này – đổi build tag thành !windows && !darwin).
var errUnsupported = errors.New("node Tab trình duyệt hiện chỉ chạy trên macOS – bản Windows đang làm")

func (System) Tabs(context.Context, string) ([]model.TabInfo, error) { return nil, errUnsupported }
func (System) Activate(context.Context, model.TabInfo) error         { return errUnsupported }
func (System) NewTab(context.Context, string, string) (model.TabInfo, error) {
	return model.TabInfo{}, errUnsupported
}
func (System) Close(context.Context, model.TabInfo) error       { return errUnsupported }
func (System) Nav(context.Context, model.TabInfo, string) error { return errUnsupported }
func (System) Go(context.Context, model.TabInfo, string) error  { return errUnsupported }
func (System) Frame(context.Context, model.TabInfo) (model.TabFrame, error) {
	return model.TabFrame{}, errUnsupported
}
func (System) Normalize(context.Context, model.TabInfo, model.NormalizeOpts) (bool, error) {
	return false, errUnsupported
}
