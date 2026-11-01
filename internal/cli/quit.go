package cli

import (
	"fmt"
	"io"
	"time"
)

// Quit – `ghosthand quit` (59 U2): bảo app đang mở thoát êm rồi chờ nó tắt hẳn (scripts/dev-install.sh thay app sau
// đó). App không mở = xong; app từ chối (đang chạy kịch bản / chưa lưu) = ExitFail kèm lý do.
func (c *Client) Quit(out, errOut io.Writer) int {
	if !c.try() {
		fmt.Fprintln(out, "App không mở.")
		return ExitOK
	}
	var res struct{}
	if err := c.do("POST", "/quit", nil, &res); err != nil {
		fmt.Fprintf(errOut, "App không thoát: %v\n", err)
		return ExitFail
	}
	wait := c.WaitApp
	if wait == 0 {
		wait = 10 * time.Second
	}
	for end := time.Now().Add(wait); time.Now().Before(end); time.Sleep(200 * time.Millisecond) {
		if !c.try() {
			fmt.Fprintln(out, "App đã thoát.")
			return ExitOK
		}
	}
	fmt.Fprintf(errOut, "App chưa tắt sau %s\n", wait)
	return ExitFail
}
