package session

import (
	"context"
	"image"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/engine"
	"ghosthand/internal/model"
	"ghosthand/internal/power"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
	"ghosthand/internal/web"
)

// Deps – thiết bị + lưu trữ một phiên dùng; trường nil = bản thật. Test thay bằng bản giả.
type Deps struct {
	Input       func() device.Input
	Screen      func() model.Rect
	Displays    func() []model.Rect
	Now         func() time.Time
	AllowDanger func(sc model.Script, path, confirm string) (bool, error)
	// Browser – Chrome của app cho node web (nối lười); close gọi khi phiên xong.
	Browser func(move func(x, y int) error) (b web.Browser, close func(), err error)
	// Corners – dừng khẩn khi chuột chạm góc màn hình (chạy tới khi ctx huỷ).
	Corners func(ctx context.Context, in *device.TrackingInput, onHit func())
	// Touch – lượt AI: người dùng đụng chuột (chuột tới chỗ engine không đưa tới) → onTouch (chạy tới khi ctx huỷ).
	Touch func(ctx context.Context, in *device.TrackingInput, paused func() bool, onTouch func())
	// SelfGuard – lượt AI: bọc Input để không bấm / gõ vào cửa sổ của chính app (hộp hỏi quyền, Cài đặt).
	SelfGuard func(in device.Input) device.Input
	SaveRun   func(rec model.RunRecord, path string, shots map[string]image.Image) error
	// ShotsDir – thư mục ảnh trong Cài đặt (node Chụp màn hình để trống saveDir), đọc lúc bắt đầu mỗi phiên.
	ShotsDir func() string
	// KeepAwake – giữ máy thức trong lúc chạy (Script.KeepAwake); nil = thật (macOS caffeinate, Windows SetThreadExecutionState).
	KeepAwake func(ctx context.Context) (stop func(), err error)
	// Secrets – kho bí mật (bước 43 S10); nil = Keychain / Credential Manager thật.
	Secrets *secrets.Store
	// MCP – gọi tool MCP server ngoài qua cổng quyền của app (node Gọi tool MCP, bước 55); nil = node báo chỉ chạy trong app.
	MCP engine.MCPCaller
	// AIDefault – nhà cung cấp AI mặc định của node Hỏi AI (Cài đặt → Hỏi AI), đọc lúc bắt đầu mỗi phiên; nil = settings.
	AIDefault func() store.AISettings
}

func (d Deps) withDefaults() Deps {
	if d.Input == nil {
		d.Input = func() device.Input { return device.RobotgoInput{} }
	}
	if d.Screen == nil {
		d.Screen = device.MainScreen
	}
	if d.Displays == nil {
		d.Displays = device.Displays
	}
	if d.Now == nil {
		d.Now = time.Now
	}
	if d.AllowDanger == nil {
		d.AllowDanger = AllowDanger
	}
	if d.Browser == nil {
		d.Browser = func(move func(x, y int) error) (web.Browser, func(), error) {
			profile, err := store.BrowserProfile()
			if err != nil {
				return nil, nil, err
			}
			br := web.NewChrome(profile, move) // nối lười – kịch bản không có node web thì không đụng trình duyệt
			return br, br.Close, nil
		}
	}
	if d.AIDefault == nil {
		d.AIDefault = func() store.AISettings { return store.CurrentSettings().AI }
	}
	if d.Corners == nil {
		d.Corners = func(ctx context.Context, in *device.TrackingInput, onHit func()) {
			device.WatchCorners(ctx, device.Location, device.HardCorners(device.Displays()), in, onHit)
		}
	}
	if d.Touch == nil {
		d.Touch = func(ctx context.Context, in *device.TrackingInput, paused func() bool, onTouch func()) {
			device.WatchTouch(ctx, device.Location, in, paused, onTouch)
		}
	}
	if d.SelfGuard == nil {
		d.SelfGuard = func(in device.Input) device.Input {
			return &device.SelfGuardInput{Input: in, Own: device.OwnWindowAt, OwnFront: device.OwnFront}
		}
	}
	if d.KeepAwake == nil {
		d.KeepAwake = power.KeepAwake
	}
	if d.Secrets == nil {
		d.Secrets = store.Secrets()
	}
	if d.ShotsDir == nil {
		d.ShotsDir = store.ShotsDir
	}
	if d.SaveRun == nil {
		d.SaveRun = func(rec model.RunRecord, path string, shots map[string]image.Image) error {
			base, err := store.ConfigDir()
			if err != nil {
				return err
			}
			return store.SaveRun(store.RunsDir(base, rec.Script, path), rec, shots)
		}
	}
	return d
}
