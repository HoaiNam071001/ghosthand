package app

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"ghosthand/internal/model"
)

// Quyền "cho phép kịch bản này đến khi đóng app" (bước 56 A1) gắn theo nội dung kịch bản, không theo đường dẫn:
// AI update_script rồi chạy thì hỏi lại – người dùng chỉ cho phép đúng bản đã thấy. Kịch bản tạm (không file)
// cũng nhớ được khi nội dung không đổi.

// runHash – băm phần ảnh hưởng lúc chạy; Meta (nguồn gốc, cờ thử) và Groups (khung nhóm, chỉ UI) bỏ ra để
// lưu tay / gom nhóm không làm hỏi lại.
func runHash(sc model.Script) string {
	sc.Meta, sc.Groups = nil, nil
	b, _ := json.Marshal(sc)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

// allowList – các bản kịch bản đã cho phép (hash) + hash cho phép gần nhất theo file (biết "đã đổi từ lần trước").
type allowList struct {
	hashes map[string]bool
	byPath map[string]string
}

func newAllowList() allowList {
	return allowList{hashes: map[string]bool{}, byPath: map[string]string{}}
}

// check: ok = bản này đã được cho phép; changed = file này từng được cho phép với nội dung khác.
func (l allowList) check(path, hash string) (ok, changed bool) {
	if hash == "" {
		return false, false
	}
	if l.hashes[hash] {
		return true, false
	}
	prev, seen := l.byPath[path]
	return false, path != "" && seen && prev != hash
}

func (l allowList) allow(path, hash string) {
	if hash == "" {
		return
	}
	l.hashes[hash] = true
	if path != "" {
		l.byPath[path] = hash
	}
}

func (l allowList) clear() {
	clear(l.hashes)
	clear(l.byPath)
}
