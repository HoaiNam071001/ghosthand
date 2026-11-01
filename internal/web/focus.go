package web

import (
	"context"
)

// Focused – webType: sau khi click, ô đang focus (xuống cả iframe cùng nguồn) phải là ô nhập và là phần tử đích / chỗ chuột
// vừa bấm xuống (con, cha hoặc ô của label) – không thì gõ sẽ rơi vào chỗ khác.
func (c *Chrome) Focused(ctx context.Context) (bool, string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.last == nil {
		return false, "chưa tìm phần tử", nil
	}
	r, err := evalJS[struct {
		OK bool
		At string
	}](ctx, c.last.ctx, "đọc ô đang focus", pageJS(focusJS))
	return r.OK, r.At, err
}

const focusJS = `() => {
  let a = document.activeElement;
  while (a && a.contentDocument && a.contentDocument.activeElement) a = a.contentDocument.activeElement; // vào iframe
  const t = window.__acTarget;
  const editable = a && (a.isContentEditable || a.matches('input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, select'));
  const label = t && (t.control || (t.closest && t.closest('label') && t.closest('label').control));
  // đích tìm hoặc chỗ chuột bấm xuống thật (bấm lệch từ nhãn xuống ô: ô đúng đã focus)
  const rel = x => !!x && (a === x || x.contains(a) || a.contains(x) || (x.closest && x.closest("label") && x.closest("label").control === a));
  const ok = !!(editable && (rel(window.__acDown) || (t && (rel(t) || a === label))));
  return { OK: ok, At: ok ? '' : !a || a === document.body ? 'không có ô nào' : describe(a) };
}`
