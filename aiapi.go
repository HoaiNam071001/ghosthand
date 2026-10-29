package main

import (
	"context"

	"ghosthand/internal/ai"
	"ghosthand/internal/model"
	"ghosthand/internal/secrets"
	"ghosthand/internal/store"
)

// Nhà cung cấp AI mặc định của node Hỏi AI (bước 31d, Cài đặt → Hỏi AI). Settings.AI đọc qua GetSettings.

// SetAISettings lưu nhà cung cấp AI mặc định (key chỉ nhận {{secret.<tên>}}).
func (a *App) SetAISettings(s store.AISettings) (store.AISettings, error) { return store.SetAI(s) }

// aiOptions – nhà cung cấp AI mặc định + giá trị bí mật (key mặc định, key riêng của node s) cho engine dựng ở App
// (nút Thử tìm bằng AI; lượt chạy thật do session lo).
func aiOptions(s model.Step) (ai.Config, map[string]string) {
	def := store.CurrentSettings().AI.Config()
	names := secrets.Refs(def.Key, s.AIKey)
	if len(names) == 0 {
		return def, nil
	}
	vals, _, _ := store.Secrets().Resolve(context.Background(), names) // thiếu bí mật: engine báo chưa có key
	return def, vals
}
