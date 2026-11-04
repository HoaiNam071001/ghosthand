package cli

import (
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"ghosthand/internal/batch"
)

// `ghosthand test …` (bước 61 M2): chạy nhiều kịch bản một lượt trong app đang mở, in mỗi kịch bản một dòng khi xong,
// cuối cùng là dòng tổng. Mã thoát 0 = mọi kịch bản qua.

const testUsage = `  ghosthand test <file.json | thư mục | mau:<id>>… [--samples] [--all] [--level N] [--preset "Tên bộ"] [--set KEY=GIÁ_TRỊ]…

  test         chạy lần lượt, kịch bản lỗi thì ghi lại rồi chạy tiếp; F8 / Ctrl+C dừng cả lượt. Không ghi Lịch sử chạy
  --samples    thêm mọi kịch bản mẫu chạy trên sân thử (bỏ mẫu web thật / cần chuẩn bị tay); --all lấy cả các mẫu đó
  --level      chỉ mẫu mức 1 / 2 / 3
  --preset     (test) kịch bản nào có bộ giá trị tên này thì dùng, không có thì dùng mặc định
  --set        (test) chỉ áp cho kịch bản có input KEY`

// ParseTest đọc `test <đích>… [cờ]…`; đường dẫn đổi thành tuyệt đối theo thư mục đang đứng.
func ParseTest(args []string) (batch.Request, error) {
	req := batch.Request{Values: map[string]any{}}
	rest := args[1:]
	for i := 0; i < len(rest); i++ {
		arg := rest[i]
		name, val, hasVal := strings.Cut(arg, "=")
		if !strings.HasPrefix(arg, "--") {
			if !strings.HasPrefix(arg, batch.SamplePrefix) {
				if abs, err := filepath.Abs(arg); err == nil {
					arg = abs
				}
			}
			req.Targets = append(req.Targets, arg)
			continue
		}
		switch name {
		case "--samples":
			req.Samples = true
			continue
		case "--all":
			req.All = true
			continue
		case "--help":
			return req, errHelp
		}
		if !hasVal {
			if i+1 >= len(rest) {
				return req, fmt.Errorf("%s thiếu giá trị", name)
			}
			i++
			val = rest[i]
		}
		switch name {
		case "--preset":
			req.Preset = val
		case "--set":
			k, v, ok := strings.Cut(val, "=")
			if !ok || k == "" {
				return req, fmt.Errorf("--set cần dạng KEY=GIÁ_TRỊ, nhận %q", val)
			}
			req.Values[k] = v
		case "--level":
			n, err := strconv.Atoi(val)
			if err != nil || n < 1 || n > 3 {
				return req, fmt.Errorf("--level cần 1, 2 hoặc 3, nhận %q", val)
			}
			req.Level = n
		default:
			return req, fmt.Errorf("không biết cờ %s", name)
		}
	}
	if len(req.Targets) == 0 && !req.Samples && !req.All && req.Level == 0 {
		return req, errors.New("thiếu kịch bản – cho file / thư mục / mau:<id> hoặc --samples")
	}
	return req, nil
}

// Test gửi lượt sang app, hỏi tiến độ tới khi xong; in dòng mới mỗi khi có kịch bản chạy xong.
func (c *Client) Test(req batch.Request, out, errOut io.Writer) int {
	if err := c.connect(errOut); err != nil {
		fmt.Fprintf(errOut, "Lỗi: %v\n", err)
		return ExitConnect
	}
	var started struct {
		ID    string   `json:"batchId"`
		Names []string `json:"names"`
	}
	if err := c.do("POST", "/batch", req, &started); err != nil {
		fmt.Fprintf(errOut, "Lỗi: %v\n", err)
		var ae *apiError
		if !errors.As(err, &ae) {
			return ExitConnect
		}
		return ExitFail
	}
	fmt.Fprintf(out, "Chạy %d kịch bản – F8 / Ctrl+C để dừng cả lượt\n", len(started.Names))
	width := batch.NameWidth(started.Names)
	poll := c.poll
	if poll == 0 {
		poll = 500 * time.Millisecond
	}
	printed := 0
	for {
		select {
		case <-c.Interrupt:
			fmt.Fprintln(errOut, "Đang dừng…")
			var r map[string]any
			_ = c.do("POST", "/batch/stop", map[string]string{"batchId": started.ID}, &r)
		case <-time.After(poll):
		}
		var st batch.Status
		if err := c.do("GET", "/batch?id="+started.ID, nil, &st); err != nil {
			fmt.Fprintf(errOut, "Lỗi: mất kết nối với app: %v\n", err)
			return ExitConnect
		}
		for ; printed < len(st.Rows); printed++ {
			fmt.Fprintln(out, batch.RowLine(st.Rows[printed], width))
		}
		if st.Done() {
			fmt.Fprintln(out, batch.Summary(st))
			if st.Failed() > 0 || st.State == batch.StateStopped {
				return ExitFail
			}
			return ExitOK
		}
	}
}
