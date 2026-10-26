package browser

import (
	"context"
	"errors"
	"os/exec"
	"slices"
	"strings"
	"time"

	"ghosthand/internal/device"
	"ghosthand/internal/model"
)

// Windows: thanh tab + ô địa chỉ đọc qua UI Automation (device/chromeui_windows.go), không CDP / extension. Khác macOS:
//   - UIA không cho đọc URL tab đang ẩn → chỉ tab đang chọn có URL (ô địa chỉ, đã thêm lại "https://"); tab khác tìm theo tiêu đề;
//   - tải lại / quay lại / đi tới URL tác động tab đang chọn của cửa sổ → chọn tab đó trước (đổi tab đang hiện);
//   - đi tới URL cần cửa sổ ở trước (gõ Enter vào ô địa chỉ).

// winBrowser – trình duyệt của một cửa sổ (theo tên tệp chạy); "" = không phải trình duyệt hỗ trợ.
func winBrowser(w model.WindowInfo) string {
	switch strings.ToLower(w.App) {
	case "chrome":
		return model.BrowserChrome
	case "msedge":
		return model.BrowserEdge
	case "brave":
		return model.BrowserBrave
	case "browser", "coccoc":
		if strings.Contains(strings.ToLower(w.AppID), "coccoc") {
			return model.BrowserCocCoc
		}
	}
	return ""
}

// browserWindows – cửa sổ của trình duyệt b ("" = mọi trình duyệt), trên cùng trước.
func browserWindows(b string) ([]model.WindowInfo, error) {
	all, err := device.SystemWindows{}.List()
	if err != nil {
		return nil, err
	}
	var out []model.WindowInfo
	for _, w := range all {
		if k := winBrowser(w); k != "" && (b == "" || b == k) {
			out = append(out, w)
		}
	}
	return out, nil
}

func (System) Tabs(ctx context.Context, b string) ([]model.TabInfo, error) {
	wins, err := browserWindows(b)
	if err != nil {
		return nil, err
	}
	var out []model.TabInfo
	for _, w := range wins {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		cw, err := device.ReadChromeWindow(w.ID)
		if err != nil {
			continue // cửa sổ vừa đóng / không đọc được: bỏ qua, như popup
		}
		kind := winBrowser(w)
		if len(cw.Tabs) == 0 {
			if t, ok := fullscreenTab(w, kind); ok {
				out = append(out, t)
			}
			continue
		}
		for i, t := range cw.Tabs {
			ti := model.TabInfo{Browser: kind, ID: t.ID, Window: int64(w.ID), Index: i + 1, Title: cleanTabTitle(t.Name), Active: t.Selected}
			if t.Selected {
				ti.URL, ti.Loading = omniboxURL(cw.Address), cw.Loading
			}
			out = append(out, ti)
		}
	}
	return out, nil
}

// fullscreenTab – cửa sổ toàn màn hình (F11) ẩn thanh tab: coi cả cửa sổ là một tab (id = cửa sổ) để node Chuẩn hoá
// còn tìm thấy mà thoát toàn màn hình. Cửa sổ không phủ màn (popup, DevTools) → không phải tab.
func fullscreenTab(w model.WindowInfo, kind string) (model.TabInfo, bool) {
	if w.Minimized || !coversDisplay(w.Box) {
		return model.TabInfo{}, false
	}
	title := w.Title
	if i := strings.LastIndex(title, " - "); i > 0 {
		title = title[:i] // bỏ " - Google Chrome"
	}
	return model.TabInfo{Browser: kind, ID: int64(w.ID), Window: int64(w.ID), Index: 1, Title: title, Active: true}, true
}

// coversDisplay – khung phủ kín một màn hình (toàn màn hình thật, không phải phóng to chừa thanh tác vụ).
func coversDisplay(r model.Rect) bool {
	cx, cy := r.X+r.W/2, r.Y+r.H/2
	for _, d := range device.Displays() {
		if cx >= d.X && cx < d.X+d.W && cy >= d.Y && cy < d.Y+d.H {
			return r.W >= d.W && r.H >= d.H
		}
	}
	return false
}

func tabErr(err error) error {
	if errors.Is(err, device.ErrChromeTabGone) || errors.Is(err, device.ErrWindowGone) {
		return ErrTabGone
	}
	return err
}

// selectTab chọn tab t trong cửa sổ của nó (không đưa cửa sổ lên trước). Tab "toàn màn hình" (id = cửa sổ) không cần chọn.
func selectTab(t model.TabInfo) error {
	if t.ID == t.Window {
		return nil
	}
	return tabErr(device.SelectChromeTab(uint64(t.Window), t.ID))
}

func (System) Activate(_ context.Context, t model.TabInfo) error {
	if err := selectTab(t); err != nil {
		return err
	}
	return tabErr(device.SystemWindows{}.Focus(uint64(t.Window)))
}

func (s System) NewTab(ctx context.Context, b, url string) (model.TabInfo, error) {
	wins, err := browserWindows(b)
	if err != nil {
		return model.TabInfo{}, err
	}
	if len(wins) == 0 {
		return model.TabInfo{}, ErrNotRunning
	}
	kind := winBrowser(wins[0])
	before, err := s.Tabs(ctx, kind)
	if err != nil {
		return model.TabInfo{}, err
	}
	if url == "" {
		url = "about:blank"
	}
	// exe đang chạy nhận lệnh rồi chuyển cho tiến trình có sẵn (mở tab ở cửa sổ gần nhất) và tự thoát
	cmd := exec.Command(wins[0].AppID, "--new-tab", url)
	if err := cmd.Start(); err != nil {
		return model.TabInfo{}, err
	}
	go cmd.Wait()
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		if err := sleepCtx(ctx, 150*time.Millisecond); err != nil {
			return model.TabInfo{}, err
		}
		tabs, err := s.Tabs(ctx, kind)
		if err != nil {
			return model.TabInfo{}, err
		}
		for _, t := range tabs {
			if t.Active && !slices.ContainsFunc(before, func(x model.TabInfo) bool { return x.ID == t.ID }) {
				return t, nil
			}
		}
	}
	return model.TabInfo{}, errors.New("trình duyệt chưa mở tab mới sau 8 giây")
}

func (System) Close(_ context.Context, t model.TabInfo) error {
	if t.ID == t.Window {
		return errors.New("cửa sổ đang toàn màn hình – thoát toàn màn hình (node Chuẩn hoá trình duyệt) trước khi đóng tab")
	}
	return tabErr(device.CloseChromeTab(uint64(t.Window), t.ID))
}

func (System) Nav(ctx context.Context, t model.TabInfo, op string) error {
	if err := selectTab(t); err != nil {
		return err
	}
	if err := sleepCtx(ctx, 150*time.Millisecond); err != nil { // Chrome cập nhật nút theo tab mới
		return err
	}
	return tabErr(device.ChromeNav(uint64(t.Window), op))
}

func (s System) Go(ctx context.Context, t model.TabInfo, url string) error {
	if err := s.Activate(ctx, t); err != nil {
		return err
	}
	if err := sleepCtx(ctx, 150*time.Millisecond); err != nil {
		return err
	}
	before, _ := device.ReadChromeWindow(uint64(t.Window))
	if err := device.SetChromeAddress(uint64(t.Window), url); err != nil {
		return tabErr(err)
	}
	if err := sleepCtx(ctx, 100*time.Millisecond); err != nil {
		return err
	}
	if err := tapKeys("enter"); err != nil {
		return err
	}
	// Trang cũ còn nằm trong cây tới khi trang mới được nhận → chờ thấy điều hướng bắt đầu (Document mất / đổi URL)
	// rồi mới trả, để Loading của lần đọc kế không báo "đã xong" nhầm. Cùng URL / không thấy trong 2 giây: trả luôn.
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); {
		if err := sleepCtx(ctx, 80*time.Millisecond); err != nil {
			return err
		}
		if cw, err := device.ReadChromeWindow(uint64(t.Window)); err == nil && (cw.Loading || cw.DocURL != before.DocURL) {
			break
		}
	}
	return nil
}

func (System) Frame(_ context.Context, t model.TabInfo) (model.TabFrame, error) {
	wins, err := device.SystemWindows{}.List()
	if err != nil {
		return model.TabFrame{}, err
	}
	i := slices.IndexFunc(wins, func(w model.WindowInfo) bool { return int64(w.ID) == t.Window })
	if i < 0 {
		return model.TabFrame{}, ErrTabGone
	}
	return model.TabFrame{Box: wins[i].Box, Fullscreen: coversDisplay(wins[i].Box)}, nil
}

// Normalize – Activate đã đưa cửa sổ lên trước. Thứ tự như macOS: thoát toàn màn hình (F11) → đặt khung → Ctrl+0 → Esc.
func (s System) Normalize(ctx context.Context, t model.TabInfo, o model.NormalizeOpts) (bool, error) {
	was := false
	if o.Fullscreen {
		f, err := s.Frame(ctx, t)
		if err != nil {
			return false, err
		}
		if f.Fullscreen {
			was = true
			if err := tapKeys("f11"); err != nil {
				return was, err
			}
			if err := sleepCtx(ctx, 1200*time.Millisecond); err != nil { // chờ hiệu ứng thoát toàn màn hình
				return was, err
			}
		}
	}
	if o.Bounds != nil {
		if err := (device.SystemWindows{}).SetBounds(uint64(t.Window), *o.Bounds); err != nil {
			return was, tabErr(err)
		}
	}
	if o.Zoom {
		if err := tapKeys("ctrl", "0"); err != nil {
			return was, err
		}
	}
	if o.Popups {
		if err := tapKeys("esc"); err != nil {
			return was, err
		}
	}
	return was, nil
}
