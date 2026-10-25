package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStartAt(t *testing.T) {
	home, _ := os.UserHomeDir()
	tmp := t.TempDir()
	cases := []struct{ in, dir, name string }{
		{"", home, ""},
		{"{{n1.output.path}}", home, ""},
		{tmp, tmp, ""},
		{filepath.Join(tmp, "bao-cao.pdf"), tmp, "bao-cao.pdf"},
		{filepath.Join(tmp, "khong", "co.pdf"), home, ""},
	}
	for _, c := range cases {
		if d, n := startAt(c.in); d != c.dir || n != c.name {
			t.Errorf("startAt(%q) = %q, %q; muốn %q, %q", c.in, d, n, c.dir, c.name)
		}
	}
}
