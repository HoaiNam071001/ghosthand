package gdrive

import (
	"context"
	"errors"

	"ghosthand/internal/secrets"
)

// tokenName – tên mục trong keychain. Không đi qua secrets.Store nên không hiện trong danh sách bí mật của người dùng
// và không dùng được trong {{secret.*}}.
const tokenName = "cloud-google-refresh"

// KeychainTokens cất refresh token vào keychain (macOS) / Credential Manager (Windows) – không bao giờ vào settings.json.
// Access token (sống ~1 giờ) chỉ giữ trong bộ nhớ.
type KeychainTokens struct {
	Backend secrets.Backend
}

func (k KeychainTokens) Load(ctx context.Context) (Token, error) {
	v, err := k.Backend.Get(ctx, tokenName)
	if errors.Is(err, secrets.ErrNotFound) {
		return Token{}, nil
	}
	return Token{Refresh: v}, err
}

func (k KeychainTokens) Save(ctx context.Context, t Token) error {
	return k.Backend.Set(ctx, tokenName, t.Refresh)
}

func (k KeychainTokens) Clear(ctx context.Context) error {
	return k.Backend.Delete(ctx, tokenName)
}
