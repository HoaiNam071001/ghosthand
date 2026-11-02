//go:build !windows

package device

import (
	goruntime "runtime"

	"github.com/go-vgo/robotgo"
)

// macOS / Linux: robotgo dùng điểm (point) cho cả chuột và khung màn hình – không phải đổi.
func cursorPos() (int, int)                    { return robotgo.Location() }
func moveCursor(x, y int) error                { return robotgo.Move(x, y) }
func dragCursor(x, y int, button string) error { return robotgo.Drag(x, y, button) }

// macOS gửi sự kiện cuộn theo pixel (cuộn theo nấc con lăn ở Windows): 100 px một nấc cho gần bằng Chrome / Edge trên
// Windows. Khớp SCROLL_NOTCH_PX (types.ts).
func scrollNotch(direction string) error {
	if goruntime.GOOS == "darwin" {
		return robotgo.ScrollDir(100, direction)
	}
	return robotgo.ScrollDir(1, direction)
}
