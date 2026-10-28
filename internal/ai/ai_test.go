package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResolveDefaultsAndKeyRules(t *testing.T) {
	if _, err := (Config{}).Resolve(); err == nil {
		t.Fatal("OpenAI mặc định thiếu key phải lỗi")
	}
	c, err := Config{BaseURL: "http://localhost:11434/v1/", Model: "llama3"}.Resolve()
	if err != nil || c.BaseURL != "http://localhost:11434/v1" {
		t.Fatalf("máy nhà không cần key: %+v %v", c, err)
	}
	if _, err := (Config{Kind: KindAnthropic}).Resolve(); err == nil {
		t.Fatal("Anthropic thiếu key phải lỗi")
	}
	c, err = Config{Kind: KindAnthropic, Key: "k"}.Resolve()
	if err != nil || c.Model != DefaultAnthropicMdl {
		t.Fatalf("mặc định Anthropic: %+v %v", c, err)
	}
	if _, err := (Config{Kind: "gemini", Key: "k"}).Resolve(); err == nil {
		t.Fatal("loại lạ phải lỗi")
	}
	if _, err := (Config{BaseURL: "ftp://x", Key: "k"}).Resolve(); err == nil {
		t.Fatal("địa chỉ sai phải lỗi")
	}
}

func TestOpenAIAsk(t *testing.T) {
	var got map[string]any
	var auth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		b, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(b, &got)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"xin chào"}}]}`))
	}))
	defer srv.Close()
	p, err := New(Config{BaseURL: srv.URL, Model: "m", Key: "sk-1"}, srv.Client())
	if err != nil {
		t.Fatal(err)
	}
	out, err := p.Ask(context.Background(), Request{Prompt: "hi", Images: [][]byte{{1, 2}}, JSON: true})
	if err != nil || out != "xin chào" {
		t.Fatalf("out=%q err=%v", out, err)
	}
	if auth != "Bearer sk-1" || got["model"] != "m" || got["response_format"] == nil {
		t.Fatalf("request sai: auth=%q body=%v", auth, got)
	}
	if !strings.Contains(string(mustJSON(got)), "data:image/png;base64,AQI=") {
		t.Fatalf("thiếu ảnh: %v", got)
	}
}

func TestAnthropicAsk(t *testing.T) {
	var hdr http.Header
	var body string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hdr = r.Header.Clone()
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		_, _ = w.Write([]byte(`{"content":[{"type":"text","text":"{\"a\":1}"}]}`))
	}))
	defer srv.Close()
	p, _ := New(Config{Kind: KindAnthropic, BaseURL: srv.URL, Key: "sk-ant"}, srv.Client())
	out, err := p.Ask(context.Background(), Request{Prompt: "q", JSON: true})
	if err != nil || out != `{"a":1}` {
		t.Fatalf("out=%q err=%v", out, err)
	}
	if hdr.Get("x-api-key") != "sk-ant" || hdr.Get("anthropic-version") == "" || !strings.Contains(body, "JSON hợp lệ") {
		t.Fatalf("request sai: %v %s", hdr, body)
	}
}

func TestStatusErrorHasMessageNotKey(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(401)
		_, _ = w.Write([]byte(`{"error":{"message":"Incorrect API key"}}`))
	}))
	defer srv.Close()
	p, _ := New(Config{BaseURL: srv.URL, Key: "sk-secret"}, srv.Client())
	_, err := p.Ask(context.Background(), Request{Prompt: "x"})
	var ae *Error
	if !asErr(err, &ae) || ae.Status != 401 || !strings.Contains(ae.Msg, "Incorrect API key") || strings.Contains(ae.Msg, "sk-secret") {
		t.Fatalf("err=%v", err)
	}
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }

func asErr(err error, target **Error) bool {
	e, ok := err.(*Error)
	if ok {
		*target = e
	}
	return ok
}
