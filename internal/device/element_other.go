//go:build !darwin && !windows

package device

import (
	"errors"

	"ghosthand/internal/element"
)

// readElements: Windows (UI Automation) làm ở bước 37 E5 khi có máy Windows.
func readElements(string) ([]element.Node, error) { return nil, errNoElements }

func scrollTo(string, int) error { return errNoElements }

func actAt(string, int, string, string) error { return errNoElements }

func docTexts(string, []int, bool) ([]string, error) { return nil, errNoElements }

func docTexts(string, []int, bool) ([]string, error) { return nil, errNoElements }

var errNoElements = errors.New("tìm phần tử màn hình hiện chỉ có trên macOS")
