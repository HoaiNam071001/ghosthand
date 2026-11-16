package store

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSettingsRoundTrip(t *testing.T) {
	dir := t.TempDir()
	if got := loadSettings(dir); got.Theme != ThemeSystem {
		t.Fatalf("chưa có file: theme = %q, muốn %q", got.Theme, ThemeSystem)
	}
	if err := saveSettings(dir, Settings{Theme: ThemeDark}); err != nil {
		t.Fatal(err)
	}
	if got := loadSettings(dir); got.Theme != ThemeDark {
		t.Fatalf("đọc lại: theme = %q, muốn %q", got.Theme, ThemeDark)
	}
	if _, err := os.Stat(filepath.Join(dir, settingsFile+".tmp")); !os.IsNotExist(err) {
		t.Fatalf("file tạm còn sót: %v", err)
	}
}

func TestSettingsBadFile(t *testing.T) {
	dir := t.TempDir()
	for _, content := range []string{"{hỏng", `{"theme":"tím"}`} {
		if err := os.WriteFile(filepath.Join(dir, settingsFile), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
		if got := loadSettings(dir); got.Theme != ThemeSystem {
			t.Errorf("%s: theme = %q, muốn %q", content, got.Theme, ThemeSystem)
		}
	}
}

func TestLanguageSettings(t *testing.T) {
	dir := t.TempDir()
	if got := loadSettings(dir); got.Language != "system" {
		t.Fatalf("chưa có file: language = %q, muốn system", got.Language)
	}
	if err := saveSettings(dir, Settings{Theme: ThemeDark, Language: "en"}); err != nil {
		t.Fatal(err)
	}
	if got := loadSettings(dir); got.Language != "en" {
		t.Fatalf("đọc lại: language = %q, muốn en", got.Language)
	}
	if err := saveSettings(dir, Settings{Theme: ThemeDark, Language: "fr"}); err != nil {
		t.Fatal(err)
	}
	if got := loadSettings(dir); got.Language != "system" {
		t.Fatalf("giá trị lạ phải về system, được %q", got.Language)
	}
}
