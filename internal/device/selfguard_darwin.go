//go:build darwin

package device

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework CoreGraphics -framework AppKit -framework Foundation
#include <CoreGraphics/CoreGraphics.h>
#import <AppKit/AppKit.h>
#include <unistd.h>

// Chủ cửa sổ trên cùng tại điểm (point, gốc trên trái màn chính): mọi layer đang hiện, trước → sau – gồm cả thanh mini
// nổi. Bỏ cửa sổ trong suốt hẳn. -1 = không có cửa sổ, -2 = không đọc được danh sách.
static int self_owner_at(double x, double y) {
	CFArrayRef all = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
	if (!all) return -2;
	NSArray *list = (__bridge_transfer NSArray *)all;
	CGPoint p = CGPointMake(x, y);
	for (NSDictionary *d in list) {
		if ([d[(id)kCGWindowAlpha] doubleValue] < 0.01) continue;
		CGRect b;
		if (!CGRectMakeWithDictionaryRepresentation((__bridge CFDictionaryRef)d[(id)kCGWindowBounds], &b)) continue;
		if (CGRectContainsPoint(b, p)) return [d[(id)kCGWindowOwnerPID] intValue];
	}
	return -1;
}

static int self_front_pid(void) {
	NSRunningApplication *app = [[NSWorkspace sharedWorkspace] frontmostApplication];
	return app ? app.processIdentifier : -1;
}
*/
import "C"

import (
	"errors"
	"os"
)

// OwnWindowAt – cửa sổ trên cùng tại (x, y) thuộc app này (SelfGuardInput).
func OwnWindowAt(x, y int) (bool, error) {
	pid := int(C.self_owner_at(C.double(x), C.double(y)))
	if pid == -2 {
		return false, errors.New("không đọc được danh sách cửa sổ")
	}
	return pid == os.Getpid(), nil
}

// OwnFront – app này đang ở trước (nhận phím).
func OwnFront() (bool, error) {
	return int(C.self_front_pid()) == os.Getpid(), nil
}
