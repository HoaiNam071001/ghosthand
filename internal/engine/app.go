package engine

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"ghosthand/internal/model"
)

// Node Ứng dụng (bước 26): kiểm tra / chờ / thoát app khớp AppName (model.MatchApps – mọi tiến trình của app) qua
// device.Apps. Không mở app (việc của node Mở). Thoát: chặn app hệ thống (model.ProtectedApp); buộc thoát cần
// Options.AllowDanger.

// forceWaitMs – chờ tiến trình biến mất sau khi buộc thoát.
const forceWaitMs = 3000

func (e *Engine) appStep(ctx context.Context, s model.Step) (map[string]any, error) {
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	switch s.AppOp {
	case model.AppWaitStart:
		var procs []model.AppInfo
		err := e.pollUntil(ctx, s, "app", func() (bool, error) {
			var err error
			procs, err = e.findApp(s)
			_, n := model.MainApp(procs)
			return n > 0, err
		}, func() error {
			apps, _ := e.apps.List()
			return &timeoutErr{msg: fmt.Sprintf("app %s chưa có cửa sổ sau %s", s.AppName, fmtSeconds(s.TimeoutMs)), detail: appMiss(s, procs, apps)}
		})
		return appOutput(procs), err
	case model.AppWaitQuit:
		var procs []model.AppInfo
		err := e.pollUntil(ctx, s, "app", func() (bool, error) {
			var err error
			procs, err = e.findApp(s)
			return len(procs) == 0, err
		}, func() error {
			return &timeoutErr{msg: fmt.Sprintf("app %s vẫn chạy sau %s", s.AppName, fmtSeconds(s.TimeoutMs)), detail: appMiss(s, procs, nil)}
		})
		return appOutput(nil), err
	case model.AppQuit, model.AppForceQuit:
		return e.quitApp(ctx, s)
	}
	procs, err := e.findApp(s)
	return appOutput(procs), err
}

// actionPort – cổng ra của node hành động thành công: Ứng dụng kiểm tra → yes / no theo output running, Hỏi người dùng →
// approve / deny / timeout theo output answer, còn lại success.
func actionPort(s model.Step, out map[string]any) string {
	if s.Type == model.StepAskUser {
		if p, _ := out["answer"].(string); p != "" { // lỗi / Dừng: out nil – cổng không dùng
			return p
		}
	}
	if s.Type == model.StepApp && s.AppOp == model.AppCheck {
		if out["running"] == true {
			return model.PortYes
		}
		return model.PortNo
	}
	return model.PortSuccess
}

// findApp – mọi tiến trình khớp node lúc này.
func (e *Engine) findApp(s model.Step) ([]model.AppInfo, error) {
	apps, err := e.apps.List()
	if err != nil {
		return nil, err
	}
	idx, err := model.MatchApps(apps, s.AppName, s.AppMatch)
	if err != nil {
		return nil, &invalidErr{err.Error()}
	}
	out := make([]model.AppInfo, len(idx))
	for i, j := range idx {
		out[i] = apps[j]
	}
	return out, nil
}

// quitApp thoát mọi tiến trình khớp rồi chờ chúng biến mất. App không chạy → thành công ngay.
func (e *Engine) quitApp(ctx context.Context, s model.Step) (map[string]any, error) {
	force := s.AppOp == model.AppForceQuit
	if (force || s.AppForce) && !e.allowDanger {
		return nil, dangerErr("buộc thoát app")
	}
	procs, err := e.findApp(s)
	if err != nil {
		return nil, err
	}
	n := len(procs)
	procs = slices.DeleteFunc(procs, func(a model.AppInfo) bool { return model.ProtectedApp(a.Name) || model.ProtectedApp(a.ID) })
	if n > 0 && len(procs) == 0 {
		return nil, &invalidErr{fmt.Sprintf("không thoát được %s (app hệ thống / ghosthand)", s.AppName)}
	}
	out := appOutput(procs)
	out["running"], out["windows"] = false, 0
	if len(procs) == 0 {
		return out, nil
	}
	if force {
		return out, e.forceQuit(ctx, s, procs)
	}
	for _, a := range procs {
		if a.Windows > 0 {
			_ = e.apps.Quit(a.PID) // tiến trình nền của app (không cửa sổ) tự thoát theo tiến trình chính
		}
	}
	err = e.waitGone(ctx, s, procs, s.TimeoutMs)
	var late *timeoutErr
	if errors.As(err, &late) && s.AppForce {
		return out, e.forceQuit(ctx, s, e.alive(procs))
	}
	return out, err
}

func (e *Engine) forceQuit(ctx context.Context, s model.Step, procs []model.AppInfo) error {
	var lastErr error // tiến trình đã tự thoát giữa chừng cũng báo lỗi – chỉ dùng khi còn tiến trình sống
	for _, a := range procs {
		if err := e.apps.ForceQuit(a.PID); err != nil {
			lastErr = err
		}
	}
	err := e.waitGone(ctx, s, procs, forceWaitMs)
	var late *timeoutErr
	if errors.As(err, &late) && lastErr != nil {
		return fmt.Errorf("không buộc thoát được %s: %w", s.AppName, lastErr) // vd tiến trình chạy quyền admin
	}
	return err
}

// waitGone chờ tới khi không còn tiến trình nào trong procs (theo pid), tối đa timeoutMs.
func (e *Engine) waitGone(ctx context.Context, s model.Step, procs []model.AppInfo, timeoutMs int) error {
	w := s
	w.TimeoutMs = timeoutMs
	return e.pollUntil(ctx, w, "app", func() (bool, error) {
		return len(e.alive(procs)) == 0, nil
	}, func() error {
		return &timeoutErr{msg: fmt.Sprintf("app %s chưa thoát sau %s (có thể đang hỏi lưu)", s.AppName, fmtSeconds(timeoutMs)), detail: appMiss(s, e.alive(procs), nil)}
	})
}

// alive – các tiến trình trong procs còn chạy (đọc lỗi → coi như còn cả).
func (e *Engine) alive(procs []model.AppInfo) []model.AppInfo {
	apps, err := e.apps.List()
	if err != nil {
		return procs
	}
	return slices.DeleteFunc(slices.Clone(procs), func(a model.AppInfo) bool {
		return !slices.ContainsFunc(apps, func(x model.AppInfo) bool { return x.PID == a.PID })
	})
}

// appOutput – output của node: tiến trình đại diện (nhiều cửa sổ nhất) + tổng số cửa sổ.
func appOutput(procs []model.AppInfo) map[string]any {
	m, n := model.MainApp(procs)
	return map[string]any{"running": len(procs) > 0, "pid": m.PID, "name": m.Name, "id": m.ID, "windows": n}
}
