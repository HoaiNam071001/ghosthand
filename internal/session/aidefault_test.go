package session

import (
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/store"
)

func TestAIDefaultSecret(t *testing.T) {
	def := store.AISettings{Key: "{{secret.claude}}"}
	ask := func(key string, on bool) model.Script {
		return model.Script{Steps: []model.Step{{Type: model.StepAskAI, AIKey: key, Enabled: on}}}
	}
	if got := aiDefaultSecret(ask("", true), def); got != "claude" {
		t.Errorf("node trống key phải dùng key mặc định: %q", got)
	}
	for name, sc := range map[string]model.Script{
		"node có key riêng": ask("{{secret.khac}}", true),
		"node tắt":          ask("", false),
		"không có askAI":    {Steps: []model.Step{{Type: model.StepWait, Enabled: true}}},
	} {
		if got := aiDefaultSecret(sc, def); got != "" {
			t.Errorf("%s: không được đòi key mặc định, có %q", name, got)
		}
	}
	if got := aiDefaultSecret(ask("", true), store.AISettings{}); got != "" {
		t.Errorf("chưa đặt key mặc định: %q", got)
	}
}
