//go:build !darwin && !windows

package update

import "fmt"

func Installed() bool { return false }

func Install(string) error {
	return fmt.Errorf("hệ điều hành này chưa hỗ trợ tự cập nhật")
}
