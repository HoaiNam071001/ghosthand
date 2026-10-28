// Package ai – nhà cung cấp AI cho node Hỏi AI (bước 31d). Interface nhỏ để engine không biết hãng nào; bản giả cho
// test ở aitest. Key chỉ đi trong header, không bao giờ vào lời báo lỗi.
package ai

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

// Loại nhà cung cấp (Config.Kind).
const (
	KindOpenAI    = "openai"    // tương thích OpenAI (/chat/completions): OpenAI, Ollama, LM Studio, OpenRouter… – "" cũng là loại này
	KindAnthropic = "anthropic" // Messages API của Anthropic
	KindGemini    = "gemini"    // generateContent của Google Gemini
)

// Kinds – giá trị hợp lệ của node ("" = openai).
var Kinds = []string{"", KindOpenAI, KindAnthropic, KindGemini}

// Mặc định khi node để trống.
const (
	DefaultOpenAIURL    = "https://api.openai.com/v1"
	DefaultOpenAIModel  = "gpt-4o-mini"
	DefaultAnthropicURL = "https://api.anthropic.com"
	DefaultAnthropicMdl = "claude-sonnet-5-5"
	DefaultGeminiURL    = "https://generativelanguage.googleapis.com"
	DefaultGeminiModel  = "gemini-2.0-flash"
	maxTokens           = 1024
	readMax             = 4 << 20
)

// Config – cách nối tới một nhà cung cấp (đã thay biến).
type Config struct {
	Kind    string
	BaseURL string
	Model   string
	Key     string
}

// Request – một lượt hỏi.
type Request struct {
	Prompt string
	Images [][]byte // PNG
	JSON   bool     // yêu cầu trả JSON
}

// Provider – hỏi AI, trả chữ.
type Provider interface {
	Ask(ctx context.Context, r Request) (string, error)
}

// Error – lỗi do nhà cung cấp trả (Status ≠ 0) hoặc cấu hình sai (Status = 0).
type Error struct {
	Status int
	Msg    string
}

func (e *Error) Error() string { return e.Msg }

// Resolve điền mặc định + kiểm tra; không đụng mạng.
func (c Config) Resolve() (Config, error) {
	c.Kind = strings.TrimSpace(c.Kind)
	c.BaseURL = strings.TrimRight(strings.TrimSpace(c.BaseURL), "/")
	c.Model, c.Key = strings.TrimSpace(c.Model), strings.TrimSpace(c.Key)
	switch c.Kind {
	case "", KindOpenAI:
		c.Kind = KindOpenAI
		if c.BaseURL == "" {
			c.BaseURL = DefaultOpenAIURL
		}
		if c.Model == "" {
			c.Model = DefaultOpenAIModel
		}
		// Máy nhà (Ollama, LM Studio) không cần key; địa chỉ mặc định của OpenAI thì bắt buộc.
		if c.Key == "" && c.BaseURL == DefaultOpenAIURL {
			return c, &Error{Msg: "chưa có key OpenAI – ghi {{secret.<tên>}} vào ô Key (Cài đặt → Bí mật), hoặc đặt địa chỉ AI chạy trên máy"}
		}
	case KindAnthropic:
		if c.BaseURL == "" {
			c.BaseURL = DefaultAnthropicURL
		}
		if c.Model == "" {
			c.Model = DefaultAnthropicMdl
		}
		if c.Key == "" {
			return c, &Error{Msg: "chưa có key Anthropic – ghi {{secret.<tên>}} vào ô Key (Cài đặt → Bí mật)"}
		}
	case KindGemini:
		if c.BaseURL == "" {
			c.BaseURL = DefaultGeminiURL
		}
		if c.Model == "" {
			c.Model = DefaultGeminiModel
		}
		if c.Key == "" {
			return c, &Error{Msg: "chưa có key Gemini – ghi {{secret.<tên>}} vào ô Key (Cài đặt → Bí mật)"}
		}
	default:
		return c, &Error{Msg: fmt.Sprintf("nhà cung cấp AI không hợp lệ: %q (openai | anthropic | gemini)", c.Kind)}
	}
	if !strings.HasPrefix(c.BaseURL, "http://") && !strings.HasPrefix(c.BaseURL, "https://") {
		return c, &Error{Msg: fmt.Sprintf("địa chỉ AI “%s” sai dạng – cần http:// hoặc https://", c.BaseURL)}
	}
	return c, nil
}

// New dựng Provider thật từ Config đã Resolve.
func New(c Config, hc *http.Client) (Provider, error) {
	c, err := c.Resolve()
	if err != nil {
		return nil, err
	}
	if hc == nil {
		hc = http.DefaultClient
	}
	switch c.Kind {
	case KindAnthropic:
		return &anthropic{c: c, hc: hc}, nil
	case KindGemini:
		return &gemini{c: c, hc: hc}, nil
	}
	return &openai{c: c, hc: hc}, nil
}
