package script

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"

	"ghosthand/internal/model"
)

// Thao tác nguy hiểm (bước 35 N4, mở rộng ở bước 26; node người dùng tự đánh dấu – 46 C1): xoá file vào / dọn Thùng rác, buộc thoát app, thoát app có buộc
// thoát khi quá giờ, đóng cửa sổ, chạy lệnh (S1 – dấu vân tay theo nội dung lệnh). Lần chạy đầu (và mỗi khi đích đổi) người dùng phải đồng ý – main/dangerapi.go.

// Op của DangerOp.
const (
	DangerTrash      = model.FileTrash      // xoá file khớp Pattern trong Folder vào Thùng rác
	DangerEmptyTrash = model.FileEmptyTrash // dọn Thùng rác
	DangerQuit       = "quit"               // thoát app Target, quá giờ thì buộc thoát
	DangerForceQuit  = "forceQuit"          // buộc thoát app Target
	DangerClose      = "close"              // đóng cửa sổ Target
	DangerPower      = "power"              // ngủ / đăng xuất / tắt / khởi động lại máy (node Nguồn, bước 43 S3) – hành động ở Target
	DangerMarked     = "marked"             // node người dùng đánh dấu Step.Confirm (ghi / xoá dữ liệu trong app khác) – Target = loại node (46 C1)
	DangerShell      = "shell"              // chạy lệnh Script bằng Lang (node Chạy lệnh, bước 43 S1)
)

// DangerOp – một thao tác nguy hiểm trong kịch bản – hiện cho người dùng xác nhận.
type DangerOp struct {
	Ref     string `json:"ref"`
	Op      string `json:"op"`                // Danger*
	Folder  string `json:"folder,omitempty"`  // trash: thư mục (có thể còn biến node)
	Pattern string `json:"pattern,omitempty"` // trash: mẫu tên file
	Target  string `json:"target,omitempty"`  // app / cửa sổ: tên app, “tiêu đề”
	Lang    string `json:"lang,omitempty"`    // shell: ngôn ngữ ("" = shell của máy)
	Script  string `json:"script,omitempty"`  // shell: nội dung lệnh nguyên văn – đổi dù một ký tự cũng phải đồng ý lại
	Dir     string `json:"dir,omitempty"`     // shell: thư mục chạy
}

// dangerOf – thao tác nguy hiểm của node s (ok = false: không có).
func dangerOf(s model.Step) (DangerOp, bool) {
	op := DangerOp{Ref: s.Ref}
	switch {
	case s.Type == model.StepFile && s.FileOp == model.FileTrash:
		op.Op, op.Folder, op.Pattern = DangerTrash, strings.TrimSpace(s.FilePath), strings.TrimSpace(s.FilePattern)
	case s.Type == model.StepFile && s.FileOp == model.FileEmptyTrash:
		op.Op = DangerEmptyTrash
	case s.Type == model.StepApp && s.AppOp == model.AppForceQuit:
		op.Op, op.Target = DangerForceQuit, strings.TrimSpace(s.AppName)
	case s.Type == model.StepApp && s.AppOp == model.AppQuit && s.AppForce:
		op.Op, op.Target = DangerQuit, strings.TrimSpace(s.AppName)
	case s.Type == model.StepPower && model.PowerNeedsConsent(s.PowerOp):
		op.Op, op.Target = DangerPower, s.PowerOp
	case s.Type == model.StepShell:
		op.Op, op.Lang, op.Script, op.Dir = DangerShell, s.ShellLang, s.Script, strings.TrimSpace(s.FilePath)
	case s.Type == model.StepWindow && s.WinOp == model.WinClose:
		op.Op, op.Target = DangerClose, strings.TrimSpace(s.WinApp)
		if t := strings.TrimSpace(s.WinTitle); t != "" {
			op.Target = strings.TrimSpace(op.Target + " “" + t + "”")
		}
	case s.Confirm: // node ghi / xoá do người dùng đánh dấu; loại đã có thao tác nguy hiểm riêng (shell, đóng cửa sổ…) giữ dấu vân tay riêng ở trên
		op.Op, op.Target = DangerMarked, s.Type // theo loại, không theo tên – đổi tên node không hỏi lại
	default:
		return op, false
	}
	return op, true
}

// DangerOps – thao tác nguy hiểm của các node đang bật, theo thứ tự trong mảng (input đã thay). Fingerprint đổi khi
// thao tác / đích (thư mục, mẫu tên, app, cửa sổ) đổi → phải xác nhận lại.
func DangerOps(sc model.Script) (ops []DangerOp, fingerprint string) {
	for _, s := range sc.Steps {
		if op, ok := dangerOf(s); ok && s.Enabled {
			ops = append(ops, op)
		}
	}
	if len(ops) == 0 {
		return nil, ""
	}
	b, _ := json.Marshal(ops)
	h := sha256.Sum256(b)
	return ops, hex.EncodeToString(h[:8])
}
