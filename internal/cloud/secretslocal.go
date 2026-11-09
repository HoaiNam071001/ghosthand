package cloud

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sync"

	"ghosthand/internal/secrets"
)

// SecretsLocal – kho bí mật của máy dưới dạng cloud.Local cho đúng một đường dẫn SecretsPath (bước 54 C7).
// Nội dung đẩy lên là bản mã (secrets.Seal); cloud không bao giờ thấy giá trị thật. Chưa có bí mật nào = không có file
// (đẩy lần đầu không tạo file rỗng; xoá hết bí mật = xoá file trên cloud, vẫn qua bảng quyết định của engine).
//
// Chưa có cụm mật khẩu thì mọi thao tác báo ErrNoPassphrase – engine dừng, không coi là "máy không có bí mật" (sẽ xoá nhầm trên cloud).
type SecretsLocal struct {
	Store *secrets.Store
	Pass  string // cụm mật khẩu đồng bộ (người dùng nhập; không ghi vào cài đặt)
	// Salt của nhóm máy. Rỗng = máy đầu tiên: tạo mới ở lần Hashes đầu và gọi OnSalt để người gọi cất lại.
	// Máy vào nhóm sau: lấy salt từ bản mã trên cloud (secrets.VaultSalt) đặt vào đây TRƯỚC lần đồng bộ đầu,
	// nếu không hash khác nhau → bị coi là xung đột.
	Salt   []byte
	OnSalt func([]byte)

	mu sync.Mutex
}

var ErrNoPassphrase = errors.New("chưa nhập cụm mật khẩu đồng bộ bí mật")

func (l *SecretsLocal) ready() error {
	if l.Pass == "" {
		return ErrNoPassphrase
	}
	return nil
}

func (l *SecretsLocal) seal() ([]byte, bool, error) {
	names := l.Store.Names()
	if len(names) == 0 {
		return nil, false, nil
	}
	vals, missing, err := l.Store.Resolve(context.Background(), names)
	if err != nil {
		return nil, false, err
	}
	if len(missing) > 0 {
		return nil, false, fmt.Errorf("chỉ mục bí mật lệch kho (thiếu giá trị: %v)", missing)
	}
	l.mu.Lock()
	if len(l.Salt) == 0 {
		l.Salt = secrets.NewSalt()
		if l.OnSalt != nil {
			l.OnSalt(l.Salt)
		}
	}
	salt := l.Salt
	l.mu.Unlock()
	b, err := secrets.Seal(l.Pass, salt, vals)
	return b, err == nil, err
}

func (l *SecretsLocal) Hashes() (map[string]string, error) {
	if err := l.ready(); err != nil {
		return nil, err
	}
	b, ok, err := l.seal()
	if err != nil || !ok {
		return map[string]string{}, err
	}
	return map[string]string{SecretsPath: Hash(b)}, nil
}

func (l *SecretsLocal) Read(p string) ([]byte, error) {
	if p != SecretsPath {
		return nil, fmt.Errorf("không phải kho bí mật: %s", p)
	}
	if err := l.ready(); err != nil {
		return nil, err
	}
	b, ok, err := l.seal()
	if err == nil && !ok {
		return nil, errors.New("chưa có bí mật nào để đẩy")
	}
	return b, err
}

// Write thay kho ở máy bằng nội dung cloud (engine chỉ gọi khi người dùng / bảng quyết định đã chọn bản cloud).
// Giải mã xong mới đụng kho – sai cụm mật khẩu thì kho máy giữ nguyên.
func (l *SecretsLocal) Write(p string, data []byte) error {
	if p != SecretsPath {
		return fmt.Errorf("không phải kho bí mật: %s", p)
	}
	if err := l.ready(); err != nil {
		return err
	}
	vals, err := secrets.Open(l.Pass, data)
	if err != nil {
		return err
	}
	salt, err := secrets.VaultSalt(data)
	if err != nil {
		return err
	}
	ctx := context.Background()
	for _, n := range l.Store.Names() {
		if _, keep := vals[n]; !keep {
			if err := l.Store.Delete(ctx, n); err != nil {
				return err
			}
		}
	}
	names := make([]string, 0, len(vals))
	for n := range vals {
		names = append(names, n)
	}
	slices.Sort(names)
	for _, n := range names {
		if err := l.Store.Set(ctx, n, vals[n]); err != nil {
			return fmt.Errorf("không ghi được bí mật %q: %w", n, err)
		}
	}
	l.mu.Lock()
	changed := string(l.Salt) != string(salt)
	l.Salt = salt
	l.mu.Unlock()
	if changed && l.OnSalt != nil {
		l.OnSalt(salt)
	}
	return nil
}

func (l *SecretsLocal) Remove(p string) error {
	if p != SecretsPath {
		return fmt.Errorf("không phải kho bí mật: %s", p)
	}
	if err := l.ready(); err != nil {
		return err
	}
	for _, n := range l.Store.Names() {
		if err := l.Store.Delete(context.Background(), n); err != nil {
			return err
		}
	}
	return nil
}
