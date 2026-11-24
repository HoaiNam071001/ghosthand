package wisp

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"runtime"
	"strconv"
	"sync"

	"ghosthand/internal/web"
)

// Browser – web.Browser trên Wisp. Một bản cho mỗi lần chạy; nối lười ở lệnh đầu (kịch bản không có node web thì
// không đụng Wisp). Mọi thao tác là lệnh của cổng (Wisp bấm / gõ bằng sự kiện thật trong trình duyệt) – NativeInput.
type Browser struct {
	dir    string
	launch bool // Wisp chưa mở thì tự mở rồi chờ (Cài đặt chọn Wisp); false = báo lỗi (Tự động đã thấy Wisp mở sẵn)

	mu      sync.Mutex
	conn    *Conn
	prefer  int                 // tab node Mở vừa mở – tab mặc định của node web sau
	last    elem                // phần tử của lần Find gần nhất (BgClick / BgType / Focused dùng)
	lastTab int                 // tab của lần Find gần nhất
	dialogs map[int]*web.Dialog // hộp thoại JS đang mở theo tab (sự kiện dialog)
	navs    map[int]int         // số lần tab chuyển trang (sự kiện navigate) – Mark / Settle
	onPick  func(PickEvent)     // chọn element (pick.go); nil = không đăng ký sự kiện pick
}

var _ web.Browser = (*Browser)(nil)

// New – Browser trên Wisp ở thư mục dữ liệu mặc định (DataDir).
func New(launch bool) *Browser {
	return &Browser{dir: DataDir(runtime.GOOS, os.Getenv), launch: launch, dialogs: map[int]*web.Dialog{}, navs: map[int]int{}}
}

// Running – Wisp đang mở và bật cổng (ghosthand.json hợp lệ, pid còn chạy) – Cài đặt Tự động chọn Wisp.
func Running() bool {
	_, err := ReadInfo(DataDir(runtime.GOOS, os.Getenv), Alive)
	return err == nil
}

// NativeInput – engine chạy node web như chạy nền: không chuột / phím thật, không thử hover (web.Native).
func (b *Browser) NativeInput() bool { return true }

// client – kết nối hiện tại; chưa có / đã rớt thì nối (lại). Người dùng đã ngắt trong Wisp thì không nối lại.
func (b *Browser) client(ctx context.Context) (*Conn, error) {
	b.mu.Lock()
	c := b.conn
	b.mu.Unlock()
	if c != nil {
		err := c.Err()
		if err == nil {
			return c, nil
		}
		var ec *ErrClosed
		if errors.As(err, &ec) && ec.ByUser {
			return nil, &web.BrowserError{Msg: "đã ngắt Ghosthand trong Wisp (chip Ghosthand trên thanh công cụ) – chạy lại kịch bản để nối lại"}
		}
	}
	in, err := ReadInfo(b.dir, Alive)
	if errors.Is(err, ErrNotRunning) && b.launch {
		if err = launchApp(); err == nil {
			in, err = waitInfo(ctx, b.dir, launchWait)
		}
	}
	if err != nil {
		return nil, notRunningErr(err)
	}
	c, err = Dial(ctx, in, b.onEvent)
	if err != nil {
		return nil, &web.BrowserError{Msg: "không nối được cổng Wisp: " + err.Error()}
	}
	events := []string{"navigate", "popup", "dialog"}
	b.mu.Lock()
	if b.onPick != nil {
		events = append(events, "pick")
	}
	b.mu.Unlock()
	if err := c.Call(ctx, "subscribe", map[string]any{"events": events}, nil); err != nil {
		c.Close()
		return nil, wispErr("subscribe", err)
	}
	b.mu.Lock()
	b.conn = c
	b.mu.Unlock()
	return c, nil
}

func notRunningErr(err error) error {
	if errors.Is(err, ErrNotRunning) {
		return &web.BrowserError{Msg: "Wisp chưa mở hoặc cổng Ghosthand đang tắt – mở Wisp, bật menu ⋮ → Tuỳ chọn → Cổng Ghosthand"}
	}
	var be *web.BrowserError
	if errors.As(err, &be) {
		return err
	}
	return &web.BrowserError{Msg: err.Error()}
}

// wispErr – lỗi lệnh Wisp → lỗi engine: selector sai cú pháp = QueryError (invalid_input), còn lại BrowserError.
func wispErr(what string, err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	var ce *CmdError
	if errors.As(err, &ce) && ce.Code == "bad_args" {
		return &web.QueryError{Msg: ce.Detail}
	}
	return &web.BrowserError{Msg: "Wisp " + what + ": " + err.Error()}
}

type dialogEvent struct {
	Tab     int    `json:"tab"`
	Type    string `json:"type"`
	Message string `json:"message"`
	URL     string `json:"url"`
	Closed  bool   `json:"closed"`
}

func (b *Browser) onEvent(name string, data json.RawMessage) {
	if name == "pick" {
		b.firePick(data)
		return
	}
	var d dialogEvent
	if json.Unmarshal(data, &d) != nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	switch name {
	case "navigate":
		b.navs[d.Tab]++
	case "dialog":
		if d.Closed {
			delete(b.dialogs, d.Tab)
		} else {
			b.dialogs[d.Tab] = &web.Dialog{Type: d.Type, Message: d.Message, URL: d.URL}
		}
	}
}

// call – gọi lệnh trên kết nối hiện tại.
func (b *Browser) call(ctx context.Context, cmd string, args map[string]any, out any) error {
	c, err := b.client(ctx)
	if err != nil {
		return err
	}
	return c.Call(ctx, cmd, args, out)
}

// tabFor – tab theo bộ lọc (Query.Tab); ok = false khi không có tab khớp.
func (b *Browser) tabFor(ctx context.Context, filter string) (tabEntry, []tabEntry, bool, error) {
	var tabs []tabEntry
	if err := b.call(ctx, "tabs", map[string]any{}, &tabs); err != nil {
		return tabEntry{}, nil, false, wispErr("tabs", err)
	}
	b.mu.Lock()
	prefer := b.prefer
	b.mu.Unlock()
	t, ok := pickTab(tabs, filter, prefer)
	return t, tabs, ok, nil
}

// Open mở url ở tab mới; tab này thành tab mặc định của node web sau.
func (b *Browser) Open(ctx context.Context, url string) error {
	var r struct {
		Tab int `json:"tab"`
	}
	if err := b.call(ctx, "open", map[string]any{"url": url, "newTab": true}, &r); err != nil {
		return wispErr("mở trang", err)
	}
	b.mu.Lock()
	b.prefer = r.Tab
	b.mu.Unlock()
	return nil
}

// Close nhả kết nối (Wisp và các tab giữ nguyên).
func (b *Browser) Close() {
	b.mu.Lock()
	c := b.conn
	b.conn = nil
	b.mu.Unlock()
	if c != nil {
		c.Close()
	}
}

func tabArg(id int) string { return strconv.Itoa(id) }

// State – trạng thái Wisp cho Cài đặt: Ready = đang mở + bật cổng, Installed = có app trên máy.
type State struct {
	Ready     bool   `json:"ready"`
	Installed bool   `json:"installed"`
	Version   string `json:"version"`
	Problem   string `json:"problem"` // chưa sẵn sàng: vì sao + cách sửa
}

// Status – đọc ghosthand.json (không nối cổng, không mở app).
func Status() State {
	st := State{Installed: installed()}
	in, err := ReadInfo(DataDir(runtime.GOOS, os.Getenv), Alive)
	switch {
	case err == nil:
		st.Ready, st.Version = true, in.Version
	case errors.Is(err, ErrOldAPI):
		st.Version, st.Problem = in.Version, err.Error()
	case st.Installed:
		st.Problem = "Wisp chưa mở hoặc cổng Ghosthand đang tắt (menu ⋮ → Tuỳ chọn → Cổng Ghosthand)"
	default:
		st.Problem = "chưa cài Wisp trên máy này"
	}
	return st
}

func installed() bool {
	for _, p := range appPaths(runtime.GOOS, os.Getenv) {
		if _, err := os.Stat(p); err == nil {
			return true
		}
	}
	return false
}
