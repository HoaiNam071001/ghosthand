package browser

import (
	"context"
	"time"

	"ghosthand/internal/device"
)

// tapKeys bấm tổ hợp: các phím trước phím cuối là phím kèm (ctrl…), giữ tới khi phím cuối nhả.
func tapKeys(keys ...string) error {
	in := device.RobotgoInput{}
	mods, key := keys[:len(keys)-1], keys[len(keys)-1]
	var held []string
	defer func() {
		for i := len(held) - 1; i >= 0; i-- {
			in.KeyToggle(held[i], false, nil)
		}
	}()
	for _, m := range mods {
		if err := in.KeyToggle(m, true, nil); err != nil {
			return err
		}
		held = append(held, m)
	}
	if err := in.KeyToggle(key, true, mods); err != nil {
		return err
	}
	time.Sleep(40 * time.Millisecond)
	return in.KeyToggle(key, false, nil)
}

func sleepCtx(ctx context.Context, d time.Duration) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(d):
		return nil
	}
}
