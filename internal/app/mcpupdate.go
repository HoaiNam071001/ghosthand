package app

import (
	"context"
	"errors"
	"log"

	"ghosthand/internal/mcpsrv"
	"ghosthand/internal/store"
	"ghosthand/internal/update"
)

// update_app (59 U5): cùng code với nút Cập nhật ngay (updateapi.go) – chỉ Release của repo, kiểm sha256. Quyền theo
// mức AI: Chỉ soạn → từ chối, Hỏi → hộp hỏi (ai:ask có update), Tự chạy → cài luôn.

// CheckUpdate – mcpsrv.Backend: hỏi Release mới nhất + lỗi của lần cài nền trước (nếu có).
func (b mcpBackend) CheckUpdate(ctx context.Context) (mcpsrv.UpdateStatus, error) {
	info, err := update.Check(ctx, "")
	if err != nil {
		return mcpsrv.UpdateStatus{}, err
	}
	b.a.upd.set(info)
	b.a.upd.mu.Lock()
	defer b.a.upd.mu.Unlock()
	return mcpsrv.UpdateStatus{Current: info.Current, Latest: info.Latest, Newer: info.Newer, Notes: info.Notes,
		Installing: b.a.upd.busy, LastError: b.a.upd.lastErr}, nil
}

// InstallUpdate – mcpsrv.Backend: hỏi lại Release (không tin bản cũ trong bộ nhớ), hỏi quyền, rồi tải + cài ở nền
// – trả ngay để AI biết app sắp thoát (proxy --mcp chờ app lên lại, 59 U4).
func (b mcpBackend) InstallUpdate(ctx context.Context) (string, error) {
	if update.IsDev() {
		return "", errors.New("app đang chạy bản dev tự build – không cập nhật từ Release được; bản dev cài bằng make dev-install")
	}
	if store.CurrentSettings().MCP.RunMode() == store.AIRunEdit {
		return "", errors.New("Cài đặt của app chỉ cho AI soạn kịch bản – không cho AI cập nhật app; hỏi người dùng")
	}
	info, err := update.Check(ctx, "")
	if err != nil {
		return "", err
	}
	b.a.upd.set(info)
	if !info.Newer {
		return "", errors.New("đã là bản mới nhất (" + info.Current + ")")
	}
	// kiểm điều kiện trước khi hỏi – người dùng không phải đồng ý một việc chắc chắn hỏng
	if err := b.a.quitBlocker("cập nhật"); err != nil {
		return "", err
	}
	ask := AIAsk{Script: "Cập nhật Ghosthand", Update: &AIUpdateAsk{Current: info.Current, Latest: info.Latest, Notes: info.Notes}}
	if err := b.a.aiAllowed(ask); err != nil {
		if errors.Is(err, errAIDenied) {
			return "", errors.New("người dùng không cho AI cập nhật app – đừng thử lại khi người dùng chưa bảo")
		}
		return "", err
	}
	file, sum, err := b.a.beginUpdate()
	if err != nil {
		return "", err
	}
	b.a.upd.mu.Lock()
	b.a.upd.lastErr = ""
	b.a.upd.mu.Unlock()
	go func() {
		err := b.a.runUpdate(file, sum)
		if err != nil {
			log.Printf("update_app: %v", err)
			b.a.emit("update:error", err.Error())
		}
		b.a.endUpdate(err)
	}()
	return info.Latest, nil
}
