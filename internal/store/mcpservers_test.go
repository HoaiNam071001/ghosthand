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
