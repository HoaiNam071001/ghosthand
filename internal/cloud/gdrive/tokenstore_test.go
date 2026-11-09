package gdrive

import (
	"context"
	"testing"

	"ghosthand/internal/secrets"
)

func TestKeychainTokensKeepOnlyRefresh(t *testing.T) {
	mem := &secrets.MemBackend{}
	ks := KeychainTokens{Backend: mem}
	ctx := context.Background()
	if tok, err := ks.Load(ctx); err != nil || tok.Refresh != "" {
		t.Fatalf("chưa có token: %+v %v", tok, err)
	}
	if err := ks.Save(ctx, Token{Refresh: "R", Access: "A"}); err != nil {
		t.Fatal(err)
	}
	if v, _ := mem.Get(ctx, tokenName); v != "R" {
		t.Fatalf("keychain phải giữ đúng refresh token (không access): %q", v)
	}
	if tok, _ := ks.Load(ctx); tok.Refresh != "R" || tok.Access != "" {
		t.Fatalf("Load: %+v", tok)
	}
	ks.Clear(ctx)
	if tok, _ := ks.Load(ctx); tok.Refresh != "" {
		t.Fatal("Clear không xoá")
	}
}
