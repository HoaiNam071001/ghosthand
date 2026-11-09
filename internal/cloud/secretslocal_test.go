package cloud_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"ghosthand/internal/cloud"
	"ghosthand/internal/secrets"
)

func newSecretsLocal(t *testing.T, pass string, vals map[string]string) *cloud.SecretsLocal {
	t.Helper()
	st := &secrets.Store{Backend: &secrets.MemBackend{}, Dir: t.TempDir()}
	for k, v := range vals {
		if err := st.Set(context.Background(), k, v); err != nil {
			t.Fatal(err)
		}
	}
	return &cloud.SecretsLocal{Store: st, Pass: pass}
}

func TestSecretsLocalStableHashAndNoPlaintext(t *testing.T) {
	l := newSecretsLocal(t, "pw", map[string]string{"api_key": "TOPSECRET99"})
	h1, err := l.Hashes()
	if err != nil || h1[cloud.SecretsPath] == "" {
		t.Fatalf("hashes: %v %v", h1, err)
	}
	h2, _ := l.Hashes()
	if h1[cloud.SecretsPath] != h2[cloud.SecretsPath] {
		t.Fatal("hash phải ổn định khi không đổi gì")
	}
	b, _ := l.Read(cloud.SecretsPath)
	if strings.Contains(string(b), "TOPSECRET99") {
		t.Fatal("bản đẩy lên cloud lộ giá trị")
	}
}

func TestSecretsLocalNoPassphraseIsError(t *testing.T) {
	l := newSecretsLocal(t, "", map[string]string{"k": "valu"})
	if _, err := l.Hashes(); !errors.Is(err, cloud.ErrNoPassphrase) {
		t.Fatalf("thiếu cụm mật khẩu phải lỗi (không được trả rỗng → xoá nhầm cloud): %v", err)
	}
}

func TestSecretsLocalEmptyHasNoFile(t *testing.T) {
	h, err := newSecretsLocal(t, "pw", nil).Hashes()
	if err != nil || len(h) != 0 {
		t.Fatalf("chưa có bí mật thì không có file: %v %v", h, err)
	}
}

func TestSecretsLocalTwoMachines(t *testing.T) {
	a := newSecretsLocal(t, "pw", map[string]string{"k1": "value1", "k2": "value2"})
	blob, err := a.Read(cloud.SecretsPath)
	if err != nil {
		t.Fatal(err)
	}
	// máy B có sẵn một bí mật cũ không còn trên cloud → bị thay theo cloud
	var saved []byte
	b := newSecretsLocal(t, "pw", map[string]string{"cu": "oldvalue"})
	b.OnSalt = func(s []byte) { saved = s }
	if err := b.Write(cloud.SecretsPath, blob); err != nil {
		t.Fatal(err)
	}
	if len(saved) == 0 {
		t.Fatal("máy mới phải nhận salt của nhóm")
	}
	if b.Store.Has("cu") || !b.Store.Has("k1") || !b.Store.Has("k2") {
		t.Fatalf("kho B sau khi kéo: %v", b.Store.Names())
	}
	ha, _ := a.Hashes()
	hb, _ := b.Hashes()
	if ha[cloud.SecretsPath] != hb[cloud.SecretsPath] {
		t.Fatal("hai máy cùng nội dung + cùng salt phải cùng hash")
	}
}

func TestSecretsLocalWrongPassphraseKeepsStore(t *testing.T) {
	a := newSecretsLocal(t, "dung", map[string]string{"k1": "value1"})
	blob, _ := a.Read(cloud.SecretsPath)
	b := newSecretsLocal(t, "sai", map[string]string{"giu": "keepme"})
	if err := b.Write(cloud.SecretsPath, blob); !errors.Is(err, secrets.ErrWrongPassphrase) {
		t.Fatalf("sai cụm mật khẩu: %v", err)
	}
	if !b.Store.Has("giu") {
		t.Fatal("sai cụm mật khẩu thì kho máy phải giữ nguyên")
	}
}
