package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
)

// openai – /chat/completions; ảnh gửi dạng data URL. JSON: response_format json_object (máy nhà không hiểu thì bỏ qua,
// engine vẫn tự kiểm tra kết quả có phải JSON).
type openai struct {
	c  Config
	hc *http.Client
}

func (o *openai) Ask(ctx context.Context, r Request) (string, error) {
	content := []map[string]any{{"type": "text", "text": r.Prompt}}
	for _, img := range r.Images {
		content = append(content, map[string]any{
			"type":      "image_url",
			"image_url": map[string]string{"url": "data:image/png;base64," + base64.StdEncoding.EncodeToString(img)},
		})
	}
	body := map[string]any{
		"model":    o.c.Model,
		"messages": []map[string]any{{"role": "user", "content": content}},
	}
	if r.JSON {
		body["response_format"] = map[string]string{"type": "json_object"}
	}
	header := map[string]string{}
	if o.c.Key != "" {
		header["Authorization"] = "Bearer " + o.c.Key
	}
	data, err := post(ctx, o.hc, o.c.BaseURL+"/chat/completions", header, body)
	if err != nil {
		return "", err
	}
	var resp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(data, &resp); err != nil || len(resp.Choices) == 0 {
		return "", errors.New("phản hồi AI không đúng dạng chat/completions")
	}
	return resp.Choices[0].Message.Content, nil
}
