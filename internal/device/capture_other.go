//go:build !darwin

package device

import (
	"image"

	"ghosthand/internal/model"
)

func ScreenCaptureAllowed() bool { return true }

func RequestScreenCapture() bool { return true }

func screenCaptureCheck() error { return nil }

// captureClean: không có cách chụp riêng nào ngoài robotgo.
func captureClean(r model.Rect) (image.Image, bool, error) { return nil, false, nil }
