//go:build !darwin

package runborder

// Windows: layered window (WS_EX_TRANSPARENT + WDA_EXCLUDEFROMCAPTURE) làm trên máy Windows (58 D2) – tạm chưa hiện.

func Show(x, y, px int, l Look) {}

func Hide() {}
