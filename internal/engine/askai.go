package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image/png"
	"os"
	"strings"
	"time"

	"ghosthand/internal/ai"
	"ghosthand/internal/device"
	"ghosthand/internal/model"
	"ghosthand/internal/secrets"
)

// Node Hỏi AI (bước 31d): gửi câu hỏi (+ ảnh màn hình / file) cho nhà cung cấp AI, trả chữ hoặc JSON. Thêm vào flow là
// chủ ý của người soạn: ảnh gửi ra ngoài máy (trừ AI chạy trên máy) và có thể tốn tiền – inspector và Hướng dẫn nói rõ.
// Key chỉ nhận {{secret.<tên>}} (script/validate.go) nên không nằm trong file kịch bản; engine che mọi bí mật ở output.

const (
	askAITimeoutMs = 60000
	askAITextMax   = 64 << 10 // output text tối đa – nhật ký chạy lưu output
	askAIImageMax  = 8 << 20  // ảnh từ file tối đa
)

type aiErr struct{ msg string }

func (e *aiErr) Error() string { return e.msg }

func (e *Engine) provider(c ai.Config) (ai.Provider, error) {
	if e.aiNew != nil {
		return e.aiNew(c)
	}
	return ai.New(c, e.httpc)
}

func (e *Engine) askAI(ctx context.Context, s model.Step) (map[string]any, error) {
	prompt := strings.TrimSpace(s.Prompt)
	if prompt == "" {
		return nil, &invalidErr{"chưa nhập câu hỏi cho AI"}
	}
	images, err := e.askAIImages(ctx, s)
	if err != nil {
		return nil, err
	}
	p, err := e.provider(e.aiConfig(s))
	if err != nil {
		return e.askAIFallback(s, err)
	}
	timeout := s.TimeoutMs
	if timeout <= 0 {
		timeout = askAITimeoutMs
	}
	cctx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Millisecond)
	defer cancel()
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	wantJSON := s.AIFormat == model.AIFormatJSON
	text, err := p.Ask(cctx, ai.Request{Prompt: prompt, Images: images, JSON: wantJSON})
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err() // người dùng dừng
		}
		if errors.Is(err, context.DeadlineExceeded) {
			err = &networkErr{fmt.Sprintf("AI không trả lời sau %s", fmtSeconds(timeout))}
		}
		return e.askAIFallback(s, err)
	}
	return askAIOutput(text, wantJSON)
}

// aiConfig – ô trống của node lấy ở nhà cung cấp mặc định (Cài đặt). Chỉ khi cùng loại: node chọn Anthropic mà mặc định
// là Ollama thì không thừa hưởng địa chỉ / model của Ollama.
func (e *Engine) aiConfig(s model.Step) ai.Config {
	c := ai.Config{Kind: s.AIKind, BaseURL: s.AIBaseURL, Model: s.AIModel, Key: s.AIKey}
	d := e.aiDef
	if c.Kind == "" {
		c.Kind = d.Kind
	}
	if kindOf(c.Kind) != kindOf(d.Kind) {
		return c
	}
	if c.BaseURL == "" {
		c.BaseURL = d.BaseURL
	}
	if c.Model == "" {
		c.Model = d.Model
	}
	if c.Key == "" {
		c.Key = secrets.Expand(d.Key, e.rv.secrets)
	}
	return c
}

func kindOf(k string) string {
	if k == "" {
		return ai.KindOpenAI
	}
	return k
}

// askAIFallback – AI không dùng được (thiếu key, mất mạng, hết giờ) và node có aiFallback → đi tiếp với giá trị đó.
// Nhà cung cấp từ chối (key sai, hết hạn mức) vẫn là lỗi để người soạn thấy.
func (e *Engine) askAIFallback(s model.Step, err error) (map[string]any, error) {
	fallback := strings.TrimSpace(s.AIFallback) != ""
	wantJSON := s.AIFormat == model.AIFormatJSON
	var pe *ai.Error
	if errors.As(err, &pe) {
		switch {
		case pe.Status != 0:
			return nil, &aiErr{err.Error()}
		case fallback: // cấu hình thiếu (chưa có key…)
			return fallbackOutput(s.AIFallback, wantJSON, err)
		}
		return nil, &invalidErr{err.Error()}
	}
	var nw *networkErr
	if !errors.As(err, &nw) {
		nw = &networkErr{err.Error()}
	}
	if fallback {
		return fallbackOutput(s.AIFallback, wantJSON, nw)
	}
	return nil, nw
}

func fallbackOutput(text string, wantJSON bool, cause error) (map[string]any, error) {
	out, err := askAIOutput(text, wantJSON)
	if err != nil {
		return nil, &invalidErr{"aiFallback không phải JSON hợp lệ"}
	}
	out["skipped"], out["reason"] = true, cause.Error()
	return out, nil
}

// askAIOutput – text (cắt ở askAITextMax) + json khi yêu cầu. AI hay bọc JSON trong ```json … ``` nên gỡ hàng rào trước.
func askAIOutput(text string, wantJSON bool) (map[string]any, error) {
	text = strings.TrimSpace(text)
	out := map[string]any{"text": text}
	if wantJSON {
		var v any
		if err := json.Unmarshal([]byte(stripFence(text)), &v); err != nil {
			return nil, &aiErr{"AI không trả JSON hợp lệ: " + clipRunes(text, 200)}
		}
		out["json"] = normalizeJSON(v)
	}
	if len(text) > askAITextMax {
		out["text"] = strings.ToValidUTF8(text[:askAITextMax], "") + "…"
	}
	return out, nil
}

func stripFence(s string) string {
	t := strings.TrimSpace(s)
	if !strings.HasPrefix(t, "```") {
		return t
	}
	t = strings.TrimPrefix(t, "```")
	if i := strings.IndexByte(t, '\n'); i >= 0 {
		t = t[i+1:]
	}
	return strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(t), "```"))
}

func clipRunes(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}

// askAIImages – ảnh gửi kèm theo aiImage: chụp màn hình (cùng vùng như node Chụp màn hình) hoặc đọc file.
func (e *Engine) askAIImages(ctx context.Context, s model.Step) ([][]byte, error) {
	switch s.AIImage {
	case model.AIImageScreen:
		area, err := e.shotArea(s)
		if err != nil {
			return nil, err
		}
		if err := device.CaptureArea(area, e.displays); err != nil {
			return nil, err
		}
		if err := e.gate.wait(ctx); err != nil {
			return nil, err
		}
		img, err := e.scr.Capture(area)
		if err != nil {
			return nil, err
		}
		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			return nil, err
		}
		return [][]byte{buf.Bytes()}, nil
	case model.AIImageFile:
		p, err := userPath(s.FilePath)
		if err != nil {
			return nil, &invalidErr{err.Error()}
		}
		st, err := os.Stat(p)
		switch {
		case errors.Is(err, os.ErrNotExist):
			return nil, &notFoundErr{msg: fmt.Sprintf("không thấy file ảnh “%s”", p)}
		case err != nil:
			return nil, err
		case st.Size() > askAIImageMax:
			return nil, &invalidErr{fmt.Sprintf("ảnh “%s” lớn quá %d MB", p, askAIImageMax>>20)}
		}
		b, err := os.ReadFile(p)
		return [][]byte{b}, err
	}
	return nil, nil
}
