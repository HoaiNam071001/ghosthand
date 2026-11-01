//go:build darwin

package runborder

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa -framework QuartzCore
#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>

// Viền vẽ bằng CALayer (borderWidth) – không drawRect, đổi màu / nhịp không vẽ lại cả cửa sổ.
// NSPanel không kích hoạt: hiện trên app toàn màn hình (FullScreenAuxiliary) mà không đổi app đang ở trước;
// ignoresMouseEvents – click xuyên qua; sharingType None – ảnh chụp kiểu cũ không thấy (ScreenCaptureKit lọc theo tên,
// capture_darwin.go).
static NSPanel *panel;

static void ensure_panel(void) {
	if (panel) return;
	panel = [[NSPanel alloc] initWithContentRect:NSMakeRect(0, 0, 100, 100)
		styleMask:NSWindowStyleMaskBorderless | NSWindowStyleMaskNonactivatingPanel backing:NSBackingStoreBuffered defer:NO];
	[panel setTitle:@"ghosthand-border"];
	[panel setOpaque:NO];
	[panel setBackgroundColor:[NSColor clearColor]];
	[panel setHasShadow:NO];
	[panel setIgnoresMouseEvents:YES];
	[panel setReleasedWhenClosed:NO];
	[panel setHidesOnDeactivate:NO];
	[panel setFloatingPanel:YES];
	[panel setLevel:NSScreenSaverWindowLevel];
	[panel setSharingType:NSWindowSharingNone];
	[panel setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary |
		NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorIgnoresCycle];
	NSView *v = [panel contentView];
	[v setWantsLayer:YES];
	v.layer.cornerRadius = 10;
}

// (x, y) – điểm theo toạ độ robotgo (gốc trên trái màn chính): viền hiện trên màn chứa điểm đó.
static void border_show(double x, double y, int px, double r, double g, double b, double a, int pulse) {
	dispatch_async(dispatch_get_main_queue(), ^{
		ensure_panel();
		NSScreen *scr = [NSScreen mainScreen];
		CGFloat mainH = [[[NSScreen screens] firstObject] frame].size.height;
		NSPoint p = NSMakePoint(x, mainH - y);
		for (NSScreen *s in [NSScreen screens]) if (NSPointInRect(p, [s frame])) scr = s;
		[panel setFrame:[scr frame] display:NO];
		CALayer *l = [[panel contentView] layer];
		l.borderWidth = px;
		l.borderColor = [[NSColor colorWithSRGBRed:r green:g blue:b alpha:a] CGColor];
		if (pulse && ![l animationForKey:@"pulse"]) {
			CABasicAnimation *an = [CABasicAnimation animationWithKeyPath:@"opacity"];
			an.fromValue = @1.0;
			an.toValue = @0.45;
			an.duration = 0.9;
			an.autoreverses = YES;
			an.repeatCount = HUGE_VALF;
			[l addAnimation:an forKey:@"pulse"];
		} else if (!pulse) {
			[l removeAnimationForKey:@"pulse"];
		}
		[panel orderFrontRegardless];
	});
}

static void border_hide(void) {
	dispatch_async(dispatch_get_main_queue(), ^{
		if (panel) [panel orderOut:nil];
	});
}
*/
import "C"

// Show hiện viền kiểu l, dày px, trên màn chứa điểm (x, y); đang hiện thì đổi kiểu / dời màn.
func Show(x, y, px int, l Look) {
	pulse := C.int(0)
	if l.Pulse {
		pulse = 1
	}
	C.border_show(C.double(x), C.double(y), C.int(px), C.double(float64(l.R)/255), C.double(float64(l.G)/255),
		C.double(float64(l.B)/255), C.double(l.Alpha), pulse)
}

// Hide ẩn viền (giữ cửa sổ để lần sau hiện nhanh).
func Hide() { C.border_hide() }
