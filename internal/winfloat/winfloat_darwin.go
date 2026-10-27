//go:build darwin

// Package winfloat: cho thanh mini / overlay nổi lên cả trên app đang toàn màn hình (macOS: mỗi app toàn màn hình là
// một Space riêng – cửa sổ always-on-top thường chỉ ở Space nơi nó mở).
//
// Đo bằng cửa sổ thử (2026-10-18, bước 33 – lỗi người dùng báo): cần cả cờ CanJoinAllSpaces + FullScreenAuxiliary
// lẫn chế độ Accessory, và lần đặt chế độ kích hoạt ĐẦU TIÊN của tiến trình phải là Accessory – đặt Regular trước
// (Wails làm ở applicationWillFinishLaunching) thì về sau chuyển sang Accessory cũng không nổi được. Vì vậy
// PrepareLaunch đặt Accessory trước khi Wails chạy; Wails đặt lại Regular nên màn chính vẫn có icon Dock như cũ.
package winfloat

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#import <Cocoa/Cocoa.h>

static void prepare_launch(void) {
	[NSApplication sharedApplication];
	[NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
}

static const NSWindowCollectionBehavior floatBehavior =
	NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary;

// Màn chính đi theo Space đang đứng: đang ở Space 2 bấm icon Dock → cửa sổ dời sang Space 2 thay vì kéo người dùng
// về Space nơi nó mở. Loại trừ với CanJoinAllSpaces (đặt cả hai thì AppKit ném lỗi) nên bỏ floatBehavior trước.
static void set_normal_behavior(NSWindow *w) {
	[w setCollectionBehavior:([w collectionBehavior] & ~floatBehavior) | NSWindowCollectionBehaviorMoveToActiveSpace];
}

static void follow_active_space(void) {
	dispatch_async(dispatch_get_main_queue(), ^{
		for (NSWindow *w in [NSApp windows]) set_normal_behavior(w);
	});
}

// on: nổi trên mọi Space (kể cả app toàn màn hình), không icon Dock trong lúc đó. focus: nhận bàn phím (overlay);
// thanh mini không giành focus của app đang được điều khiển.
static void set_floating(int on, int focus) {
	dispatch_async(dispatch_get_main_queue(), ^{
		if (on) [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
		for (NSWindow *w in [NSApp windows]) {
			if (on) {
				[w setCollectionBehavior:([w collectionBehavior] | floatBehavior) & ~NSWindowCollectionBehaviorMoveToActiveSpace];
				[w setLevel:NSStatusWindowLevel];
				[w orderOut:nil]; // ẩn rồi hiện lại để cờ Space có tác dụng ngay
				[w orderFrontRegardless];
				if (focus) [w makeKeyWindow];
			} else {
				set_normal_behavior(w);
				[w setLevel:NSNormalWindowLevel];
			}
		}
		if (on && focus) [NSApp activateIgnoringOtherApps:YES];
		if (!on) {
			[NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
			[NSApp activateIgnoringOtherApps:YES];
		}
	});
}
// Phủ trọn khung màn đang chứa cửa sổ, kể cả thanh menu + Dock (Wails chỉ đặt vị trí từ dưới thanh menu). Cửa sổ
// frameless không bị AppKit ép vào vùng hiển thị; mức NSStatusWindowLevel (set_floating) cao hơn thanh menu.
// Chạy sau SetSize / SetPosition của Wails (cùng hàng đợi luồng chính) nên lấy màn theo tâm cửa sổ Wails vừa đặt.
static void cover_screen(void) {
	dispatch_async(dispatch_get_main_queue(), ^{
		for (NSWindow *w in [NSApp windows]) {
			if (![w isVisible]) continue;
			NSRect f = [w frame];
			NSPoint c = NSMakePoint(NSMidX(f), NSMidY(f));
			for (NSScreen *s in [NSScreen screens]) {
				if (NSPointInRect(c, [s frame])) {
					[w setFrame:[s frame] display:YES];
					break;
				}
			}
		}
	});
}
*/
import "C"

// PrepareLaunch – gọi đầu main(), trước wails.Run (đang ở luồng chính).
func PrepareLaunch() { C.prepare_launch() }

// FollowActiveSpace – gọi lúc khởi động (OnStartup): màn chính hiện ở Space đang đứng.
func FollowActiveSpace() { C.follow_active_space() }

// Set bật / tắt chế độ nổi cho các cửa sổ của app. Gọi sau WindowSetAlwaysOnTop của Wails (cùng hàng đợi luồng chính
// nên chạy sau, mức cửa sổ của mình đè lên mức Wails đặt).
func Set(on, focus bool) {
	b := func(v bool) C.int {
		if v {
			return 1
		}
		return 0
	}
	C.set_floating(b(on), b(focus))
}

// CoverScreen cho cửa sổ (overlay) phủ trọn màn đang chứa nó – gọi sau khi Wails đã dời / đổi cỡ cửa sổ.
func CoverScreen() { C.cover_screen() }
