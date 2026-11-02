package app

import (
	"ghosthand/internal/model"
	"ghosthand/internal/script"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
)

// Xác nhận thao tác nguy hiểm (script.DangerOps – xoá file, buộc thoát app, đóng cửa sổ): kịch bản có thao tác nguy hiểm
// thì lần chạy đầu (và mỗi khi đích đổi) người dùng phải đồng ý. Chặn ở session.AllowDanger nên hẹn giờ / CLI / MCP
// cũng không chạy được khi chưa đồng ý trong app.

// DangerCheck – thao tác nguy hiểm của kịch bản và đã được đồng ý chưa (frontend hỏi trước khi chạy).
type DangerCheck struct {
	Ops         []script.DangerOp `json:"ops"`
	Fingerprint string            `json:"fingerprint"`
	Confirmed   bool              `json:"confirmed"`
}

// DangerCheck áp input như lúc chạy rồi liệt kê thao tác nguy hiểm. path: file kịch bản ("" = chưa lưu, theo tên).
func (a *App) DangerCheck(sc model.Script, values map[string]any, path string) (DangerCheck, error) {
	sc, err := script.ResolveInputs(sc, values)
	if err != nil {
		return DangerCheck{}, err
	}
	ops, fp := script.DangerOps(sc)
	return DangerCheck{Ops: ops, Fingerprint: fp, Confirmed: fp == "" || store.DangerConfirmed(session.DangerKey(path, sc.Name), fp)}, nil
}
