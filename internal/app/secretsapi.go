package app

import (
	"context"

	"ghosthand/internal/store"
)

// Kho bí mật (bước 43 S10, Cài đặt → Bí mật). Giá trị chỉ đi một chiều: frontend ghi vào Keychain / Credential
// Manager, không có method nào trả giá trị về (kể cả cho giao diện).

// ListSecrets – tên các bí mật đã lưu.
func (a *App) ListSecrets() []string { return store.Secrets().Names() }

// SetSecret lưu (hoặc đổi) giá trị bí mật name.
func (a *App) SetSecret(name, value string) error {
	return store.Secrets().Set(context.Background(), name, value)
}

// DeleteSecret xoá bí mật name.
func (a *App) DeleteSecret(name string) error {
	return store.Secrets().Delete(context.Background(), name)
}
