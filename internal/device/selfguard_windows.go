package device

import (
	"os"
	"unsafe"
)

// Toạ độ px thật (app per-monitor DPI aware) – cùng hệ với WindowFromPoint.
var (
	procWindowFromPoint = user32.NewProc("WindowFromPoint")
	procGetAncestor     = user32.NewProc("GetAncestor")
)

const gaRoot = 2 // GA_ROOT – cửa sổ gốc của nút / ô con dưới chuột

func windowPID(h uintptr) uint32 {
	var pid uint32
	procGetWindowThreadPID.Call(h, uintptr(unsafe.Pointer(&pid)))
	return pid
}

// OwnWindowAt – cửa sổ trên cùng tại (x, y) thuộc app này (SelfGuardInput).
func OwnWindowAt(x, y int) (bool, error) {
	pt := uintptr(uint32(int32(x))) | uintptr(uint32(int32(y)))<<32 // POINT truyền theo giá trị (x64: một thanh ghi)
	h, _, _ := procWindowFromPoint.Call(pt)
	if h == 0 {
		return false, nil
	}
	if root, _, _ := procGetAncestor.Call(h, gaRoot); root != 0 {
		h = root
	}
	return windowPID(h) == uint32(os.Getpid()), nil
}

// OwnFront – app này đang ở trước (nhận phím).
func OwnFront() (bool, error) {
	h, _, _ := procGetForegroundWindow.Call()
	return h != 0 && windowPID(h) == uint32(os.Getpid()), nil
}
