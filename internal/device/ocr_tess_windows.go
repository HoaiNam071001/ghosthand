package device

import (
	"errors"
	"fmt"
	"image"
	"path/filepath"
	"runtime"
	"sync"
	"syscall"
	"unsafe"

	"ghosthand/internal/vision"
)

// Đọc chữ trên Windows bằng Tesseract 5 + gói vie (bước 40 O1) – OCR Windows không có tiếng Việt. Gọi C API của
// libtesseract-5.dll qua syscall (không cgo); DLL + mô hình kèm trong exe (ocr_tessbundle_windows.go). Một TessBaseAPI
// nạp mô hình một lần, dùng lại suốt phiên – không an toàn đa luồng nên khoá.

const (
	tessScale = 2  // chữ UI 11–14 px phải phóng ×2 mới đúng dấu (40 O0)
	tessPad   = 16 // lề trắng (px ảnh đã phóng)
	tessPSM   = 11 // sparse text: chữ rải rác trên giao diện, không theo đoạn
)

var tess struct {
	sync.Mutex
	once sync.Once
	api  *tessAPI
	err  error
}

// tessRead đọc chữ bằng Tesseract; lỗi nạp (thiếu bộ kèm, DLL hỏng) trả lỗi để readText rơi về OCR Windows.
func tessRead(src image.Image) ([]vision.TextLine, error) {
	tess.Lock()
	defer tess.Unlock()
	tess.once.Do(func() { tess.api, tess.err = newTessAPI() })
	if tess.err != nil {
		return nil, tess.err
	}
	lines, err := tess.api.read(vision.PrepOCR(src, tessScale, tessPad), tessScale)
	if err != nil {
		return nil, err
	}
	big, err := tess.api.read(vision.ShrinkGray(src, vision.BigTextScale, tessPad), vision.BigTextScale)
	if err != nil {
		return lines, nil // lượt chữ to chỉ là phần thêm
	}
	return vision.MergeBigLines(lines, big), nil
}

type tessAPI struct {
	handle uintptr
	proc   map[string]uintptr
	keep   [][]byte // chuỗi C đã truyền vào DLL – giữ để GC không thu hồi
}

func newTessAPI() (*tessAPI, error) {
	dir, err := tessBundleDir()
	if err != nil {
		return nil, err
	}
	lib, err := loadLibraryAt(filepath.Join(dir, "libtesseract-5.dll"))
	if err != nil {
		return nil, err
	}
	t := &tessAPI{proc: map[string]uintptr{}}
	for _, name := range []string{"TessBaseAPICreate", "TessBaseAPIInit3", "TessBaseAPISetVariable", "TessBaseAPISetPageSegMode",
		"TessBaseAPISetImage", "TessBaseAPIRecognize", "TessBaseAPIGetTsvText", "TessDeleteText", "TessBaseAPIClear"} {
		p, err := syscall.GetProcAddress(lib, name)
		if err != nil {
			return nil, fmt.Errorf("libtesseract thiếu %s: %w", name, err)
		}
		t.proc[name] = p
	}
	t.handle = t.call("TessBaseAPICreate")
	if t.handle == 0 {
		return nil, errors.New("không dựng được Tesseract")
	}
	// Init3 nhận thư mục chứa vie.traineddata (có dấu / cuối)
	if r := t.call("TessBaseAPIInit3", t.handle, t.cstr(dir+`\`), t.cstr("vie")); r != 0 {
		return nil, fmt.Errorf("Tesseract không nạp được gói vie ở %s (mã %d)", dir, int32(r))
	}
	t.call("TessBaseAPISetPageSegMode", t.handle, tessPSM)
	t.call("TessBaseAPISetVariable", t.handle, t.cstr("user_defined_dpi"), t.cstr("144")) // ảnh chụp màn ~72–96 dpi × 2
	t.call("TessBaseAPISetVariable", t.handle, t.cstr("debug_file"), t.cstr("NUL"))       // không in cảnh báo ra stderr
	return t, nil
}

func (t *tessAPI) call(name string, args ...uintptr) uintptr {
	r, _, _ := syscall.SyscallN(t.proc[name], args...)
	return r
}

// read đọc ảnh g đã chuẩn bị ở tỷ lệ scale so với ảnh gốc (khung trả về theo px ảnh gốc).
func (t *tessAPI) read(g *image.Gray, scale float64) ([]vision.TextLine, error) {
	w, h := g.Rect.Dx(), g.Rect.Dy()
	if w <= 2*tessPad || h <= 2*tessPad {
		return nil, nil
	}
	t.call("TessBaseAPISetImage", t.handle, uintptr(unsafe.Pointer(&g.Pix[0])), uintptr(w), uintptr(h), 1, uintptr(g.Stride))
	defer t.call("TessBaseAPIClear", t.handle)
	r := t.call("TessBaseAPIRecognize", t.handle, 0)
	runtime.KeepAlive(g)
	if r != 0 {
		return nil, fmt.Errorf("Tesseract đọc lỗi (mã %d)", int32(r))
	}
	p := t.call("TessBaseAPIGetTsvText", t.handle, 0)
	if p == 0 {
		return nil, nil
	}
	defer t.call("TessDeleteText", p)
	return parseTessTSV(cString(p), scale, tessPad), nil
}

// loadLibraryAt nạp DLL theo đường dẫn tuyệt đối, DLL phụ thuộc tìm trong cùng thư mục (LOAD_WITH_ALTERED_SEARCH_PATH).
func loadLibraryAt(path string) (syscall.Handle, error) {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, err
	}
	h, _, e := kernel32.NewProc("LoadLibraryExW").Call(uintptr(unsafe.Pointer(p)), 0, 0x00000008)
	if h == 0 {
		return 0, fmt.Errorf("không nạp được %s: %w", filepath.Base(path), e)
	}
	return syscall.Handle(h), nil
}

// cstr – chuỗi C kết thúc 0, giữ trong t.keep (chỉ dùng lúc dựng – vài chuỗi).
func (t *tessAPI) cstr(s string) uintptr {
	b := append([]byte(s), 0)
	t.keep = append(t.keep, b)
	return uintptr(unsafe.Pointer(&b[0]))
}

// cString chép chuỗi C (UTF-8, kết thúc 0) do DLL cấp – qua lstrlenA + RtlMoveMemory để không đổi uintptr → unsafe.Pointer (go vet).
func cString(p uintptr) string {
	n, _, _ := kernel32.NewProc("lstrlenA").Call(p)
	if n == 0 {
		return ""
	}
	buf := make([]byte, n)
	procRtlMoveMemory.Call(uintptr(unsafe.Pointer(&buf[0])), p, n)
	return string(buf)
}
