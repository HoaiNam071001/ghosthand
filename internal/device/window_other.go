//go:build !windows && !darwin

package device

import (
	"errors"

	"ghosthand/internal/model"
)

// Hệ điều hành khác (Linux): báo chưa hỗ trợ. Windows: window_windows.go · macOS: window_darwin.go.
var errNoWindows = errors.New("điều khiển cửa sổ / ứng dụng chỉ có trên macOS và Windows")

func (SystemWindows) List() ([]model.WindowInfo, error)  { return nil, errNoWindows }
func (SystemWindows) Focus(uint64) error                 { return errNoWindows }
func (SystemWindows) SetBounds(uint64, model.Rect) error { return errNoWindows }
func (SystemWindows) SetState(uint64, string) error      { return errNoWindows }
func (SystemWindows) Close(uint64) error                 { return errNoWindows }
func (SystemWindows) WorkArea(model.Rect) model.Rect     { return MainScreen() }
func (SystemApps) List() ([]model.AppInfo, error)        { return nil, errNoWindows }
func (SystemApps) Quit(int) error                        { return errNoWindows }
func (SystemApps) ForceQuit(int) error                   { return errNoWindows }
