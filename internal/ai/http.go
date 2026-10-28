package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// post gửi JSON, trả thân phản hồi. Lỗi mạng không kèm URL đầy đủ; mã ≠ 2xx → *Error kèm đoạn lời nhà cung cấp.
func post(ctx context.Context, hc *http.Client, url string, header map[string]string, body any) ([]byte, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return nil, &Error{Msg: "không tạo được request: " + err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Ghosthand")
	for k, v := range header {
		req.Header.Set(k, v)
	}
	resp, err := hc.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		var ue interface{ Unwrap() error }
		if errors.As(err, &ue) && ue.Unwrap() != nil {
			err = ue.Unwrap() // url.Error kèm URL đầy đủ – chỉ lấy lý do
		}
		return nil, fmt.Errorf("không gọi được AI: %w", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, readMax))
	if err != nil {
		return nil, fmt.Errorf("đứt kết nối khi đọc phản hồi AI: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, &Error{Status: resp.StatusCode, Msg: fmt.Sprintf("AI trả HTTP %s – %s", resp.Status, errorText(data))}
	}
	return data, nil
}

// errorText – lời lỗi gọn từ thân phản hồi ({"error":{"message":…}} của cả hai hãng, hoặc chữ thô).
func errorText(data []byte) string {
	var e struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	msg := strings.TrimSpace(string(data))
	if json.Unmarshal(data, &e) == nil && e.Error.Message != "" {
		msg = e.Error.Message
	}
	if r := []rune(msg); len(r) > 300 {
		msg = string(r[:300]) + "…"
	}
	return msg
}
