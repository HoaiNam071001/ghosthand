package engine

import (
	"fmt"
	"testing"

	"ghosthand/internal/browser"
	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/perm"
)

func TestPermDetail(t *testing.T) {
	for _, c := range []struct {
		err  error
		want perm.ID
	}{
		{device.ErrNoPermission, perm.ScreenRecording},
		{fmt.Errorf("đọc: %w", device.ErrNoAccessibility), perm.Accessibility},
		{device.ErrNoFinder, perm.AutoFinder},
		{browser.ErrNoAutomation, perm.AutoChrome},
	} {
		if errCode(c.err) != model.ErrPermission {
			t.Errorf("%v: mã %s, muốn permission", c.err, errCode(c.err))
		}
		if d := errDetail(c.err); d["permission"] != string(c.want) {
			t.Errorf("%v: detail %v, muốn %s", c.err, d, c.want)
		}
	}
	if d := errDetail(errDangerNotAllowed); d != nil {
		t.Errorf("lỗi nguy hiểm không gắn quyền OS: %v", d)
	}
}
