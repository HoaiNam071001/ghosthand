//go:build darwin

package device

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework ApplicationServices -framework AppKit -framework CoreGraphics -framework Foundation
#include <ApplicationServices/ApplicationServices.h>
#import <AppKit/AppKit.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef struct { char *role, *subrole, *title, *desc, *value, *placeholder, *selected; double x, y, w, h; int depth; } ax_node;

typedef struct {
	ax_node *nodes;
	int n, cap, max;
	CFAbsoluteTime deadline;
	CFArrayRef attrs;
	CFMutableSetRef seen; // phần tử đã duyệt – Chrome trả cùng cây qua nhiều cửa sổ (thanh công cụ toàn màn hình)
	int target;           // ≥ 0: duyệt tới nút thứ target thì làm act với nó rồi dừng (ax_do)
	int act;
	const char *val;      // act = AX_ACT_SET: chữ cần đặt
	int acted;
} ax_walk;

enum { AX_ACT_SCROLL, AX_ACT_PRESS, AX_ACT_SET, AX_ACT_EXPAND, AX_ACT_COLLAPSE, AX_ACT_SELECT };
enum { AX_ROLE, AX_SUBROLE, AX_TITLE, AX_DESC, AX_VALUE, AX_PLACEHOLDER, AX_SELECTED, AX_POS, AX_SIZE, AX_CHILDREN, AX_NATTR };

// Chuỗi C (strdup) từ giá trị AX: chuỗi, số (checkbox 0 / 1, thanh trượt); kiểu khác / lỗi → NULL.
static char *ax_str(CFTypeRef v) {
	if (!v) return NULL;
	if (CFGetTypeID(v) == CFStringGetTypeID()) {
		NSString *s = (__bridge NSString *)v;
		return s.length ? strdup(s.UTF8String) : NULL;
	}
	if (CFGetTypeID(v) == CFNumberGetTypeID()) return strdup([(__bridge NSNumber *)v stringValue].UTF8String);
	return NULL;
}

// Thao tác trực tiếp lên phần tử qua AX, không cần chuột. 1 = app nhận lệnh (chưa chắc đã đổi – nơi gọi đọc lại để kiểm).
static int ax_do(AXUIElementRef el, int act, const char *val) {
	switch (act) {
	case AX_ACT_PRESS: return AXUIElementPerformAction(el, kAXPressAction) == kAXErrorSuccess;
	case AX_ACT_SET: {
		CFStringRef s = CFStringCreateWithCString(NULL, val ? val : "", kCFStringEncodingUTF8);
		AXError e = AXUIElementSetAttributeValue(el, kAXValueAttribute, s);
		CFRelease(s);
		return e == kAXErrorSuccess;
	}
	case AX_ACT_EXPAND: return AXUIElementSetAttributeValue(el, CFSTR("AXExpanded"), kCFBooleanTrue) == kAXErrorSuccess;
	case AX_ACT_COLLAPSE: return AXUIElementSetAttributeValue(el, CFSTR("AXExpanded"), kCFBooleanFalse) == kAXErrorSuccess;
	case AX_ACT_SELECT: return AXUIElementSetAttributeValue(el, kAXSelectedAttribute, kCFBooleanTrue) == kAXErrorSuccess;
	}
	return AXUIElementPerformAction(el, CFSTR("AXScrollToVisible")) == kAXErrorSuccess;
}

static void ax_walk_el(AXUIElementRef el, int depth, ax_walk *c) {
	if (c->n >= c->max || CFAbsoluteTimeGetCurrent() > c->deadline) return;
	if (depth > 200 || CFSetContainsValue(c->seen, el)) return;
	CFSetAddValue(c->seen, el);
	CFArrayRef vals = NULL;
	// một lần hỏi nhiều thuộc tính – nhanh hơn hỏi từng cái (mỗi lần là một IPC sang app)
	if (AXUIElementCopyMultipleAttributeValues(el, c->attrs, 0, &vals) != kAXErrorSuccess || !vals) return;
	if (CFArrayGetCount(vals) < AX_NATTR) { CFRelease(vals); return; }
	if (c->n == c->cap) {
		int cap = c->cap ? c->cap * 2 : 1024;
		ax_node *nn = realloc(c->nodes, cap * sizeof(ax_node));
		if (!nn) { CFRelease(vals); return; }
		c->nodes = nn; c->cap = cap;
	}
	if (c->n == c->target) {
		c->acted = ax_do(el, c->act, c->val);
		c->max = 0; // dừng duyệt
		CFRelease(vals);
		return;
	}
	ax_node *o = &c->nodes[c->n++];
	memset(o, 0, sizeof(*o));
	o->depth = depth;
	o->role = ax_str(CFArrayGetValueAtIndex(vals, AX_ROLE));
	o->subrole = ax_str(CFArrayGetValueAtIndex(vals, AX_SUBROLE));
	o->title = ax_str(CFArrayGetValueAtIndex(vals, AX_TITLE));
	o->desc = ax_str(CFArrayGetValueAtIndex(vals, AX_DESC));
	o->value = ax_str(CFArrayGetValueAtIndex(vals, AX_VALUE));
	o->placeholder = ax_str(CFArrayGetValueAtIndex(vals, AX_PLACEHOLDER));
	o->selected = ax_str(CFArrayGetValueAtIndex(vals, AX_SELECTED));
	CFTypeRef pos = CFArrayGetValueAtIndex(vals, AX_POS), size = CFArrayGetValueAtIndex(vals, AX_SIZE);
	CGPoint p = CGPointZero; CGSize s = CGSizeZero;
	if (pos && CFGetTypeID(pos) == AXValueGetTypeID() && AXValueGetValue(pos, kAXValueCGPointType, &p) &&
	    size && CFGetTypeID(size) == AXValueGetTypeID() && AXValueGetValue(size, kAXValueCGSizeType, &s)) {
		o->x = p.x; o->y = p.y; o->w = s.width; o->h = s.height;
	}
	CFTypeRef kids = CFArrayGetValueAtIndex(vals, AX_CHILDREN);
	if (kids && CFGetTypeID(kids) == CFArrayGetTypeID()) {
		CFIndex k = CFArrayGetCount(kids);
		for (CFIndex i = 0; i < k; i++) ax_walk_el(CFArrayGetValueAtIndex(kids, i), depth + 1, c);
	}
	CFRelease(vals);
}

// pid của app có cửa sổ thường (layer 0) trên cùng đang hiện, không tính app này; -1 nếu không có.
static pid_t ax_front_pid(void) {
	CFArrayRef list = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
	if (!list) return -1;
	pid_t self = getpid(), out = -1;
	for (NSDictionary *w in (__bridge NSArray *)list) {
		if ([w[(id)kCGWindowLayer] intValue] != 0) continue;
		pid_t pid = [w[(id)kCGWindowOwnerPID] intValue];
		if (pid != self) { out = pid; break; }
	}
	CFRelease(list);
	return out;
}

// pid theo tên hiển thị hoặc bundle id (không phân biệt hoa thường); "" = ax_front_pid. *name = tên app (strdup).
static pid_t ax_find_pid(const char *app, char **name) {
	NSString *want = [NSString stringWithUTF8String:app];
	pid_t pid = -1;
	if (want.length == 0) {
		pid = ax_front_pid();
	} else {
		for (NSRunningApplication *a in NSWorkspace.sharedWorkspace.runningApplications) {
			// tên / bundle id có thể nil – gửi message tới nil trả 0 = NSOrderedSame nên phải kiểm trước
			if ((a.localizedName && [a.localizedName caseInsensitiveCompare:want] == NSOrderedSame) ||
			    (a.bundleIdentifier && [a.bundleIdentifier caseInsensitiveCompare:want] == NSOrderedSame)) {
				pid = a.processIdentifier;
				break;
			}
		}
	}
	if (pid > 0) {
		NSRunningApplication *a = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
		*name = strdup(a.localizedName ? a.localizedName.UTF8String : "");
	}
	return pid;
}

// Chrome / Electron chỉ dựng cây khi có client accessibility; app thường bỏ qua hai thuộc tính này.
static void ax_enable(pid_t pid) {
	AXUIElementRef ax = AXUIElementCreateApplication(pid);
	AXUIElementSetMessagingTimeout(ax, 1.0);
	AXUIElementSetAttributeValue(ax, CFSTR("AXManualAccessibility"), kCFBooleanTrue);
	AXUIElementSetAttributeValue(ax, CFSTR("AXEnhancedUserInterface"), kCFBooleanTrue);
	CFRelease(ax);
}

// Đọc cây các cửa sổ không thu nhỏ của app pid. Trả 0 được, 3 không có cửa sổ đang hiện.
// target ≥ 0: không đọc mà làm act (AX_ACT_*, val cho AX_ACT_SET) với nút thứ target, *acted = 1 nếu được (thứ tự duyệt như lần đọc).
static int ax_read(pid_t pid, int maxNodes, double seconds, int target, int act, const char *val, int *acted, ax_node **nodes, int *n) {
	*nodes = NULL; *n = 0; *acted = 0;
	AXUIElementRef ax = AXUIElementCreateApplication(pid);
	AXUIElementSetMessagingTimeout(ax, 1.0);
	CFTypeRef wins = NULL;
	AXUIElementCopyAttributeValue(ax, kAXWindowsAttribute, &wins);
	CFStringRef names[AX_NATTR] = {kAXRoleAttribute, kAXSubroleAttribute, kAXTitleAttribute, kAXDescriptionAttribute,
		kAXValueAttribute, CFSTR("AXPlaceholderValue"), kAXSelectedTextAttribute, kAXPositionAttribute, kAXSizeAttribute, kAXChildrenAttribute};
	ax_walk c = {0};
	c.max = maxNodes;
	c.target = target;
	c.act = act;
	c.val = val;
	c.deadline = CFAbsoluteTimeGetCurrent() + seconds;
	c.attrs = CFArrayCreate(NULL, (const void **)names, AX_NATTR, &kCFTypeArrayCallBacks);
	c.seen = CFSetCreateMutable(NULL, 0, &kCFTypeSetCallBacks);
	int shown = 0;
	if (wins && CFGetTypeID(wins) == CFArrayGetTypeID()) {
		for (CFIndex i = 0; i < CFArrayGetCount(wins); i++) {
			AXUIElementRef w = (AXUIElementRef)CFArrayGetValueAtIndex(wins, i);
			CFTypeRef mini = NULL;
			BOOL minimized = AXUIElementCopyAttributeValue(w, kAXMinimizedAttribute, &mini) == kAXErrorSuccess && mini == kCFBooleanTrue;
			if (mini) CFRelease(mini);
			if (minimized) continue;
			shown++;
			ax_walk_el(w, 0, &c);
		}
	}
	if (wins) CFRelease(wins);
	CFRelease(c.attrs);
	CFRelease(c.seen);
	CFRelease(ax);
	*nodes = c.nodes; *n = c.n; *acted = c.acted;
	return shown ? 0 : 3;
}

static int ax_trusted(void) { return AXIsProcessTrusted(); }

static void ax_free(ax_node *ns, int n) {
	for (int i = 0; i < n; i++) {
		free(ns[i].role); free(ns[i].subrole); free(ns[i].title); free(ns[i].desc); free(ns[i].value); free(ns[i].placeholder); free(ns[i].selected);
	}
	free(ns);
}
*/
import "C"

import (
	"errors"
	"fmt"
	"math"
	"sync"
	"time"
	"unsafe"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Giới hạn mỗi lần đọc cây: trang nặng (Tiki, YouTube) ~1–3 nghìn nút, 60–250 ms. Quá giới hạn thì dùng phần đã đọc.
const (
	maxElementNodes   = 20000
	maxElementSeconds = 2.0
	axBuildWait       = 2500 * time.Millisecond // lần đầu bật cây: chờ app dựng cây tối đa
)

// axEnabled – pid đã bật cây accessibility (AXManualAccessibility) – chỉ chờ dựng cây ở lần đầu.
var axEnabled sync.Map

func readElements(app string) ([]element.Node, error) {
	pid, name, err := findApp(app)
	if err != nil {
		return nil, err
	}
	if _, seen := axEnabled.LoadOrStore(int(pid), true); !seen {
		return firstRead(pid, name)
	}
	return readPid(pid, name)
}

// scrollTo cuộn nút thứ index (thứ tự như readElements) vào khung nhìn – cây đổi giữa hai lần thì có thể cuộn nhầm,
// nơi gọi phải đọc lại để đo.
func scrollTo(app string, index int) error { return actAt(app, index, model.ElActScroll, "") }

// docTexts – AXValue / AXSelectedText đã đọc sẵn vào Node (Value / Selected) nên không có gì thêm.
func docTexts(string, []int, bool) ([]string, error) { return nil, nil }

var axActs = map[string]C.int{
	model.ElActScroll: C.AX_ACT_SCROLL, model.ElActPress: C.AX_ACT_PRESS, model.ElActSetValue: C.AX_ACT_SET,
	model.ElActExpand: C.AX_ACT_EXPAND, model.ElActCollapse: C.AX_ACT_COLLAPSE, model.ElActSelect: C.AX_ACT_SELECT,
}

// actAt làm thao tác act (model.ElAct*) với nút thứ index của lần đọc vừa rồi – cùng giới hạn như scrollTo.
func actAt(app string, index int, act, value string) error {
	code, ok := axActs[act]
	if !ok {
		return fmt.Errorf("thao tác %q chưa hỗ trợ", act)
	}
	pid, name, err := findApp(app)
	if err != nil {
		return err
	}
	var (
		ns       *C.ax_node
		n, acted C.int
	)
	cval := C.CString(value)
	defer C.free(unsafe.Pointer(cval))
	rc := C.ax_read(pid, maxElementNodes, maxElementSeconds, C.int(index), code, cval, &acted, &ns, &n)
	C.ax_free(ns, n)
	if rc == 3 {
		return fmt.Errorf("%w (%s)", ErrNoWindow, name)
	}
	if acted == 0 {
		return errors.New("app không nhận thao tác này trên phần tử (trang vừa đổi, hoặc phần tử không hỗ trợ)")
	}
	return nil
}

// findApp – pid + tên app theo tên / bundle id ("" = app có cửa sổ trên cùng), kiểm quyền trước.
func findApp(app string) (C.pid_t, string, error) {
	if C.ax_trusted() == 0 {
		return 0, "", ErrNoAccessibility
	}
	capp := C.CString(app)
	defer C.free(unsafe.Pointer(capp))
	var cname *C.char
	pid := C.ax_find_pid(capp, &cname)
	if pid <= 0 {
		if app == "" {
			return 0, "", ErrNoWindow
		}
		return 0, "", fmt.Errorf("%w: “%s”", ErrAppNotFound, app)
	}
	name := C.GoString(cname)
	C.free(unsafe.Pointer(cname))
	return pid, name, nil
}

// firstRead – lần đầu với một app: bật cây rồi đọc lại tới khi số nút đứng yên (Chrome dựng ngay, Electron > 1 s).
// Cây nhỏ (< 50 nút) chưa chắc đã dựng xong nên đọc tới hết axBuildWait – chỉ tốn một lần mỗi app.
func firstRead(pid C.pid_t, name string) ([]element.Node, error) {
	C.ax_enable(pid)
	deadline := time.Now().Add(axBuildWait)
	var best []element.Node
	for {
		time.Sleep(300 * time.Millisecond)
		nodes, err := readPid(pid, name)
		if err != nil {
			return nil, err
		}
		if len(nodes) == len(best) && len(nodes) >= 50 || time.Now().After(deadline) {
			return nodes, nil
		}
		best = nodes
	}
}

func readPid(pid C.pid_t, name string) ([]element.Node, error) {
	var (
		ns       *C.ax_node
		n, acted C.int
	)
	rc := C.ax_read(pid, maxElementNodes, maxElementSeconds, -1, 0, nil, &acted, &ns, &n)
	defer C.ax_free(ns, n)
	if rc == 3 {
		return nil, fmt.Errorf("%w (%s)", ErrNoWindow, name)
	}
	out := make([]element.Node, 0, int(n))
	for _, c := range unsafe.Slice(ns, int(n)) {
		raw, sub := C.GoString(c.role), C.GoString(c.subrole)
		out = append(out, element.Node{
			Role: element.RoleFromAX(raw, sub), Raw: raw,
			Title: oneLine(C.GoString(c.title)), Desc: oneLine(C.GoString(c.desc)), Value: C.GoString(c.value),
			Placeholder: oneLine(C.GoString(c.placeholder)), Selected: C.GoString(c.selected),
			Box: model.Rect{X: int(math.Round(float64(c.x))), Y: int(math.Round(float64(c.y))),
				W: int(math.Round(float64(c.w))), H: int(math.Round(float64(c.h)))},
			Depth: int(c.depth),
		})
	}
	return out, nil
}
