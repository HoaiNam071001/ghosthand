package cli

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ghosthand/internal/mcpsrv"
)

// `ghosthand --mcp` (bước 31): MCP qua stdio cho AI chỉ chạy được server dạng lệnh (Claude Desktop, Codex CLI…).
// Luôn chuyển tiếp sang /mcp của app đang mở (chưa mở thì mở) – quyền macOS tính theo tiến trình nên không tự chạy
// engine trong tiến trình con của AI. /mcp stateless + trả JSON nên mỗi dòng JSON-RPC = một POST.

// MCPFlag – đối số bật chế độ MCP stdio.
const MCPFlag = "--mcp"

// IsMCP – args (không gồm tên chương trình) là chế độ MCP stdio.
func IsMCP(args []string) bool { return len(args) == 1 && args[0] == MCPFlag }

// MCP đọc JSON-RPC từng dòng ở in, gửi sang app, ghi trả lời ra out (stdout chỉ chứa JSON-RPC; log ra errOut).
func (c *Client) MCP(in io.Reader, out, errOut io.Writer) int {
	sc := bufio.NewScanner(in)
	sc.Buffer(make([]byte, 0, 1<<20), 32<<20)
	connected, client := false, ""
	for sc.Scan() {
		line := bytes.TrimSpace(sc.Bytes())
		if len(line) == 0 {
			continue
		}
		if !connected {
			if err := c.connect(errOut); err != nil {
				writeRPCError(out, line, "không nối được app Ghosthand: "+err.Error())
				continue
			}
			connected = true
		}
		client = initClient(line, client)
		res, err := c.postMCP(line, client)
		var bad *mcpStatusErr
		if err != nil && !errors.As(err, &bad) && c.reconnect(errOut) == nil { // mất kết nối: app đang mở lại → gửi lại
			res, err = c.postMCP(line, client)
		}
		if err != nil {
			fmt.Fprintf(errOut, "MCP: %v\n", err)
			writeRPCError(out, line, err.Error())
			connected = false
			continue
		}
		if len(res) > 0 {
			out.Write(append(bytes.TrimSpace(res), '\n'))
		}
	}
	return ExitOK
}

// postMCP gửi một message; trả body (rỗng với notification – 202).
func (c *Client) postMCP(msg []byte, client string) ([]byte, error) {
	req, err := http.NewRequest("POST", c.base+"/mcp", bytes.NewReader(msg))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	if client != "" {
		req.Header.Set(mcpsrv.ClientHeader, client) // /mcp không giữ phiên – tên loại AI đi kèm mọi request (31b2)
	}
	req.Header.Set("Accept", "application/json, text/event-stream")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	switch {
	case res.StatusCode == http.StatusAccepted:
		return nil, nil
	case res.StatusCode != http.StatusOK:
		return nil, &mcpStatusErr{fmt.Sprintf("app trả %s: %s", res.Status, strings.TrimSpace(string(body)))}
	}
	return body, nil
}

// mcpStatusErr – app có trả lời nhưng báo lỗi (không phải mất kết nối – gửi lại vô ích).
type mcpStatusErr struct{ msg string }

func (e *mcpStatusErr) Error() string { return e.msg }

// reconnect sau khi mất kết nối (59 U4): app đang mở lại (cập nhật / dev-install – cổng + token mới) thì chờ nó lên
// (≤ RestartWait) thay vì trả lỗi cho AI; hết giờ vẫn chưa có thì mở app như lúc đầu.
func (c *Client) reconnect(errOut io.Writer) error {
	wait := c.RestartWait
	if wait == 0 {
		wait = 30 * time.Second
	}
	for end := time.Now().Add(wait); time.Now().Before(end); time.Sleep(300 * time.Millisecond) {
		if c.try() {
			return nil
		}
	}
	return c.connect(errOut)
}

// writeRPCError – trả lỗi JSON-RPC cho request (có id); notification thì bỏ qua.
func writeRPCError(out io.Writer, msg []byte, text string) {
	var head struct {
		ID json.RawMessage `json:"id"`
	}
	if json.Unmarshal(msg, &head) != nil || len(head.ID) == 0 {
		return
	}
	b, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": head.ID, "error": map[string]any{"code": -32000, "message": text}})
	out.Write(append(b, '\n'))
}

// initClient – tên client trong dòng initialize (clientInfo.name); dòng khác giữ tên cũ.
func initClient(msg []byte, cur string) string {
	var m struct {
		Method string `json:"method"`
		Params struct {
			ClientInfo struct {
				Name string `json:"name"`
			} `json:"clientInfo"`
		} `json:"params"`
	}
	if json.Unmarshal(msg, &m) != nil || m.Method != "initialize" || m.Params.ClientInfo.Name == "" {
		return cur
	}
	return m.Params.ClientInfo.Name
}
