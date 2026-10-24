package device

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// MoveToTrash đổi tên file vào ~/.Trash (cùng ổ – không cần quyền gì; trùng tên thì thêm số như Finder). Kéo ra khỏi
// Thùng rác để khôi phục (không có "Put Back" vì Finder không ghi nhớ chỗ cũ). File ở ổ khác: nhờ Finder.
func (SystemTrash) MoveToTrash(paths []string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	trash := filepath.Join(home, ".Trash")
	var other []string
	for _, p := range paths {
		if err := os.Rename(p, freeName(trash, filepath.Base(p))); err != nil {
			other = append(other, p) // khác ổ / không đổi tên được
		}
	}
	if len(other) == 0 {
		return nil
	}
	args := []string{"-e", "on run argv", "-e", "repeat with p in argv", "-e",
		`tell application "Finder" to delete (POSIX file (p as text) as alias)`, "-e", "end repeat", "-e", "end run"}
	if _, err := run(exec.Command("osascript", append(args, other...)...), ""); err != nil {
		return finderErr("chuyển file vào Thùng rác", err)
	}
	return nil
}

// freeName – tên chưa có trong Thùng rác: a.png, a 2.png, a 3.png…
func freeName(dir, name string) string {
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	p := filepath.Join(dir, name)
	for i := 2; ; i++ {
		if _, err := os.Lstat(p); os.IsNotExist(err) {
			return p
		}
		p = filepath.Join(dir, fmt.Sprintf("%s %d%s", stem, i, ext))
	}
}

// EmptyTrash qua Finder – app không đọc được danh sách ~/.Trash nếu chưa có Full Disk Access.
func (SystemTrash) EmptyTrash() error {
	if _, err := run(exec.Command("osascript", "-e", `tell application "Finder" to empty trash`), ""); err != nil {
		return finderErr("dọn Thùng rác", err)
	}
	return nil
}

// finderErr – lỗi -1743: chưa cho app điều khiển Finder (System Settings → Privacy & Security → Automation).
func finderErr(what string, err error) error {
	if strings.Contains(err.Error(), "-1743") {
		return fmt.Errorf("%w để %s – System Settings → Privacy & Security → Automation, bật Finder cho app / terminal", ErrNoFinder, what)
	}
	return fmt.Errorf("không %s được: %w", what, err)
}
