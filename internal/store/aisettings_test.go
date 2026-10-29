package store

import "testing"

func TestAISettingsCheck(t *testing.T) {
	for _, a := range []AISettings{{}, {Kind: "anthropic", Key: "{{secret.claude}}"}, {BaseURL: "http://localhost:11434/v1", Model: "llama3"}} {
		if err := a.Check(); err != nil {
			t.Errorf("%+v hợp lệ mà lỗi: %v", a, err)
		}
	}
	for name, a := range map[string]AISettings{
		"loại lạ":       {Kind: "xyz"},
		"key dán thẳng": {Key: "sk-abc123"},
		"key lẫn chữ":   {Key: "Bearer {{secret.k}}"},
		"hai key":       {Key: "{{secret.a}}{{secret.b}}"},
		"địa chỉ sai":   {BaseURL: "localhost:11434"},
	} {
		if a.Check() == nil {
			t.Errorf("%s: phải lỗi", name)
		}
	}
}
