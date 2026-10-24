//go:build darwin

package perm

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Foundation -framework ApplicationServices
#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>

static int ax_check(int prompt) {
	if (!prompt) return AXIsProcessTrusted();
	NSDictionary *o = @{(__bridge NSString *)kAXTrustedCheckOptionPrompt: @YES};
	return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)o);
}

// OSStatus: 0 đã cấp, -1743 bị từ chối, -1744 chưa hỏi, -600 ứng dụng đích chưa mở. ask=0 không bật hộp thoại.
static int automation(const char *bundle, int ask) {
	NSAppleEventDescriptor *d = [NSAppleEventDescriptor descriptorWithBundleIdentifier:[NSString stringWithUTF8String:bundle]];
	return (int)AEDeterminePermissionToAutomateTarget(d.aeDesc, typeWildCard, typeWildCard, ask ? true : false);
}
*/
import "C"

import (
	"os/exec"
	"unsafe"

	"ghosthand/internal/device"
)

// System là Prober thật của macOS.
type System struct{}

var targets = map[ID]string{
	AutoChrome:       "com.google.Chrome",
	AutoFinder:       "com.apple.finder",
	AutoSystemEvents: "com.apple.systemevents",
}

var panes = map[ID]string{
	Accessibility:   "Privacy_Accessibility",
	ScreenRecording: "Privacy_ScreenCapture",
	AutoChrome:      "Privacy_Automation", AutoFinder: "Privacy_Automation", AutoSystemEvents: "Privacy_Automation",
	Notifications: "",
}

func (System) IDs() []ID {
	return []ID{Accessibility, ScreenRecording, AutoChrome, AutoFinder, AutoSystemEvents, Notifications}
}

func (System) Probe(id ID) (State, string) { return probe(id, false) }

func (System) Request(id ID) (State, string) { return probe(id, true) }

func probe(id ID, ask bool) (State, string) {
	switch id {
	case Accessibility:
		return fromBool(C.ax_check(cbool(ask)) != 0), ""
	case ScreenRecording:
		if ask {
			device.RequestScreenCapture()
		}
		return fromBool(device.ScreenCaptureAllowed()), ""
	}
	bundle, ok := targets[id]
	if !ok {
		return Unknown, ""
	}
	if ask && id == AutoSystemEvents {
		// System Events thường chưa chạy; không mở thì hệ điều hành trả "đích chưa mở" thay vì hỏi quyền.
		_ = exec.Command("open", "-g", "-j", "-b", bundle).Run()
	}
	cs := C.CString(bundle)
	defer C.free(unsafe.Pointer(cs))
	switch C.automation(cs, cbool(ask)) {
	case 0:
		return Granted, ""
	case -1743:
		return Denied, ""
	case -600:
		return Unknown, "Ứng dụng đích chưa mở – mở lên (hoặc bấm Cấp quyền) rồi kiểm tra lại"
	case -1744:
		return Unknown, "Chưa hỏi lần nào – bấm Cấp quyền"
	}
	return Unknown, "Không xác định được"
}

func (System) OpenSettings(id ID) error {
	url := "x-apple.systempreferences:com.apple.preference.security"
	if p := panes[id]; p != "" {
		url += "?" + p
	} else if id == Notifications {
		url = "x-apple.systempreferences:com.apple.Notifications-Settings.extension"
	}
	return exec.Command("open", url).Run()
}

func fromBool(ok bool) State {
	if ok {
		return Granted
	}
	return Denied
}

func cbool(b bool) C.int {
	if b {
		return 1
	}
	return 0
}
