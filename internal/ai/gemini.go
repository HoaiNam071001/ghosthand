package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
)

// gemini – generateContent của Google. Key đi trong header x-goog-api-key (không đặt trong URL để khỏi lọt vào lời báo lỗi).
type gemini struct {
	c  Config
	hc *http.Client
}

func (g *gemini) Ask(ctx context.Context, r Request) (string, error) {
	parts := []map[string]any{{"text": r.Prompt}}
	for _, img := range r.Images {
		parts = append(parts, map[string]any{"inline_data": map[string]string{"mime_type": "image/png", "data": base64.StdEncoding.EncodeToString(img)}})
	}
	body := map[string]any{"contents": []map[string]any{{"role": "user", "parts": parts}}}
	if r.JSON {
		body["generationConfig"] = map[string]string{"responseMimeType": "application/json"}
	}
	endpoint := g.c.BaseURL + "/v1beta/models/" + url.PathEscape(g.c.Model) + ":generateContent"
	data, err := post(ctx, g.hc, endpoint, map[string]string{"x-goog-api-key": g.c.Key}, body)
	if err != nil {
		return "", err
	}
	var resp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", errors.New("phản hồi AI không đúng dạng generateContent")
	}
	var sb strings.Builder
	if len(resp.Candidates) > 0 {
		for _, p := range resp.Candidates[0].Content.Parts {
			sb.WriteString(p.Text)
		}
	}
	if sb.Len() == 0 {
		return "", errors.New("AI không trả chữ nào (có thể bị bộ lọc an toàn chặn)")
	}
	return sb.String(), nil
}
