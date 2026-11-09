package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"golang.org/x/crypto/scrypt"
)

// Vault – mã hoá kho bí mật để đồng bộ cloud (bước 54 C7): scrypt từ cụm mật khẩu → AES-256-GCM. Cloud chỉ có bản mã + salt.
//
// Mã hoá CÓ TÍNH XÁC ĐỊNH: nonce = HMAC(khoá, nội dung)[:12] (kiểu SIV). Cùng nội dung + cùng cụm mật khẩu + cùng salt thì ra
// cùng bản mã → hash bản máy ổn định giữa các lần, engine so ba bên (cloud.Sync) không thấy "đổi" khi chẳng ai sửa.
// Đánh đổi chấp nhận: ai xem được bản mã chỉ biết hai lần mã hoá có cùng nội dung hay không.

var (
	ErrWrongPassphrase = errors.New("cụm mật khẩu đồng bộ sai (hoặc dữ liệu trên cloud bị sửa)")
	ErrBadVault        = errors.New("dữ liệu bí mật trên cloud không đúng định dạng")
)

const (
	vaultVersion = 1
	saltLen      = 16
	vaultAAD     = "ghosthand-secrets-v1"
	// scrypt N=2^15 (~100 ms): đủ chậm với kẻ đoán cụm mật khẩu, đủ nhanh để đồng bộ không khựng.
	scryptN, scryptR, scryptP = 1 << 15, 8, 1
)

type vaultFile struct {
	V     int    `json:"v"`
	KDF   string `json:"kdf"`
	Salt  string `json:"salt"`
	Nonce string `json:"nonce"`
	Data  string `json:"data"`
}

// NewSalt – salt mới cho nhóm máy đồng bộ lần đầu.
func NewSalt() []byte {
	b := make([]byte, saltLen)
	_, _ = rand.Read(b)
	return b
}

func deriveKey(pass string, salt []byte) ([]byte, error) {
	return scrypt.Key([]byte(pass), salt, scryptN, scryptR, scryptP, 32)
}

// Seal mã hoá values (tên → giá trị). Rỗng cụm mật khẩu / salt sai độ dài là lỗi dùng sai.
func Seal(pass string, salt []byte, values map[string]string) ([]byte, error) {
	if pass == "" || len(salt) != saltLen {
		return nil, errors.New("thiếu cụm mật khẩu hoặc salt")
	}
	key, err := deriveKey(pass, salt)
	if err != nil {
		return nil, err
	}
	plain, err := json.Marshal(values) // json sắp khoá theo chữ cái → xác định
	if err != nil {
		return nil, err
	}
	mac := hmac.New(sha256.New, key)
	mac.Write(plain)
	nonce := mac.Sum(nil)[:12]
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	enc := base64.StdEncoding
	return json.MarshalIndent(vaultFile{
		V: vaultVersion, KDF: "scrypt", Salt: enc.EncodeToString(salt), Nonce: enc.EncodeToString(nonce),
		Data: enc.EncodeToString(gcm.Seal(nil, nonce, plain, []byte(vaultAAD))),
	}, "", "  ")
}

// VaultSalt đọc salt từ bản mã (máy mới cần để dùng chung salt với nhóm).
func VaultSalt(blob []byte) ([]byte, error) {
	f, err := parseVault(blob)
	if err != nil {
		return nil, err
	}
	return base64.StdEncoding.DecodeString(f.Salt)
}

// Open giải mã. Sai cụm mật khẩu → ErrWrongPassphrase.
func Open(pass string, blob []byte) (map[string]string, error) {
	f, err := parseVault(blob)
	if err != nil {
		return nil, err
	}
	enc := base64.StdEncoding
	salt, e1 := enc.DecodeString(f.Salt)
	nonce, e2 := enc.DecodeString(f.Nonce)
	data, e3 := enc.DecodeString(f.Data)
	if e1 != nil || e2 != nil || e3 != nil || len(salt) != saltLen || len(nonce) != 12 {
		return nil, ErrBadVault
	}
	key, err := deriveKey(pass, salt)
	if err != nil {
		return nil, err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	plain, err := gcm.Open(nil, nonce, data, []byte(vaultAAD))
	if err != nil {
		return nil, ErrWrongPassphrase
	}
	var out map[string]string
	if err := json.Unmarshal(plain, &out); err != nil {
		return nil, ErrBadVault
	}
	return out, nil
}

func parseVault(blob []byte) (vaultFile, error) {
	var f vaultFile
	if err := json.Unmarshal(blob, &f); err != nil || f.V != vaultVersion || f.KDF != "scrypt" {
		return f, fmt.Errorf("%w (phiên bản %d)", ErrBadVault, f.V)
	}
	return f, nil
}

func newGCM(key []byte) (cipher.AEAD, error) {
	blk, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(blk)
}
