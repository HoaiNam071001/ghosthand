//go:build !darwin

package perm

import "errors"

// System: hệ điều hành này không có quyền nào cần cấp trước (mục tương đương của Windows làm sau – bước 48).
type System struct{}

func (System) IDs() []ID                  { return nil }
func (System) Probe(ID) (State, string)   { return NotNeeded, "" }
func (System) Request(ID) (State, string) { return NotNeeded, "" }
func (System) OpenSettings(ID) error      { return errors.New("không có System Settings để mở") }
