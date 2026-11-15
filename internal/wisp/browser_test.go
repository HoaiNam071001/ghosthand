package wisp

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// testBrowser – Browser nối cổng giả qua ghosthand.json trong thư mục tạm; calls ghi lệnh + đối số đã nhận.
func testBrowser(t *testing.T, handle func(cmd string, args map[string]any) (any, *CmdError)) (*Browser, func() []string, func(cmd string) map[string]any) {
	var mu sync.Mutex
	var cmds []string
	last := map[string]map[string]any{}
	in, _ := fakeWisp(t, func(cmd string, args map[string]any) (any, *CmdError) {
		mu.Lock()
		cmds, last[cmd] = append(cmds, cmd), args
		mu.Unlock()
		return handle(cmd, args)
	})
	dir := t.TempDir()
	b, _ := json.Marshal(in)
	if err := os.WriteFile(filepath.Join(dir, infoFile), b, 0o600); err != nil {
		t.Fatal(err)
	}
	br := &Browser{dir: dir, dialogs: map[int]*web.Dialog{}, navs: map[int]int{}}
	t.Cleanup(br.Close)
	return br, func() []string { mu.Lock(); defer mu.Unlock(); return append([]string(nil), cmds...) },
		func(cmd string) map[string]any { mu.Lock(); defer mu.Unlock(); return last[cmd] }
}

func TestBrowserFindClickType(t *testing.T) {
	br, cmds, args := testBrowser(t, func(cmd string, a map[string]any) (any, *CmdError) {
		switch cmd {
		case "tabs":
			return []map[string]any{{"id": 3, "url": "https://shop.vn/", "active": true}}, nil
		case "find":
			return map[string]any{"selectorIndex": 0, "found": []map[string]any{
				{"ref": "pg.7", "rect": map[string]int{"x": 100, "y": 50, "w": 80, "h": 20}, "inView": true, "text": "Mua"}}}, nil
		case "focused":
			return map[string]any{"ok": true, "ref": "pg.8"}, nil
		}
		return map[string]any{}, nil
	})
	ctx := context.Background()
	sel, _ := model.ParseSelector(`role=button[name="Mua"]`)
	f, err := br.Find(ctx, web.Query{Selectors: []model.Selector{sel}, Scroll: true, Background: true})
	if err != nil || !f.OK || f.Rect.X != 100 || f.Tab != "https://shop.vn/" {
		t.Fatalf("Find: %+v %v", f, err)
	}
	if a := args("find"); a["tab"] != "3" || a["selectors"].([]any)[0] != `role=button[name="Mua"]` || a["brief"] != true {
		t.Errorf("đối số find: %v", a)
	}
	if err := br.BgClick(ctx, 140, 60, "left", 1); err != nil {
		t.Fatal(err)
	}
	if a := args("click"); a["ref"] != "pg.7" || a["offset"].(map[string]any)["x"] != 40.0 || a["offset"].(map[string]any)["y"] != 10.0 {
		t.Errorf("click: %v", a)
	}
	if ok, _, err := br.Focused(ctx); !ok || err != nil {
		t.Errorf("Focused: %v %v", ok, err)
	}
	if err := br.BgType(ctx, "xin chào", true, true); err != nil {
		t.Fatal(err)
	}
	if a := args("type"); a["ref"] != nil || a["text"] != "xin chào" || a["clear"] != true {
		t.Errorf("type gõ vào ô đang nhận phím (không đích): %v", a)
	}
	if c := cmds(); c[0] != "subscribe" {
		t.Errorf("lệnh đầu phải là subscribe: %v", c)
	}
}

func TestBrowserDialogGate(t *testing.T) {
	br, _, args := testBrowser(t, func(cmd string, a map[string]any) (any, *CmdError) {
		switch cmd {
		case "tabs":
			return []map[string]any{{"id": 2, "url": "https://a/", "active": true}}, nil
		case "find":
			return map[string]any{"selectorIndex": -1, "found": []any{}}, nil
		}
		return map[string]any{}, nil
	})
	ctx := context.Background()
	sel, _ := model.ParseSelector("text=OK")
	q := web.Query{Selectors: []model.Selector{sel}}
	if _, err := br.Find(ctx, q); err != nil { // nối + nhận sự kiện dialog của cổng giả (tab 2)
		t.Fatal(err)
	}
	for i := 0; i < 50; i++ {
		br.mu.Lock()
		n := len(br.dialogs)
		br.mu.Unlock()
		if n > 0 {
			break
		}
		sleepCtx(ctx, 20e6)
	}
	f, _ := br.Find(ctx, q)
	if f.Dialog == nil || f.Dialog.Message != "Xin chào" {
		t.Fatalf("hộp thoại đang mở phải báo ngay: %+v", f)
	}
	q.Dialog = model.WebDialogAccept
	f, err := br.Find(ctx, q)
	if err != nil || f.Handled == nil || args("dialog")["accept"] != true {
		t.Errorf("accept rồi tìm tiếp: %+v %v %v", f, err, args("dialog"))
	}
}
