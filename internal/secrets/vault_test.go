package secrets

import (
	"bytes"
	"errors"
	"strings"
	"testing"
)

func TestVaultRoundTrip(t *testing.T) {
	salt := NewSalt()
	in := map[string]string{"mat_khau": "s3cret-Giá-trị", "api": "abcd1234"}
	blob, err := Seal("cum mat khau", salt, in)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(blob), "abcd1234") || strings.Contains(string(blob), "s3cret") {
		t.Fatal("bản mã lộ giá trị")
	}
	out, err := Open("cum mat khau", blob)
	if err != nil || out["api"] != "abcd1234" || out["mat_khau"] != "s3cret-Giá-trị" {
		t.Fatalf("giải mã sai: %v %v", out, err)
	}
	got, err := VaultSalt(blob)
	if err != nil || !bytes.Equal(got, salt) {
		t.Fatalf("salt: %v %v", got, err)
	}
}

func TestVaultDeterministic(t *testing.T) {
	salt := NewSalt()
	v := map[string]string{"a_b": "value1", "c": "value2"}
	b1, _ := Seal("p", salt, v)
	b2, _ := Seal("p", salt, v)
	if !bytes.Equal(b1, b2) {
		t.Fatal("cùng nội dung phải ra cùng bản mã (hash bản máy ổn định)")
	}
	b3, _ := Seal("p", salt, map[string]string{"a_b": "value1", "c": "valueX"})
	if bytes.Equal(b1, b3) {
		t.Fatal("nội dung khác phải ra bản mã khác")
	}
}

func TestVaultWrongPassphraseAndTamper(t *testing.T) {
	salt := NewSalt()
	blob, _ := Seal("dung", salt, map[string]string{"k": "valu"})
	if _, err := Open("sai", blob); !errors.Is(err, ErrWrongPassphrase) {
		t.Fatalf("sai cụm mật khẩu phải báo ErrWrongPassphrase, được %v", err)
	}
	if _, err := Open("dung", []byte("{khong phai json")); !errors.Is(err, ErrBadVault) {
		t.Fatalf("định dạng sai: %v", err)
	}
	if _, err := Seal("", salt, nil); err == nil {
		t.Fatal("cụm mật khẩu rỗng phải lỗi")
	}
}
