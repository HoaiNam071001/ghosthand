package wisp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// closeByUser – mã đóng Wisp gửi khi người dùng bấm chip Ghosthand / tắt cổng: không tự nối lại.
const closeByUser = 4000

// CmdError – Wisp trả ok:false: mã trong danh sách của cổng (not_found, covered, no_tab, bad_args, timeout…).
type CmdError struct {
	Code   string `json:"code"`
	Detail string `json:"detail"`
}

func (e *CmdError) Error() string { return e.Code + ": " + e.Detail }

// codeOf – mã lỗi Wisp của err ("" = không phải lỗi lệnh).
func codeOf(err error) string {
	var ce *CmdError
	if errors.As(err, &ce) {
		return ce.Code
	}
	return ""
}

// ErrClosed – kết nối đã đóng; ByUser = người dùng ngắt trong Wisp.
type ErrClosed struct{ ByUser bool }

func (e *ErrClosed) Error() string {
	if e.ByUser {
		return "đã ngắt Ghosthand trong Wisp"
	}
	return "mất kết nối với Wisp"
}

type reply struct {
	ID     int64           `json:"id"`
	OK     bool            `json:"ok"`
	Result json.RawMessage `json:"result"`
	Error  *CmdError       `json:"error"`
	Event  string          `json:"event"`
	Data   json.RawMessage `json:"data"`
}

// Conn – một kết nối WebSocket tới cổng Wisp: nhiều lệnh (Wisp chạy lần lượt), sự kiện đẩy gọi onEvent (từ goroutine đọc).
type Conn struct {
	ws      *websocket.Conn
	wmu     sync.Mutex // gorilla: một người ghi một lúc
	mu      sync.Mutex
	seq     int64
	waiting map[int64]chan reply
	closed  error
	onEvent func(name string, data json.RawMessage)
}

// Dial nối cổng theo info. onEvent có thể nil.
func Dial(ctx context.Context, in Info, onEvent func(string, json.RawMessage)) (*Conn, error) {
	h := http.Header{"Authorization": {"Bearer " + in.Token}}
	d := websocket.Dialer{HandshakeTimeout: 5 * time.Second}
	ws, resp, err := d.DialContext(ctx, fmt.Sprintf("ws://127.0.0.1:%d", in.Port), h)
	if resp != nil && resp.Body != nil {
		resp.Body.Close()
	}
	if err != nil {
		if resp != nil && resp.StatusCode == http.StatusUnauthorized {
			return nil, errors.New("Wisp từ chối token – mở lại Wisp")
		}
		return nil, err
	}
	c := &Conn{ws: ws, waiting: map[int64]chan reply{}, onEvent: onEvent}
	go c.read()
	return c, nil
}

func (c *Conn) read() {
	for {
		var r reply
		if err := c.ws.ReadJSON(&r); err != nil {
			var ce *websocket.CloseError
			c.fail(&ErrClosed{ByUser: errors.As(err, &ce) && ce.Code == closeByUser})
			return
		}
		if r.Event != "" {
			if c.onEvent != nil {
				c.onEvent(r.Event, r.Data)
			}
			continue
		}
		c.mu.Lock()
		ch := c.waiting[r.ID]
		delete(c.waiting, r.ID)
		c.mu.Unlock()
		if ch != nil {
			ch <- r
		}
	}
}

// fail đóng mọi lệnh đang chờ bằng err.
func (c *Conn) fail(err error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed == nil {
		c.closed = err
	}
	for id, ch := range c.waiting {
		close(ch)
		delete(c.waiting, id)
	}
}

// Err – lỗi đã đóng kết nối (nil = còn dùng được).
func (c *Conn) Err() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.closed
}

// Call gửi lệnh cmd, chờ trả lời và giải kết quả vào out (nil = bỏ qua). Lỗi lệnh → *CmdError.
func (c *Conn) Call(ctx context.Context, cmd string, args any, out any) error {
	ch := make(chan reply, 1)
	c.mu.Lock()
	if c.closed != nil {
		c.mu.Unlock()
		return c.closed
	}
	c.seq++
	id := c.seq
	c.waiting[id] = ch
	c.mu.Unlock()
	c.wmu.Lock()
	err := c.ws.WriteJSON(map[string]any{"id": id, "cmd": cmd, "args": args})
	c.wmu.Unlock()
	if err != nil {
		c.drop(id)
		return &ErrClosed{}
	}
	select {
	case r, ok := <-ch:
		if !ok {
			return c.Err()
		}
		if !r.OK {
			if r.Error == nil {
				return &CmdError{Code: "internal", Detail: "Wisp trả lỗi không rõ"}
			}
			return r.Error
		}
		if out != nil && len(r.Result) > 0 {
			return json.Unmarshal(r.Result, out)
		}
		return nil
	case <-ctx.Done():
		c.drop(id) // Wisp vẫn chạy nốt lệnh; trả lời tới sau thì bỏ
		return ctx.Err()
	}
}

func (c *Conn) drop(id int64) {
	c.mu.Lock()
	delete(c.waiting, id)
	c.mu.Unlock()
}

// Close đóng kết nối (Wisp thấy client rời, không đổi gì trên trình duyệt).
func (c *Conn) Close() {
	c.wmu.Lock()
	_ = c.ws.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""), time.Now().Add(time.Second))
	c.wmu.Unlock()
	_ = c.ws.Close()
}
