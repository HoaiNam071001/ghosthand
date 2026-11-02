//go:build !darwin && !windows

package runborder

// Linux: chưa hỗ trợ – không hiện viền.

func Show(x, y, px int, l Look) {}

func Hide() {}
