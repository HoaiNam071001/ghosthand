package script

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Lệnh của node Chạy lệnh chỉ gọi một file script (bước 56 A2: `sh x.sh`, `python3 y.py`, `node z.js`, `./run.sh`):
// dấu vân tay đồng ý gắn thêm hash nội dung file – sửa file sau khi đồng ý thì hỏi lại. Lệnh phức tạp hơn (nhiều
// lệnh, ống, biến, dấu nháy) không đoán – giữ dấu vân tay theo nội dung lệnh như cũ.

// shellInterpreters – chương trình nhận file script làm đối số đầu (không tính cờ "-…").
var shellInterpreters = map[string]bool{
	"sh": true, "bash": true, "zsh": true, "fish": true, "python": true, "python3": true, "node": true, "deno": true,
	"bun": true, "ruby": true, "perl": true, "php": true, "osascript": true, "pwsh": true, "powershell": true,
}

const shellFileMax = 16 << 20 // file lớn hơn không băm (không phải script) – coi như không xác định được

// shellFile – file script lệnh cmd gọi (dir: thư mục chạy, "" = thư mục hiện tại của app như shell.Spec) + hash; không xác định được đúng
// một file có thật thì trả rỗng.
func shellFile(cmd, dir string) (path, hash string) {
	cmd = strings.TrimSpace(cmd)
	if cmd == "" || strings.ContainsAny(cmd, "\n;|&<>$`()'\"*?") {
		return "", ""
	}
	tok := strings.Fields(cmd)
	file := tok[0]
	if shellInterpreters[strings.TrimSuffix(strings.ToLower(filepath.Base(tok[0])), ".exe")] {
		file = ""
		for _, t := range tok[1:] {
			if !strings.HasPrefix(t, "-") {
				file = t
				break
			}
		}
	} else if !strings.ContainsAny(file, `/\`) {
		return "", "" // lệnh có sẵn (ls, git…) – không phải file script
	}
	if file == "" {
		return "", ""
	}
	if !filepath.IsAbs(file) && !strings.HasPrefix(file, "~") {
		if dir == "" {
			wd, err := os.Getwd()
			if err != nil {
				return "", ""
			}
			dir = wd
		}
		file = filepath.Join(dir, file)
	}
	p, err := UserPath(file)
	if err != nil {
		return "", ""
	}
	h, ok := fileHash(p)
	if !ok {
		return "", ""
	}
	return p, h
}

func fileHash(p string) (string, bool) {
	f, err := os.Open(p)
	if err != nil {
		return "", false
	}
	defer f.Close()
	if st, err := f.Stat(); err != nil || !st.Mode().IsRegular() || st.Size() > shellFileMax {
		return "", false
	}
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", false
	}
	return hex.EncodeToString(h.Sum(nil)[:16]), true
}
