package main

import "ghosthand/internal/store"

// Nhà cung cấp AI mặc định của node Hỏi AI (bước 31d, Cài đặt → Hỏi AI). Settings.AI đọc qua GetSettings.

// SetAISettings lưu nhà cung cấp AI mặc định (key chỉ nhận {{secret.<tên>}}).
func (a *App) SetAISettings(s store.AISettings) (store.AISettings, error) { return store.SetAI(s) }
