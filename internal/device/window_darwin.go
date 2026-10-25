//go:build darwin

package device

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework ApplicationServices -framework AppKit -framework CoreGraphics -framework Foundation
#include <ApplicationServices/ApplicationServices.h>
#import <AppKit/AppKit.h>
#include <stdlib.h>
#include <string.h>

// Không có trong header công khai nhưng ổn định từ macOS 10.x và mọi công cụ điều khiển cửa sổ đều dùng:
// cầu nối từ phần tử AX sang CGWindowID (id cửa sổ trong CGWindowList).
extern AXError _AXUIElementGetWindow(AXUIElementRef element, CGWindowID *identifier);

typedef struct { unsigned int id; int pid; char *title, *app, *appId; double x, y, w, h; int minimized; } win_info;
typedef struct { int pid; char *name, *id; int windows; } win_app;

enum { WIN_FOCUS, WIN_BOUNDS, WIN_MINIMIZE, WIN_RESTORE, WIN_CLOSE };
enum { WIN_OK = 0, WIN_GONE = 1, WIN_NO_AX = 2, WIN_FAIL = 3 };

static int win_trusted(void) { return AXIsProcessTrusted(); }

static char *win_dup(NSString *s) { return strdup(s ? s.UTF8String : ""); }

// Phần tử AX (đã retain) của cửa sổ id trong app pid; NULL = không thấy.
static AXUIElementRef win_ax_window(pid_t pid, CGWindowID id) {
	AXUIElementRef app = AXUIElementCreateApplication(pid);
	AXUIElementSetMessagingTimeout(app, 1.0);
	CFArrayRef wins = NULL;
	AXUIElementCopyAttributeValue(app, kAXWindowsAttribute, (CFTypeRef *)&wins);
	AXUIElementRef found = NULL;
	if (wins) {
		for (CFIndex i = 0; i < CFArrayGetCount(wins) && !found; i++) {
			AXUIElementRef w = (AXUIElementRef)CFArrayGetValueAtIndex(wins, i);
			CGWindowID wid = 0;
			if (_AXUIElementGetWindow(w, &wid) == kAXErrorSuccess && wid == id) found = (AXUIElementRef)CFRetain(w);
		}
		CFRelease(wins);
	}
	CFRelease(app);
	return found;
}

static int win_ax_minimized(AXUIElementRef w) {
	CFTypeRef v = NULL;
	int r = 0;
	if (AXUIElementCopyAttributeValue(w, kAXMinimizedAttribute, &v) == kAXErrorSuccess && v) {
		r = v == kCFBooleanTrue;
		CFRelease(v);
	}
	return r;
}

static char *win_ax_title(AXUIElementRef w) {
	CFTypeRef v = NULL;
	char *out = strdup("");
	if (AXUIElementCopyAttributeValue(w, kAXTitleAttribute, &v) == kAXErrorSuccess && v) {
		if (CFGetTypeID(v) == CFStringGetTypeID()) { free(out); out = win_dup((__bridge NSString *)v); }
		CFRelease(v);
	}
	return out;
}

// Mọi cửa sổ thường (layer 0), trên cùng trước. Cửa sổ đang hiện: khung từ CGWindowList, tên từ CG (cần Screen Recording)
// hoặc AX (chỉ cần Accessibility). Cửa sổ không hiện chỉ lấy khi AX báo đang thu nhỏ – bỏ cửa sổ ở Space khác / cửa sổ phụ ẩn.
static int win_list(win_info **out, int *n) {
	int trusted = win_trusted();
	CFArrayRef all = CGWindowListCopyWindowInfo(kCGWindowListOptionAll | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
	if (!all) { *out = NULL; *n = 0; return 0; }
	NSArray *list = (__bridge_transfer NSArray *)all;
	win_info *res = calloc(list.count + 1, sizeof(win_info));
	int k = 0;
	for (NSDictionary *d in list) {
		if ([d[(id)kCGWindowLayer] intValue] != 0 || [d[(id)kCGWindowAlpha] doubleValue] < 0.01) continue;
		CGRect b;
		if (!CGRectMakeWithDictionaryRepresentation((__bridge CFDictionaryRef)d[(id)kCGWindowBounds], &b)) continue;
		BOOL on = [d[(id)kCGWindowIsOnscreen] boolValue];
		if (on && (b.size.width < 40 || b.size.height < 40)) continue;
		pid_t pid = [d[(id)kCGWindowOwnerPID] intValue];
		CGWindowID wid = [d[(id)kCGWindowNumber] unsignedIntValue];
		NSString *title = d[(id)kCGWindowName];
		char *axTitle = NULL;
		if (!on || title.length == 0) {
			if (!trusted) { if (!on) continue; }
			else {
				AXUIElementRef w = win_ax_window(pid, wid);
				if (!w) { if (!on) continue; }
				else {
					if (!on && !win_ax_minimized(w)) { CFRelease(w); continue; }
					if (title.length == 0) axTitle = win_ax_title(w);
					CFRelease(w);
				}
			}
		}
		NSRunningApplication *app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
		win_info *o = &res[k++];
		o->id = wid; o->pid = pid;
		o->title = axTitle ? axTitle : win_dup(title);
		o->app = win_dup(app.localizedName ? app.localizedName : d[(id)kCGWindowOwnerName]);
		o->appId = win_dup(app.bundleIdentifier);
		o->minimized = !on;
		if (on) { o->x = b.origin.x; o->y = b.origin.y; o->w = b.size.width; o->h = b.size.height; }
	}
	*out = res; *n = k;
	return 0;
}

static void win_free(win_info *ws, int n) {
	for (int i = 0; i < n; i++) { free(ws[i].title); free(ws[i].app); free(ws[i].appId); }
	free(ws);
}

static pid_t win_owner(CGWindowID target) {
	CFArrayRef all = CGWindowListCopyWindowInfo(kCGWindowListOptionAll | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
	if (!all) return -1;
	NSArray *list = (__bridge_transfer NSArray *)all;
	for (NSDictionary *d in list) {
		if ([d[(id)kCGWindowNumber] unsignedIntValue] == target) return [d[(id)kCGWindowOwnerPID] intValue];
	}
	return -1;
}

static int win_set_size(AXUIElementRef w, double x, double y, double wd, double ht) {
	CGPoint p = CGPointMake(x, y);
	CGSize s = CGSizeMake(wd, ht);
	AXValueRef pv = AXValueCreate(kAXValueTypeCGPoint, &p);
	AXValueRef sv = AXValueCreate(kAXValueTypeCGSize, &s);
	// vị trí trước (cửa sổ chuyển màn khác cỡ), rồi cỡ, rồi vị trí lại – app kẹp cỡ theo màn nên điểm đầu có thể lệch
	AXError e1 = AXUIElementSetAttributeValue(w, kAXPositionAttribute, pv);
	AXError e2 = AXUIElementSetAttributeValue(w, kAXSizeAttribute, sv);
	AXUIElementSetAttributeValue(w, kAXPositionAttribute, pv);
	CFRelease(pv); CFRelease(sv);
	return e1 == kAXErrorSuccess && e2 == kAXErrorSuccess;
}

static int win_do(unsigned int id, int act, double x, double y, double wd, double ht) {
	if (!win_trusted()) return WIN_NO_AX;
	pid_t pid = win_owner(id);
	if (pid < 0) return WIN_GONE;
	AXUIElementRef w = win_ax_window(pid, id);
	if (!w) return WIN_GONE;
	int rc = WIN_OK;
	switch (act) {
	case WIN_FOCUS: case WIN_BOUNDS: case WIN_RESTORE:
		AXUIElementSetAttributeValue(w, kAXMinimizedAttribute, kCFBooleanFalse);
		break;
	}
	switch (act) {
	case WIN_FOCUS: {
		AXUIElementRef app = AXUIElementCreateApplication(pid);
		AXUIElementSetAttributeValue(app, kAXFrontmostAttribute, kCFBooleanTrue);
		CFRelease(app);
		[[NSRunningApplication runningApplicationWithProcessIdentifier:pid] activateWithOptions:NSApplicationActivateAllWindows];
		AXUIElementPerformAction(w, kAXRaiseAction);
		AXUIElementSetAttributeValue(w, kAXMainAttribute, kCFBooleanTrue);
		break;
	}
	case WIN_BOUNDS: if (!win_set_size(w, x, y, wd, ht)) rc = WIN_FAIL; break;
	case WIN_MINIMIZE:
		if (AXUIElementSetAttributeValue(w, kAXMinimizedAttribute, kCFBooleanTrue) != kAXErrorSuccess) rc = WIN_FAIL;
		break;
	case WIN_CLOSE: {
		CFTypeRef btn = NULL;
		if (AXUIElementCopyAttributeValue(w, kAXCloseButtonAttribute, &btn) == kAXErrorSuccess && btn) {
			if (AXUIElementPerformAction((AXUIElementRef)btn, kAXPressAction) != kAXErrorSuccess) rc = WIN_FAIL;
			CFRelease(btn);
		} else rc = WIN_FAIL;
		break;
	}
	}
	CFRelease(w);
	return rc;
}

// Vùng làm việc (trừ thanh menu / Dock) của màn chứa điểm giữa (x, y, w, h), toạ độ góc trên trái màn chính.
static void win_work_area(double x, double y, double w, double h, double *ox, double *oy, double *ow, double *oh) {
	NSArray<NSScreen *> *screens = NSScreen.screens;
	if (screens.count == 0) { *ow = 0; return; }
	double top = screens[0].frame.size.height; // NSScreen: gốc dưới trái màn chính
	double cx = x + w / 2, cy = y + h / 2;
	NSScreen *hit = screens[0];
	for (NSScreen *s in screens) {
		NSRect f = s.frame;
		double sy = top - f.origin.y - f.size.height;
		if (cx >= f.origin.x && cx < f.origin.x + f.size.width && cy >= sy && cy < sy + f.size.height) { hit = s; break; }
	}
	NSRect v = hit.visibleFrame;
	*ox = v.origin.x; *oy = top - v.origin.y - v.size.height; *ow = v.size.width; *oh = v.size.height;
}

static int win_apps(win_app **out, int *n) {
	NSArray<NSRunningApplication *> *apps = NSWorkspace.sharedWorkspace.runningApplications;
	win_app *res = calloc(apps.count + 1, sizeof(win_app));
	int k = 0;
	for (NSRunningApplication *a in apps) {
		if (a.activationPolicy != NSApplicationActivationPolicyRegular || a.terminated) continue;
		win_app *o = &res[k++];
		o->pid = a.processIdentifier;
		o->name = win_dup(a.localizedName);
		o->id = win_dup(a.bundleIdentifier);
	}
	*out = res; *n = k;
	return 0;
}

static void win_apps_free(win_app *as, int n) {
	for (int i = 0; i < n; i++) { free(as[i].name); free(as[i].id); }
	free(as);
}

static int win_quit(int pid, int force) {
	NSRunningApplication *a = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
	if (!a) return WIN_GONE;
	return (force ? [a forceTerminate] : [a terminate]) ? WIN_OK : WIN_FAIL;
}
*/
import "C"

import (
	"errors"
	"fmt"
	"unsafe"

	"ghosthand/internal/model"
)

// Cửa sổ / ứng dụng macOS (bước 26 W0c): danh sách qua CGWindowList, điều khiển qua Accessibility (AX) – không cần Screen
// Recording (tên cửa sổ lấy từ AX khi CG không trả). Khung cùng hệ toạ độ với điểm click (point, gốc trên trái màn chính).

func winErr(rc C.int, what string) error {
	switch rc {
	case C.WIN_OK:
		return nil
	case C.WIN_GONE:
		return ErrWindowGone
	case C.WIN_NO_AX:
		return ErrNoAccessibility
	}
	return fmt.Errorf("%s không được – app không cho điều khiển cửa sổ này (cửa sổ toàn màn hình / hộp thoại?)", what)
}

func (SystemWindows) List() ([]model.WindowInfo, error) {
	var ws *C.win_info
	var n C.int
	C.win_list(&ws, &n)
	defer C.win_free(ws, n)
	out := make([]model.WindowInfo, 0, int(n))
	for _, w := range unsafe.Slice(ws, int(n)) {
		out = append(out, model.WindowInfo{
			ID: uint64(w.id), Title: C.GoString(w.title), App: C.GoString(w.app), AppID: C.GoString(w.appId), PID: int(w.pid),
			Box:       model.Rect{X: int(w.x), Y: int(w.y), W: int(w.w), H: int(w.h)},
			Minimized: w.minimized != 0,
		})
	}
	return out, nil
}

func winDo(id uint64, act C.int, r model.Rect, what string) error {
	return winErr(C.win_do(C.uint(id), act, C.double(r.X), C.double(r.Y), C.double(r.W), C.double(r.H)), what)
}

func (SystemWindows) Focus(id uint64) error { return winDo(id, C.WIN_FOCUS, model.Rect{}, "đưa cửa sổ lên trước") }

func (SystemWindows) SetBounds(id uint64, r model.Rect) error {
	return winDo(id, C.WIN_BOUNDS, r, "đặt vị trí / cỡ cửa sổ")
}

// SetState: macOS không có "phóng to" như Windows – maximize = phủ vùng làm việc của màn đang chứa cửa sổ.
func (s SystemWindows) SetState(id uint64, state string) error {
	switch state {
	case WinMinimize:
		return winDo(id, C.WIN_MINIMIZE, model.Rect{}, "thu nhỏ cửa sổ")
	case WinRestore:
		return winDo(id, C.WIN_RESTORE, model.Rect{}, "khôi phục cửa sổ")
	case WinMaximize:
		list, err := s.List()
		if err != nil {
			return err
		}
		for _, w := range list {
			if w.ID == id {
				return s.SetBounds(id, s.WorkArea(w.Box))
			}
		}
		return ErrWindowGone
	}
	return errors.New("trạng thái cửa sổ không hợp lệ: " + state)
}

func (SystemWindows) Close(id uint64) error { return winDo(id, C.WIN_CLOSE, model.Rect{}, "đóng cửa sổ") }

func (SystemWindows) WorkArea(r model.Rect) model.Rect {
	var x, y, w, h C.double
	C.win_work_area(C.double(r.X), C.double(r.Y), C.double(r.W), C.double(r.H), &x, &y, &w, &h)
	if w <= 0 {
		return MainScreen()
	}
	return model.Rect{X: int(x), Y: int(y), W: int(w), H: int(h)}
}

func (SystemApps) List() ([]model.AppInfo, error) {
	var as *C.win_app
	var n C.int
	C.win_apps(&as, &n)
	defer C.win_apps_free(as, n)
	wins, err := SystemWindows{}.List()
	if err != nil {
		return nil, err
	}
	count := map[int]int{}
	for _, w := range wins {
		if !w.Minimized {
			count[w.PID]++
		}
	}
	out := make([]model.AppInfo, 0, int(n))
	for _, a := range unsafe.Slice(as, int(n)) {
		out = append(out, model.AppInfo{Name: C.GoString(a.name), ID: C.GoString(a.id), PID: int(a.pid), Windows: count[int(a.pid)]})
	}
	return out, nil
}

func (SystemApps) Quit(pid int) error      { return winErr(C.win_quit(C.int(pid), 0), "thoát app") }
func (SystemApps) ForceQuit(pid int) error { return winErr(C.win_quit(C.int(pid), 1), "buộc thoát app") }
