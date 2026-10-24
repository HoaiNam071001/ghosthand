//go:build darwin

package perm

import "testing"

// Chạy thật trên Mac: chỉ in trạng thái (không hỏi quyền), kiểm tra không panic / không bật hộp thoại.
func TestSystemProbeReal(t *testing.T) {
	for _, it := range Check(System{}) {
		t.Logf("%-18s %-9s %s", it.ID, it.State, it.Note)
		if it.State == "" {
			t.Errorf("%s: trạng thái rỗng", it.ID)
		}
	}
}
