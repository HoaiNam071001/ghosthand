package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// anthropic – Messages API. API không có chế độ JSON riêng nên yêu cầu JSON được nói trong câu hỏi.
type anthropic struct {
	c  Config
	hc *http.Client
}

func (a *anthropic) Ask(ctx context.Context, r Request) (string, error) {
	content := []map[string]any{}
	for _, img := range r.Images {
		content = append(content, map[string]any{
			"type":   "image",
			"source": map[string]string{"type": "base64", "media_type": "image/png", "data": base64.StdEncoding.EncodeToString(img)},
		})
	}
	prompt := r.Prompt
	if r.JSON {
		prompt += "\n\nChỉ trả về một giá trị JSON hợp lệ, không thêm chữ nào khác."
	}
	content = append(content, map[string]any{"type": "text", "text": prompt})
	body := map[string]any{
		"model":      a.c.Model,
		"max_tokens": maxTokens,
		"messages":   []map[string]any{{"role": "user", "content": content}},
	}
	header := map[string]string{"x-api-key": a.c.Key, "anthropic-version": "2023-06-01"}
	data, err := post(ctx, a.hc, a.c.BaseURL+"/v1/messages", header, body)
	if err != nil {
		return "", err
	}
	var resp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", errors.New("phản hồi AI không đúng dạng Messages API")
	}
	var sb strings.Builder
	for _, c := range resp.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	if sb.Len() == 0 {
		return "", errors.New("AI không trả chữ nào")
	}
	return sb.String(), nil
}
