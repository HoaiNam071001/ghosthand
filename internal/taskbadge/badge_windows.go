//go:build windows

package taskbadge

import (
	"os"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// ITaskbarList3 (COM) gọi tay qua vtable – không thêm thư viện. COM cần một luồng cố định (LockOSThread) nên mọi việc
// chạy ở một goroutine riêng; platformApply chỉ gửi yêu cầu. Cửa sổ chưa có nút trên thanh tác vụ (app mở ẩn) thì
// dấu bị bỏ – vòng lặp áp lại mỗi nhịp khi đang chạy nên hiện ngay khi nút xuất hiện.
var (
	ole32   = syscall.NewLazyDLL("ole32.dll")
	user32  = syscall.NewLazyDLL("user32.dll")
	gdi32   = syscall.NewLazyDLL("gdi32.dll")
	pCoInit = ole32.NewProc("CoInitializeEx")
	pCoNew  = ole32.NewProc("CoCreateInstance")

	pEnumWin  = user32.NewProc("EnumWindows")
	pWinPID   = user32.NewProc("GetWindowThreadProcessId")
	pVisible  = user32.NewProc("IsWindowVisible")
	pOwner    = user32.NewProc("GetWindow")
	pTitle    = user32.NewProc("GetWindowTextW")
	pMkIcon   = user32.NewProc("CreateIconIndirect")
	pDelIcon  = user32.NewProc("DestroyIcon")
	pCreateBm = gdi32.NewProc("CreateBitmap")
	pDIB      = gdi32.NewProc("CreateDIBSection")
	pDelObj   = gdi32.NewProc("DeleteObject")
)

type guid struct {
	d1 uint32
	d2 uint16
	d3 uint16
	d4 [8]byte
}

var (
	clsidTaskbarList = guid{0x56FDF344, 0xFD6D, 0x11D0, [8]byte{0x95, 0x8A, 0x00, 0x60, 0x97, 0xC9, 0xA0, 0x90}}
	iidTaskbarList3  = guid{0xEA1AFB91, 0x9E28, 0x4B86, [8]byte{0x90, 0xE9, 0x9E, 0x9F, 0x8A, 0x5E, 0xEF, 0xAF}}
)

// Chỉ số hàm trong vtable ITaskbarList3 (IUnknown 0–2, ITaskbarList 3–7, ITaskbarList2 8, ITaskbarList3 9…).
const (
	vHrInit            = 3
	vSetProgressState  = 10
	vSetOverlayIcon    = 18
	tbpfNoProgress     = 0
	tbpfIndeterminate  = 1
	windowTitle        = "Ghosthand"
	spinStep           = 120 * time.Millisecond
	gwOwner            = 4
	coinitApartment    = 2
	clsctxInprocServer = 1
)

var (
	reqCh  = make(chan Kind, 8)
	runner sync.Once
)

func platformApply(k Kind) {
	runner.Do(func() { go loop() })
	select {
	case reqCh <- k:
	default: // hàng đợi đầy (worker kẹt) – bỏ, dấu sau sẽ tới
	}
}

func loop() {
	runtime.LockOSThread()
	pCoInit.Call(0, coinitApartment)
	tb := newTaskbar()
	if tb == nil {
		for range reqCh { // không có COM – nuốt yêu cầu cho hàng đợi không đầy
		}
		return
	}
	cur, frame := None, 0
	icons := map[int]uintptr{}
	defer func() {
		for _, h := range icons {
			pDelIcon.Call(h)
		}
	}()
	tick := time.NewTicker(spinStep)
	defer tick.Stop()
	for {
		select {
		case cur = <-reqCh:
		case <-tick.C:
			if cur != Running {
				continue
			}
			frame = (frame + 1) % SpinFrames
		}
		show(tb, cur, frame, icons)
	}
}

type taskbar struct{ p unsafe.Pointer }

func newTaskbar() *taskbar {
	var p unsafe.Pointer
	hr, _, _ := pCoNew.Call(uintptr(unsafe.Pointer(&clsidTaskbarList)), 0, clsctxInprocServer, uintptr(unsafe.Pointer(&iidTaskbarList3)), uintptr(unsafe.Pointer(&p)))
	if hr != 0 || p == nil {
		return nil
	}
	t := &taskbar{p}
	if hr, _ := t.call(vHrInit); hr != 0 {
		return nil
	}
	return t
}

func (t *taskbar) call(idx int, args ...uintptr) (uintptr, error) {
	vtbl := *(*unsafe.Pointer)(t.p)
	fn := *(*uintptr)(unsafe.Add(vtbl, idx*int(unsafe.Sizeof(uintptr(0)))))
	hr, _, _ := syscall.SyscallN(fn, append([]uintptr{uintptr(t.p)}, args...)...)
	return hr, nil
}

// show áp dấu k lên cửa sổ app: icon nhỏ ở góc nút + thanh tiến độ chạy dài khi đang chạy.
func show(tb *taskbar, k Kind, frame int, icons map[int]uintptr) {
	hwnd := mainWindow()
	if hwnd == 0 {
		return
	}
	state := uintptr(tbpfNoProgress)
	if k == Running {
		state = tbpfIndeterminate
	}
	tb.call(vSetProgressState, hwnd, state)
	if k == None {
		tb.call(vSetOverlayIcon, hwnd, 0, 0)
		return
	}
	key := int(k)*100 + frame
	if k != Running {
		key = int(k) * 100
	}
	h, ok := icons[key]
	if !ok {
		h = makeIcon(renderIcon(k, frame))
		icons[key] = h
	}
	if h != 0 {
		tb.call(vSetOverlayIcon, hwnd, h, 0)
	}
}

// mainWindow – cửa sổ chính của app: cửa sổ nhìn thấy, không có chủ, của tiến trình này, tiêu đề "Ghosthand".
func mainWindow() uintptr {
	var found uintptr
	pid := uint32(os.Getpid())
	cb := syscall.NewCallback(func(h, _ uintptr) uintptr {
		var wp uint32
		pWinPID.Call(h, uintptr(unsafe.Pointer(&wp)))
		if wp != pid {
			return 1
		}
		if v, _, _ := pVisible.Call(h); v == 0 {
			return 1
		}
		if o, _, _ := pOwner.Call(h, gwOwner); o != 0 {
			return 1
		}
		var buf [64]uint16
		n, _, _ := pTitle.Call(h, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
		if syscall.UTF16ToString(buf[:n]) != windowTitle {
			return 1
		}
		found = h
		return 0
	})
	pEnumWin.Call(cb, 0)
	return found
}

type iconInfo struct {
	fIcon    uint32
	xHotspot uint32
	yHotspot uint32
	hbmMask  uintptr
	hbmColor uintptr
}

type bitmapInfoHeader struct {
	size          uint32
	width, height int32
	planes, bits  uint16
	compression   uint32
	sizeImage     uint32
	xppm, yppm    int32
	used, imp     uint32
}

// makeIcon tạo HICON 32bpp có alpha từ buffer BGRA hàng-trên-trước; lỗi → 0.
func makeIcon(bgra []byte) uintptr {
	if len(bgra) != iconSize*iconSize*4 {
		return 0
	}
	hdr := bitmapInfoHeader{size: uint32(unsafe.Sizeof(bitmapInfoHeader{})), width: iconSize, height: -iconSize, planes: 1, bits: 32}
	var bits unsafe.Pointer
	color, _, _ := pDIB.Call(0, uintptr(unsafe.Pointer(&hdr)), 0, uintptr(unsafe.Pointer(&bits)), 0, 0)
	if color == 0 || bits == nil {
		return 0
	}
	copy(unsafe.Slice((*byte)(bits), len(bgra)), bgra)
	mask, _, _ := pCreateBm.Call(iconSize, iconSize, 1, 1, 0)
	if mask == 0 {
		pDelObj.Call(color)
		return 0
	}
	ii := iconInfo{fIcon: 1, hbmMask: mask, hbmColor: color}
	h, _, _ := pMkIcon.Call(uintptr(unsafe.Pointer(&ii)))
	pDelObj.Call(color)
	pDelObj.Call(mask)
	return h
}
