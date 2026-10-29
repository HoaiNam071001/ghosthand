package secrets

import (
	"slices"
	"testing"
)

func TestRefsExpandRedact(t *testing.T) {
	got := Refs("Bearer {{secret.gh}}", "{{ secret.b }}-{{secret.gh}}", "{{vars.x}}")
	if !slices.Equal(got, []string{"b", "gh"}) {
		t.Fatalf("Refs = %v", got)
	}
	vals := map[string]string{"gh": "tok-123"}
	if e := Expand("Bearer {{secret.gh}} {{secret.zz}}", vals); e != "Bearer tok-123 {{secret.zz}}" {
		t.Fatalf("Expand = %q", e)
	}
	if r := Redact("lỗi 401 với tok-123", vals); r != "lỗi 401 với •••" {
		t.Fatalf("Redact = %q", r)
	}
}
