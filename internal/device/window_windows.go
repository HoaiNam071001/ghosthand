package device

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"syscall"
	"unsafe"

	"ghosthand/internal/model"
)

// Cửa sổ / app trên Windows qua Win32 (bước 26 W0). Toạ độ px thật (app per-monitor DPI aware – dpi_windows.go), cùng
// hệ với điểm click; khung = khung nhìn thấy (DWMWA_EXTENDED_FRAME_BOUNDS), không gồm viền trong suốt để kéo cỡ.

var (
	procGetWindowRect       = user32.NewProc("GetWindowRect")
	procSetWindowPos        = user32.NewProc("SetWindowPos")
	procShowWindow          = user32.NewProc("ShowWindow")
	procIsWindow            = user32.NewProc("IsWindow")
	procIsZoomed            = user32.NewProc("IsZoomed")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procGetForegroundWindow = user32.NewProc("GetForegroundWindow")
	procBringWindowToTop    = user32.NewProc("BringWindowToTop")
	procAttachThreadInput   = user32.NewProc("AttachThreadInput")
	procPostMessageW        = user32.NewProc("PostMessageW")
	procMouseEvent          = user32.NewProc("mouse_event")
	procMonitorFromRect     = user32.NewProc("MonitorFromRect")
	procGetMonitorInfoW     = user32.NewProc("GetMonitorInfoW")
	procGetCurrentThreadID  = kernel32.NewProc("GetCurrentThreadId")
	procCreateSnapshot      = kernel32.NewProc("CreateToolhelp32Snapshot")
	procProcess32First      = kernel32.NewProc("Process32FirstW")
	procProcess32Next       = kernel32.NewProc("Process32NextW")
	procTerminateProcess    = kernel32.NewProc("TerminateProcess")
)

type winRect struct{ L, T, R, B int32 }

func (r winRect) rect() model.Rect {
	return model.Rect{X: int(r.L), Y: int(r.T), W: int(r.R - r.L), H: int(r.B - r.T)}
}

func (SystemWindows) List() ([]model.WindowInfo, error) {
	self := uint32(os.Getpid())
	fg, _, _ := procGetForegroundWindow.Call()
	var out []model.WindowInfo
	for _, w := range topWindows() {
		if w.pid == self {
			continue
		}
		path := processPath(w.pid)
		info := model.WindowInfo{ID: uint64(w.hwnd), Title: w.title, App: exeName(path), AppID: path, PID: int(w.pid), Minimized: w.minimized,
			Front: w.hwnd == fg}
		if !w.minimized { // cửa sổ thu nhỏ nằm ở (-32000, -32000) – khung vô nghĩa
			info.Box = frameRect(w.hwnd).rect()
		}
		out = append(out, info)
	}
	return out, nil
}

// frameRect – khung nhìn thấy của cửa sổ (Windows 10+: GetWindowRect gồm cả viền trong suốt ~7 px trái / phải / dưới).
func frameRect(h uintptr) winRect {
	var r winRect
	if hr, _, _ := procDwmGetWindowAttr.Call(h, 9 /* DWMWA_EXTENDED_FRAME_BOUNDS */, uintptr(unsafe.Pointer(&r)), 16); hr != 0 {
		procGetWindowRect.Call(h, uintptr(unsafe.Pointer(&r)))
	}
	return r
}

func liveWindow(id uint64) (uintptr, error) {
	h := uintptr(id)
	if ok, _, _ := procIsWindow.Call(h); ok == 0 {
		return 0, ErrWindowGone
	}
	return h, nil
}

// Focus: Windows chỉ cho đưa cửa sổ lên trước khi tiến trình gọi vừa nhận input → gửi một chuyển động chuột 0 px (chuột
// không động) rồi SetForegroundWindow; vẫn bị chặn thì gắn hàng đợi input với luồng của cửa sổ đang trước
// (AttachThreadInput). Không dùng mẹo nhấn Alt – Alt có thể bật thanh menu của app đang trước.
func (SystemWindows) Focus(id uint64) error {
	h, err := liveWindow(id)
	if err != nil {
		return err
	}
	if icon, _, _ := procIsIconic.Call(h); icon != 0 {
		procShowWindow.Call(h, 9) // SW_RESTORE
	}
	foreground := func() bool { fg, _, _ := procGetForegroundWindow.Call(); return fg == h }
	if foreground() {
		return nil
	}
	procMouseEvent.Call(0x1 /* MOUSEEVENTF_MOVE */, 0, 0, 0, 0)
	procSetForegroundWindow.Call(h)
	procBringWindowToTop.Call(h)
	if foreground() {
		return nil
	}
	runtime.LockOSThread() // AttachThreadInput theo luồng OS đang gọi
	defer runtime.UnlockOSThread()
	fg, _, _ := procGetForegroundWindow.Call()
	fgThread, _, _ := procGetWindowThreadPID.Call(fg, 0)
	cur, _, _ := procGetCurrentThreadID.Call()
	procAttachThreadInput.Call(cur, fgThread, 1)
	procSetForegroundWindow.Call(h)
	procBringWindowToTop.Call(h)
	procAttachThreadInput.Call(cur, fgThread, 0)
	if !foreground() {
		return errors.New("Windows không cho đưa cửa sổ lên trước (đang có cửa sổ khác giữ focus) – bấm vào app một lần rồi chạy lại")
	}
	return nil
}

// SetBounds đặt khung nhìn thấy = r: bỏ thu nhỏ / phóng to, bù viền trong suốt. Sang màn khác tỷ lệ DPI thì app tự
// đổi cỡ theo DPI mới – đặt lại lần hai cho đúng cỡ.
func (SystemWindows) SetBounds(id uint64, r model.Rect) error {
	h, err := liveWindow(id)
	if err != nil {
		return err
	}
	icon, _, _ := procIsIconic.Call(h)
	zoom, _, _ := procIsZoomed.Call(h)
	if icon != 0 || zoom != 0 {
		procShowWindow.Call(h, 9) // SW_RESTORE
	}
	for range 2 {
		var wr winRect
		procGetWindowRect.Call(h, uintptr(unsafe.Pointer(&wr)))
		fr := frameRect(h)
		l, t := r.X-int(fr.L-wr.L), r.Y-int(fr.T-wr.T)
		w, ht := r.W+int(fr.L-wr.L)+int(wr.R-fr.R), r.H+int(fr.T-wr.T)+int(wr.B-fr.B)
		const swpNoZOrderNoActivate = 0x4 | 0x10
		if ok, _, e := procSetWindowPos.Call(h, 0, uintptr(int32(l)), uintptr(int32(t)), uintptr(int32(w)), uintptr(int32(ht)), swpNoZOrderNoActivate); ok == 0 {
			return fmt.Errorf("không đặt được vị trí cửa sổ: %v", e)
		}
		if frameRect(h).rect() == r {
			break
		}
	}
	return nil
}

func (SystemWindows) SetState(id uint64, state string) error {
	h, err := liveWindow(id)
	if err != nil {
		return err
	}
	cmd := map[string]uintptr{WinMinimize: 6, WinMaximize: 3, WinRestore: 9}[state] // SW_MINIMIZE / SW_MAXIMIZE / SW_RESTORE
	if cmd == 0 {
		return fmt.Errorf("trạng thái cửa sổ lạ: %q", state)
	}
	procShowWindow.Call(h, cmd)
	return nil
}

func (SystemWindows) Close(id uint64) error {
	h, err := liveWindow(id)
	if err != nil {
		return err
	}
	procPostMessageW.Call(h, 0x10 /* WM_CLOSE */, 0, 0)
	return nil
}

func (SystemWindows) WorkArea(r model.Rect) model.Rect {
	in := winRect{int32(r.X), int32(r.Y), int32(r.X + max(r.W, 1)), int32(r.Y + max(r.H, 1))}
	mon, _, _ := procMonitorFromRect.Call(uintptr(unsafe.Pointer(&in)), 2 /* MONITOR_DEFAULTTONEAREST */)
	var mi struct {
		Size          uint32
		Monitor, Work winRect
		Flags         uint32
	}
	mi.Size = uint32(unsafe.Sizeof(mi))
	if ok, _, _ := procGetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi))); ok == 0 {
		return MainScreen()
	}
	return mi.Work.rect()
}

// processEntry – PROCESSENTRY32W.
type processEntry struct {
	Size, Usage, PID uint32
	HeapID           uintptr
	ModuleID         uint32
	Threads          uint32
	ParentPID        uint32
	PriClassBase     int32
	Flags            uint32
	ExeFile          [260]uint16
}

func (SystemApps) List() ([]model.AppInfo, error) {
	snap, _, e := procCreateSnapshot.Call(2 /* TH32CS_SNAPPROCESS */, 0)
	if snap == ^uintptr(0) {
		return nil, fmt.Errorf("không đọc được danh sách tiến trình: %v", e)
	}
	defer procCloseHandle.Call(snap)
	wins := map[uint32]int{}
	for _, w := range topWindows() {
		wins[w.pid]++
	}
	self := uint32(os.Getpid())
	var out []model.AppInfo
	pe := processEntry{}
	pe.Size = uint32(unsafe.Sizeof(pe))
	for ok, _, _ := procProcess32First.Call(snap, uintptr(unsafe.Pointer(&pe))); ok != 0; ok, _, _ = procProcess32Next.Call(snap, uintptr(unsafe.Pointer(&pe))) {
		if pe.PID == 0 || pe.PID == self {
			continue
		}
		out = append(out, model.AppInfo{Name: exeName(syscall.UTF16ToString(pe.ExeFile[:])), ID: processPath(pe.PID), PID: int(pe.PID), Windows: wins[pe.PID]})
	}
	return out, nil
}

// Quit gửi WM_CLOSE tới mọi cửa sổ của app (như bấm ×) – app có thể hỏi lưu; app không có cửa sổ thì phải buộc thoát.
func (SystemApps) Quit(pid int) error {
	n := 0
	for _, w := range topWindows() {
		if int(w.pid) == pid {
			procPostMessageW.Call(w.hwnd, 0x10, 0, 0)
			n++
		}
	}
	if n == 0 {
		return errors.New("app không có cửa sổ nào để đóng – dùng Buộc thoát")
	}
	return nil
}

func (SystemApps) ForceQuit(pid int) error {
	if pid == os.Getpid() {
		return errors.New("không buộc thoát chính ghosthand")
	}
	h, _, e := procOpenProcess.Call(0x1 /* PROCESS_TERMINATE */, 0, uintptr(pid))
	if h == 0 {
		return fmt.Errorf("không mở được tiến trình %d (đã thoát, hoặc chạy quyền admin): %v", pid, e)
	}
	defer procCloseHandle.Call(h)
	if ok, _, e := procTerminateProcess.Call(h, 1); ok == 0 {
		return fmt.Errorf("không buộc thoát được tiến trình %d: %v", pid, e)
	}
	return nil
}
