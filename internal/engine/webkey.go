package engine

import (
	"context"
	"strings"

	"ghosthand/internal/model"
)

// webKey – node webKey (46 B3): bấm phím vào tab của Chrome của app qua CDP (web.Browser.Keys) – không đưa Chrome lên
// trước, không đụng bàn phím thật nên không phụ thuộc cửa sổ đang ở trước. Phím vào ô đang focus của trang.
func (e *Engine) webKey(ctx context.Context, s model.Step) (map[string]any, error) {
	if e.browser == nil {
		return nil, errNoBrowserOpt
	}
	if err := e.gate.wait(ctx); err != nil {
		return nil, err
	}
	mark, err := e.webMark(ctx, s.Tab, false)
	if err != nil {
		return nil, err
	}
	tab, err := e.browser.Keys(ctx, s.Tab, s.Keys, s.Modifiers, s.KeyMode == model.KeySequence)
	if err != nil {
		return nil, err
	}
	out := map[string]any{"keys": strings.Join(append(append([]string{}, s.Modifiers...), s.Keys...), "+"), "tab": tab}
	return out, e.webSettle(ctx, mark, out)
}
