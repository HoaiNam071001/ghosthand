package cli

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// Client nói chuyện với app qua API local. Trường hàm thay được trong test.
type Client struct {
	Info    func() (store.APIInfo, error) // đọc api.json
	Launch  func() error                  // mở app (không đối số)
	HTTP    *http.Client
	WaitApp time.Duration // chờ app vừa mở sẵn sàng tối đa
	// RestartWait – proxy --mcp mất kết nối giữa chừng: chờ app tự mở lại (cập nhật) tối đa bấy nhiêu rồi mới tự mở
	RestartWait time.Duration
	Interrupt   <-chan os.Signal // Ctrl+C → dừng lần chạy rồi thoát
	poll        time.Duration
	base        string
	token       string
}

// NewClient – client thật: api.json trong thư mục cấu hình, mở app bằng chính file exe này.
func NewClient(interrupt <-chan os.Signal) *Client {
	return &Client{Info: store.ReadAPIInfo, Launch: launchSelf, HTTP: &http.Client{}, WaitApp: 30 * time.Second, Interrupt: interrupt}
}

// connect tìm app đang mở; chưa có thì mở rồi chờ api.json + /health.
func (c *Client) connect(errOut io.Writer) error {
	if c.try() {
		return nil
	}
	fmt.Fprintln(errOut, "App chưa mở – đang mở…")
	if err := c.Launch(); err != nil {
		return fmt.Errorf("không mở được app: %w", err)
	}
	poll := c.poll
	if poll == 0 {
		poll = 300 * time.Millisecond
	}
	for end := time.Now().Add(c.WaitApp); time.Now().Before(end); time.Sleep(poll) {
		if c.try() {
			return nil
		}
	}
	return fmt.Errorf("app không phản hồi sau %s", c.WaitApp)
}

func (c *Client) try() bool {
	info, err := c.Info()
	if err != nil || info.Port == 0 {
		return false
	}
	c.base, c.token = fmt.Sprintf("http://127.0.0.1:%d", info.Port), info.Token
	res, err := c.HTTP.Get(c.base + "/health")
	if err != nil {
		return false
	}
	res.Body.Close()
	return res.StatusCode == 200
}

// apiError – lỗi app trả về (JSON {error, code, detail}).
type apiError struct {
	Msg  string `json:"error"`
	Code string `json:"code"`
}

func (e *apiError) Error() string { return e.Msg }

func (c *Client) do(method, path string, body, out any) error {
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, rd)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		e := &apiError{}
		if json.NewDecoder(res.Body).Decode(e) != nil || e.Msg == "" {
			e.Msg = res.Status
		}
		return e
	}
	return json.NewDecoder(res.Body).Decode(out)
}

// Run gửi lệnh chạy, theo dõi tới khi xong.
func (c *Client) Run(a Args, out, errOut io.Writer) int {
	if err := c.connect(errOut); err != nil {
		fmt.Fprintf(errOut, "Lỗi: %v\n", err)
		return ExitConnect
	}
	var started struct {
		RunID string `json:"runId"`
	}
	req := map[string]any{"path": a.Path, "preset": a.Preset, "values": a.Values, "countdown": a.Countdown, "source": session.SourceCLI}
	if err := c.do("POST", "/run", req, &started); err != nil {
		fmt.Fprintf(errOut, "Lỗi: %v\n", err)
		var ae *apiError
		if !errors.As(err, &ae) {
			return ExitConnect
		}
		return ExitFail
	}
	if a.NoWait {
		fmt.Fprintln(out, started.RunID)
		return ExitOK
	}
	fmt.Fprintf(out, "Đang chạy %s (runId %s) – Ctrl+C để dừng\n", a.Path, started.RunID)
	return c.follow(started.RunID, out, errOut)
}

// follow đọc SSE của lần chạy id, in mỗi node xong + kết quả cuối.
func (c *Client) follow(id string, out, errOut io.Writer) int {
	req, _ := http.NewRequest("GET", c.base+"/events?runId="+id, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)
	res, err := c.HTTP.Do(req)
	if err != nil {
		fmt.Fprintf(errOut, "Lỗi: mất kết nối với app: %v\n", err)
		return ExitConnect
	}
	defer res.Body.Close()
	type ev struct{ name, data string }
	evs := make(chan ev)
	go func() {
		defer close(evs)
		sc := bufio.NewScanner(res.Body)
		sc.Buffer(make([]byte, 64<<10), 8<<20)
		var name string
		for sc.Scan() {
			line := sc.Text()
			if n, ok := strings.CutPrefix(line, "event: "); ok {
				name = n
			} else if d, ok := strings.CutPrefix(line, "data: "); ok {
				evs <- ev{name, d}
			}
		}
	}()
	for {
		select {
		case <-c.Interrupt:
			fmt.Fprintln(errOut, "Đang dừng…")
			var r map[string]any
			_ = c.do("POST", "/stop", map[string]string{"runId": id}, &r)
		case e, ok := <-evs:
			if !ok {
				fmt.Fprintln(errOut, "Lỗi: app đóng kết nối trước khi chạy xong")
				return ExitConnect
			}
			if code, done := printEvent(e.name, e.data, out); done {
				return code
			}
		}
	}
}

// printEvent in một event; done = lần chạy đã kết thúc (trả mã thoát).
func printEvent(name, data string, out io.Writer) (int, bool) {
	switch name {
	case "engine:node":
		var r model.StepResult
		if json.Unmarshal([]byte(data), &r) == nil {
			line := fmt.Sprintf("  %s %s · %d ms", statusMark(r.Status), r.Ref, r.DurationMs)
			if r.Error != nil {
				line += " – " + r.Error.Message
			}
			fmt.Fprintln(out, line)
		}
	case "status", "run:ended":
		var st session.Status
		if json.Unmarshal([]byte(data), &st) != nil || !st.Done() {
			return 0, false
		}
		sec := float64(st.DurationMs) / 1000
		switch st.State {
		case session.StateSuccess:
			fmt.Fprintf(out, "Xong sau %.1f s\n", sec)
			return ExitOK, true
		case session.StateStopped:
			fmt.Fprintf(out, "Đã dừng sau %.1f s\n", sec)
		default:
			fmt.Fprintf(out, "Lỗi sau %.1f s: %s\n", sec, st.Error)
		}
		return ExitFail, true
	}
	return 0, false
}

func statusMark(s string) string {
	switch s {
	case model.StatusSuccess:
		return "✓"
	case model.StatusFail:
		return "✗"
	}
	return "·"
}
