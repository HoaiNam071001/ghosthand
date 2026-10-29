package store

import (
	"strings"
	"testing"
)

func TestMCPServerCheck(t *testing.T) {
	ok := MCPServer{Name: "GH", Kind: "http", URL: "https://x.test/mcp", Headers: map[string]string{"Authorization": "Bearer {{secret.gh}}"}}
	if err := ok.Check(); err != nil {
		t.Fatal(err)
	}
	cases := map[string]MCPServer{
		"tên":       {Kind: "stdio", Command: "npx"},
		"lệnh":      {Name: "a", Kind: "stdio"},
		"kiểu":      {Name: "a", Kind: "ws"},
		"địa chỉ":   {Name: "a", Kind: "http", URL: "https://"},
		"secret":    {Name: "a", Kind: "stdio", Command: "npx", Env: map[string]string{"TOKEN": "abc123"}},
		"header":    {Name: "a", Kind: "http", URL: "https://x.test", Headers: map[string]string{"Authorization": "Bearer abc"}},
		"khóa rỗng": {Name: "a", Kind: "stdio", Command: "npx", Env: map[string]string{" ": "{{secret.x}}"}},
	}
	for name, s := range cases {
		if s.Check() == nil {
			t.Errorf("%s: phải báo lỗi", name)
		}
	}
	if got := strings.Join(ok.SecretNames(), ","); got != "gh" {
		t.Errorf("SecretNames = %q", got)
	}
}

func TestUpsertMCPServer(t *testing.T) {
	list, a := upsertMCPServer(nil, MCPServer{Name: "a"})
	list, b := upsertMCPServer(list, MCPServer{Name: "b"})
	if a.ID == "" || a.ID == b.ID || len(list) != 2 {
		t.Fatalf("a=%+v b=%+v", a, b)
	}
	b.Name = "b2"
	list, _ = upsertMCPServer(list, b)
	if len(list) != 2 || list[1].Name != "b2" {
		t.Fatalf("list=%+v", list)
	}
}

func TestMCPFingerprint(t *testing.T) {
	a := MCPServer{ID: "s1", Kind: "stdio", Command: "npx", Args: []string{"-y", "x"}, Env: map[string]string{"A": "{{secret.a}}", "B": "{{secret.b}}"}}
	b := a
	if a.Fingerprint() != b.Fingerprint() {
		t.Fatal("cùng cấu hình phải cùng dấu vân tay")
	}
	b.Name, b.Enabled = "đổi tên", true
	if a.Fingerprint() != b.Fingerprint() {
		t.Error("tên / bật tắt không được đổi dấu vân tay")
	}
	b.Args = []string{"-y", "y"}
	if a.Fingerprint() == b.Fingerprint() {
		t.Error("đổi tham số phải đổi dấu vân tay")
	}
}

func TestMCPConsent(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("HOME", dir)
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("AppData", dir)
	s := MCPServer{ID: "s1", Kind: "stdio", Command: "npx", Args: []string{"a"}}
	if MCPServerTrusted(s) {
		t.Fatal("chưa duyệt mà đã tin")
	}
	if err := TrustMCPServer(s); err != nil || !MCPServerTrusted(s) {
		t.Fatalf("duyệt xong phải tin: %v", err)
	}
	if err := AlwaysAllowMCPTool(s, "write"); err != nil || !MCPToolAlways(s, "write") || MCPToolAlways(s, "del") {
		t.Fatal("luôn cho tool phải đúng từng tool")
	}
	s.Args = []string{"b"}
	if MCPServerTrusted(s) || MCPToolAlways(s, "write") {
		t.Fatal("đổi lệnh phải hỏi lại, kể cả tool đã luôn cho")
	}
	s.Args = []string{"a"}
	ForgetMCPConsent("s1")
	if MCPServerTrusted(s) {
		t.Fatal("xoá đồng ý xong phải hỏi lại")
	}
}
