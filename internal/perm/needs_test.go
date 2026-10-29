package perm

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"

	"ghosthand/internal/model"
)

// Cùng dữ liệu với frontend/src/flow/perms.test.ts (testdata/perms.json).
func TestNeedsOfShared(t *testing.T) {
	var data struct {
		Cases []struct {
			Name string
			Step model.Step
			Want []ID
		}
	}
	b, err := os.ReadFile("../../testdata/perms.json")
	if err == nil {
		err = json.Unmarshal(b, &data)
	}
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range data.Cases {
		got := NeedsOf(c.Step)
		if len(got) == 0 && len(c.Want) == 0 {
			continue
		}
		if !reflect.DeepEqual(got, c.Want) {
			t.Errorf("%s: %v, muốn %v", c.Name, got, c.Want)
		}
	}
}

func TestNeedsSkipsDisabled(t *testing.T) {
	sc := model.Script{Steps: []model.Step{{Type: model.StepClick}, {Type: model.StepScreenshot, Enabled: true}}}
	if got := Needs(sc); !reflect.DeepEqual(got, []ID{ScreenRecording}) {
		t.Errorf("got %v", got)
	}
}

// Thêm loại node mới mà quên nghĩ tới quyền → test đỏ: phải có ít nhất một ca cần quyền trong perms.json, hoặc ghi vào
// noPermTypes (node không cần quyền nào dù chọn thao tác gì). Danh sách này giữ cùng frontend/src/flow/perms.test.ts.
var noPermTypes = []string{"wait", "open", "clipboard", "http", "system", "waitUntil", "window", "app", "webWait", "webRead", "webKey",
	"waitDownload", "shell", "osShortcut", "sysInfo", "process", "zip", "switch", "counter", "forEach", "end", "setVar", "calc",
	"textMatch", "textSplit", "textClean", "textNumber", "mcpTool"}

func TestEveryStepTypeDeclared(t *testing.T) {
	var data struct {
		Cases []struct {
			Step model.Step
			Want []ID
		}
	}
	b, err := os.ReadFile("../../testdata/perms.json")
	if err == nil {
		err = json.Unmarshal(b, &data)
	}
	if err != nil {
		t.Fatal(err)
	}
	declared := map[string]bool{}
	for _, ty := range noPermTypes {
		declared[ty] = true
	}
	for _, c := range data.Cases {
		if len(c.Want) > 0 {
			declared[c.Step.Type] = true
		}
	}
	for _, ty := range model.StepTypes {
		if !declared[ty] {
			t.Errorf("loại node %q chưa khai báo quyền: thêm ca vào testdata/perms.json hoặc noPermTypes", ty)
		}
	}
}
