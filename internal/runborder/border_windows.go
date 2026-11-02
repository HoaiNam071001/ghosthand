//go:build windows

package runborder

import (
	"math"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// Viền = một cửa sổ layered phủ cả màn: WS_EX_TRANSPARENT (click xuyên) + NOACTIVATE (không lấy focus) + TOOLWINDOW
// (không hiện ở thanh tác vụ / Alt+Tab) + TOPMOST; WDA_EXCLUDEFROMCAPTURE để ảnh chụp / ghi màn hình không thấy viền
// (D3). Cửa sổ sống trên một luồng riêng có message loop (cửa sổ phải tạo và bơm tin nhắn cùng luồng); Show / Hide chỉ
// ghi yêu cầu rồi đánh thức luồng đó.
var (
	user32  = syscall.NewLazyDLL("user32.dll")
	gdi32   = syscall.NewLazyDLL("gdi32.dll")
	kernel  = syscall.NewLazyDLL("kernel32.dll")
	pRegCls = user32.NewProc("RegisterClassExW")
	pCreate = user32.NewProc("CreateWindowExW")
	pDefWnd = user32.NewProc("DefWindowProcW")
	pGetMsg = user32.NewProc("GetMessageW")
	pDispat = user32.NewProc("DispatchMessageW")
	pPost   = user32.NewProc("PostMessageW")
	pShow   = user32.NewProc("ShowWindow")
	pSetPos = user32.NewProc("SetWindowPos")
	pULW    = user32.NewProc("UpdateLayeredWindow")
	pAffin  = user32.NewProc("SetWindowDisplayAffinity")
	pTimer  = user32.NewProc("SetTimer")
	pKillT  = user32.NewProc("KillTimer")
	pMonPt  = user32.NewProc("MonitorFromPoint")
	pMonInf = user32.NewProc("GetMonitorInfoW")
	pSysDPI = user32.NewProc("GetDpiForSystem")
	pCDC    = gdi32.NewProc("CreateCompatibleDC")
	pDIB    = gdi32.NewProc("CreateDIBSection")
	pSelect = gdi32.NewProc("SelectObject")
	pDelObj = gdi32.NewProc("DeleteObject")
	pModule = kernel.NewProc("GetModuleHandleW")
)

const (
	wsPopup        = 0x80000000
	wsExLayered    = 0x00080000
	wsExTransp     = 0x00000020
	wsExToolWindow = 0x00000080
	wsExNoActivate = 0x08000000
	wsExTopmost    = 0x00000008
	wmApp          = 0x8000 + 1
	wmTimer        = 0x0113
	swHide         = 0
	swShowNA       = 8
	swpNoActivate  = 0x0010
	ulwAlpha       = 2
	wdaExclude     = 0x11
	monNearest     = 2
	pulseTimerID   = 1
	pulseStepMs    = 50
	pulsePeriodMs  = 1800.0
)

var hwndTopmost = ^uintptr(0) // (HWND)-1

type req struct {
	x, y, px int
	look     Look
}

var (
	mu    sync.Mutex
	want  *req // nil = ẩn
	start sync.Once
	ready = make(chan struct{}) // đóng khi luồng cửa sổ tạo xong (hoặc thất bại)
	hwnd  uintptr
)

// Show hiện viền kiểu l, dày px, trên màn chứa điểm (x, y) (pixel thật); đang hiện thì đổi kiểu / dời màn.
func Show(x, y, px int, l Look) {
	mu.Lock()
	want = &req{x, y, px, l}
	mu.Unlock()
	wake()
}

// Hide ẩn viền (giữ cửa sổ để lần sau hiện nhanh).
func Hide() {
	mu.Lock()
	want = nil
	mu.Unlock()
	wake()
}

func wake() {
	start.Do(func() { go loop() })
	<-ready
	if hwnd != 0 {
		pPost.Call(hwnd, wmApp, 0, 0)
	}
}

type (
	point    struct{ X, Y int32 }
	rect     struct{ L, T, R, B int32 }
	wndClass struct {
		Size, Style                        uint32
		WndProc                            uintptr
		ClsExtra, WndExtra                 int32
		Instance, Icon, Cursor, Background uintptr
		MenuName, ClassName                *uint16
		IconSm                             uintptr
	}
	msg struct {
		Hwnd    uintptr
		Message uint32
		WParam  uintptr
		LParam  uintptr
		Time    uint32
		Pt      point
	}
	monitorInfo struct {
		Size          uint32
		Monitor, Work rect
		Flags         uint32
	}
	blend struct{ Op, Flags, Alpha, Format byte }
	bmi   struct {
		Size         uint32
		W, H         int32
		Planes, Bits uint16
		Compression  uint32
		ImageSize    uint32
		XPpm, YPpm   int32
		Used, Imp    uint32
	}
	size struct{ W, H int32 }
)

// Trạng thái chỉ luồng cửa sổ đụng tới.
type surface struct {
	dc, bitmap uintptr
	w, h, px   int
	look       Look
	rect       rect
	pulsing    bool
	t0         time.Time
}

var sf surface

func loop() {
	runtime.LockOSThread()
	inst, _, _ := pModule.Call(0)
	name, _ := syscall.UTF16PtrFromString("ghosthand-border")
	cls := wndClass{Size: uint32(unsafe.Sizeof(wndClass{})), WndProc: syscall.NewCallback(wndProc), Instance: inst, ClassName: name}
	pRegCls.Call(uintptr(unsafe.Pointer(&cls)))
	h, _, _ := pCreate.Call(wsExLayered|wsExTransp|wsExToolWindow|wsExNoActivate|wsExTopmost,
		uintptr(unsafe.Pointer(name)), uintptr(unsafe.Pointer(name)), wsPopup, 0, 0, 1, 1, 0, 0, inst, 0)
	if h != 0 {
		pAffin.Call(h, wdaExclude)
		hwnd = h
	}
	close(ready)
	if h == 0 {
		return
	}
	var m msg
	for {
		if r, _, _ := pGetMsg.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0); int32(r) <= 0 {
			return
		}
		pDispat.Call(uintptr(unsafe.Pointer(&m)))
	}
}

func wndProc(h, m, wp, lp uintptr) uintptr {
	switch m {
	case wmApp:
		apply(h)
		return 0
	case wmTimer:
		if sf.pulsing {
			present(h, pulseAlpha())
		}
		return 0
	}
	r, _, _ := pDefWnd.Call(h, m, wp, lp)
	return r
}

// apply làm cửa sổ khớp yêu cầu mới nhất.
func apply(h uintptr) {
	mu.Lock()
	r := want
	mu.Unlock()
	if r == nil {
		pKillT.Call(h, pulseTimerID)
		sf.pulsing = false
		pShow.Call(h, swHide)
		return
	}
	var mon monitorInfo
	mon.Size = uint32(unsafe.Sizeof(mon))
	hm, _, _ := pMonPt.Call(uintptr(uint32(int32(r.x)))|uintptr(uint32(int32(r.y)))<<32, monNearest)
	if ok, _, _ := pMonInf.Call(hm, uintptr(unsafe.Pointer(&mon))); ok == 0 {
		return
	}
	px := r.px * dpi() / 96
	w, ht := int(mon.Monitor.R-mon.Monitor.L), int(mon.Monitor.B-mon.Monitor.T)
	if w != sf.w || ht != sf.h || px != sf.px || r.look.R != sf.look.R || r.look.G != sf.look.G || r.look.B != sf.look.B || sf.bitmap == 0 {
		if !paint(w, ht, px, r.look) {
			return
		}
	}
	sf.look, sf.rect = r.look, mon.Monitor
	pSetPos.Call(h, hwndTopmost, uintptr(mon.Monitor.L), uintptr(mon.Monitor.T), uintptr(w), uintptr(ht), swpNoActivate)
	if r.look.Pulse && !sf.pulsing {
		sf.t0 = time.Now()
		pTimer.Call(h, pulseTimerID, pulseStepMs, 0)
	} else if !r.look.Pulse {
		pKillT.Call(h, pulseTimerID)
	}
	sf.pulsing = r.look.Pulse
	alpha := r.look.Alpha
	if sf.pulsing {
		alpha = pulseAlpha()
	}
	present(h, alpha)
	pShow.Call(h, swShowNA)
}

func dpi() int {
	if d, _, _ := pSysDPI.Call(); d != 0 {
		return int(d)
	}
	return 96
}

// paint dựng lại bitmap viền (dải px quanh mép, màu tiền nhân alpha) – chỉ khi kích thước / dày / màu đổi.
func paint(w, h, px int, l Look) bool {
	if sf.bitmap != 0 {
		pDelObj.Call(sf.bitmap)
		sf.bitmap = 0
	}
	if sf.dc == 0 {
		sf.dc, _, _ = pCDC.Call(0)
	}
	hdr := bmi{Size: 40, W: int32(w), H: -int32(h), Planes: 1, Bits: 32}
	var bits unsafe.Pointer
	bm, _, _ := pDIB.Call(sf.dc, uintptr(unsafe.Pointer(&hdr)), 0, uintptr(unsafe.Pointer(&bits)), 0, 0)
	if bm == 0 || bits == nil {
		return false
	}
	pSelect.Call(sf.dc, bm)
	px = max(1, min(px, min(w, h)/2))
	buf := unsafe.Slice((*uint32)(bits), w*h)
	clear(buf)
	c := uint32(0xFF)<<24 | uint32(l.R)<<16 | uint32(l.G)<<8 | uint32(l.B)
	for y := 0; y < h; y++ {
		row := buf[y*w : (y+1)*w]
		if y < px || y >= h-px {
			for x := range row {
				row[x] = c
			}
			continue
		}
		for x := 0; x < px; x++ {
			row[x], row[w-1-x] = c, c
		}
	}
	sf.bitmap, sf.w, sf.h, sf.px = bm, w, h, px
	return true
}

// pulseAlpha – sáng mờ theo nhịp 1,8 s (1.0 → 0.45 của Alpha), cùng nhịp macOS.
func pulseAlpha() float64 {
	t := float64(time.Since(sf.t0).Milliseconds()) / pulsePeriodMs
	k := 0.725 + 0.275*math.Cos(2*math.Pi*t)
	return sf.look.Alpha * k
}

// present đẩy bitmap lên cửa sổ với độ mờ chung alpha (per-pixel alpha 255 trong dải viền).
func present(h uintptr, alpha float64) {
	pos := point{sf.rect.L, sf.rect.T}
	sz := size{int32(sf.w), int32(sf.h)}
	src := point{}
	bf := blend{Alpha: byte(math.Round(max(0, min(alpha, 1)) * 255)), Format: 1}
	pULW.Call(h, 0, uintptr(unsafe.Pointer(&pos)), uintptr(unsafe.Pointer(&sz)), sf.dc, uintptr(unsafe.Pointer(&src)), 0,
		uintptr(unsafe.Pointer(&bf)), ulwAlpha)
}
