package store

import (
	"reflect"
	"strings"
	"testing"
)

// Mỗi trường của các struct cài đặt phải được phân loại mang đi / riêng máy; và ngược lại không có mục thừa.
func TestSyncPolicyCoversEveryField(t *testing.T) {
	seen := map[string]bool{}
	for _, v := range []any{Settings{}, OverlaySettings{}, AISettings{}, MCPSettings{}, SyncSettings{}} {
		typ := reflect.TypeOf(v)
		for i := 0; i < typ.NumField(); i++ {
			key := typ.Name() + "." + typ.Field(i).Name
			seen[key] = true
			if _, ok := syncPolicy[key]; !ok {
				t.Errorf("trường %s chưa được phân loại trong syncPolicy (syncsettings.go): mang đi hay riêng máy?", key)
			}
		}
	}
	for key := range syncPolicy {
		if !seen[key] {
			t.Errorf("syncPolicy có mục %s nhưng struct không còn trường đó", key)
		}
	}
}

// Trường ghi "riêng máy" không được xuất hiện trong dữ liệu mang đi, dù có giá trị.
func TestPortableLeavesMachineFieldsBehind(t *testing.T) {
	s := defaultSettings()
	s.Theme = ThemeDark
	s.Recent = []string{`C:\bi-mat\a.json`}
	s.API = APISettings{Enabled: true, Port: 4000, Token: "TOKEN-BI-MAT"}
	s.Storage = StorageSettings{ScriptsDir: `D:\rieng`}
	s.MCPServers = []MCPServer{{Name: "x", Command: "calc.exe"}}
	s.MCP = MCPSettings{Enabled: true, Run: AIRunAuto, MaxMinutes: 99, OffTools: []string{"run_script"}, TouchResumeS: 9}
	s.AI = AISettings{Kind: "openai", BaseURL: "https://rieng.local", Model: "m", Key: "{{secret.k}}"}
	b, err := s.EncodePortable()
	if err != nil {
		t.Fatal(err)
	}
	out := string(b)
	for _, leak := range []string{"TOKEN-BI-MAT", "bi-mat", "rieng", "calc.exe", "run_script", "auto", "4000"} {
		if strings.Contains(out, leak) {
			t.Errorf("rò rỉ %q ra cloud:\n%s", leak, out)
		}
	}
	for _, want := range []string{`"dark"`, `"touchResumeS": 9`, "{{secret.k}}"} {
		if !strings.Contains(out, want) {
			t.Errorf("thiếu %q trong cài đặt mang đi", want)
		}
	}
}

func TestApplyPortableKeepsMachineFields(t *testing.T) {
	src := defaultSettings()
	src.Theme = ThemeLight
	src.MCP.TouchResumeS = 9
	src.AI = AISettings{Kind: "openai", Model: "gpt", Key: "{{secret.k}}"}
	data, _ := src.EncodePortable()

	dst := defaultSettings()
	dst.Theme = ThemeDark
	dst.API = APISettings{Enabled: true, Port: 5000, Token: "T"}
	dst.MCP = MCPSettings{Enabled: false, Run: AIRunEdit, OffTools: []string{"x"}}
	dst.AI.BaseURL = "https://cua-toi"
	got, err := dst.ApplyPortable(data)
	if err != nil {
		t.Fatal(err)
	}
	if got.Theme != ThemeLight || got.MCP.TouchResumeS != 9 || got.AI.Model != "gpt" {
		t.Errorf("chưa nhận phần mang đi: %+v", got)
	}
	if got.API.Token != "T" || got.MCP.Enabled || got.MCP.Run != AIRunEdit || len(got.MCP.OffTools) != 1 || got.AI.BaseURL != "https://cua-toi" {
		t.Errorf("phần riêng máy bị đè: %+v", got)
	}
}

func TestApplyPortableRejectsHostileData(t *testing.T) {
	base := defaultSettings()
	for name, in := range map[string]string{
		"hỏng":            `{`,
		"theme lạ":        `{"theme":"neon"}`,
		"khoá thật":       `{"theme":"dark","ai":{"kind":"openai","key":"sk-that-su"}}`,
		"nhà cung cấp lạ": `{"theme":"dark","ai":{"kind":"khong-co"}}`,
	} {
		if _, err := base.ApplyPortable([]byte(in)); err == nil {
			t.Errorf("%s: phải bị từ chối", name)
		}
	}
	// BaseURL do cloud gửi lên bị bỏ qua
	got, err := base.ApplyPortable([]byte(`{"theme":"dark","ai":{"kind":"openai","baseUrl":"https://doc-hai"}}`))
	if err != nil || got.AI.BaseURL != "" {
		t.Errorf("BaseURL từ cloud phải bị bỏ: %+v %v", got.AI, err)
	}
}
