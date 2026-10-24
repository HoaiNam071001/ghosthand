package main

import (
	"errors"

	"ghosthand/internal/perm"
)

var errUnknownPerm = errors.New("quyền không tồn tại")

// Permissions: danh sách quyền hệ điều hành + trạng thái hiện tại (không bật hộp thoại nào).
func (a *App) Permissions() []perm.Item { return perm.Check(perm.System{}) }

// RequestPermission xin quyền id (bật hộp thoại của hệ điều hành nếu có) rồi trả dòng đã cập nhật.
func (a *App) RequestPermission(id string) (perm.Item, error) {
	it, ok := perm.Request(perm.System{}, perm.ID(id))
	if !ok {
		return perm.Item{}, errUnknownPerm
	}
	return it, nil
}

// OpenPermissionSettings mở đúng mục trong System Settings.
func (a *App) OpenPermissionSettings(id string) error { return perm.System{}.OpenSettings(perm.ID(id)) }
