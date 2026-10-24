package store

import (
	"testing"

	"ghosthand/internal/model"
)

func TestPinsRoundTrip(t *testing.T) {
	d := t.TempDir()
	t.Setenv("HOME", d)
	t.Setenv("XDG_CONFIG_HOME", d)
	t.Setenv("AppData", d)
	if len(Pins("A", "/x/a.json")) != 0 {
		t.Fatal("chưa ghim thì rỗng")
	}
	r := model.StepResult{NodeID: "s1", Status: model.StatusSuccess, Output: map[string]any{"text": "xin chào"}}
	if err := SetPin("A", "/x/a.json", r); err != nil {
		t.Fatal(err)
	}
	if got := Pins("A", "/x/a.json")["s1"]; got.Output["text"] != "xin chào" {
		t.Fatalf("đọc lại: %+v", got)
	}
	if len(Pins("A", "/x/b.json")) != 0 {
		t.Fatal("kịch bản khác không thấy ghim")
	}
	if err := ClearPin("A", "/x/a.json", "s1"); err != nil || len(Pins("A", "/x/a.json")) != 0 {
		t.Fatalf("bỏ ghim: %v", err)
	}
}
