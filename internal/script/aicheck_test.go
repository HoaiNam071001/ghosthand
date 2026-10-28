package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestValidateAskAI(t *testing.T) {
	ok := model.Step{Type: model.StepAskAI, Prompt: "hi", AIKey: "{{secret.openai_key}}"}
	if err := validateAskAI(0, ok); err != nil {
		t.Fatalf("hợp lệ mà lỗi: %v", err)
	}
	for name, s := range map[string]model.Step{
		"thiếu câu hỏi": {Type: model.StepAskAI},
		"key dán thẳng": {Type: model.StepAskAI, Prompt: "x", AIKey: "sk-abc123"},
		"key lẫn chữ":   {Type: model.StepAskAI, Prompt: "x", AIKey: "Bearer {{secret.k}}"},
		"thiếu file":    {Type: model.StepAskAI, Prompt: "x", AIImage: model.AIImageFile},
	} {
		if err := validateAskAI(0, s); err == nil {
			t.Errorf("%s: phải lỗi", name)
		}
	}
}
