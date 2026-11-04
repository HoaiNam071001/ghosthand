package batch

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func items(names ...string) []Item {
	var out []Item
	for _, n := range names {
		out = append(out, Item{Name: n, Path: "/" + n})
	}
	return out
}

func TestRunContinuesAfterFail(t *testing.T) {
	b := Start("b1", items("a", "b", "c"), func(_ context.Context, it Item) (Row, bool) {
		if it.Name == "b" {
			return Row{State: RowFail, Code: "not_found", Node: "n2"}, false
		}
		return Row{State: RowSuccess}, false
	})
	st := b.Wait(context.Background())
	if st.State != StateDone || len(st.Rows) != 3 || st.Failed() != 1 || st.Rows[1].Name != "b" || st.Current != "" {
		t.Fatalf("%+v", st)
	}
}

func TestUserStopEndsBatch(t *testing.T) {
	b := Start("b1", items("a", "b", "c"), func(_ context.Context, it Item) (Row, bool) {
		return Row{State: RowStopped}, it.Name == "a"
	})
	if st := b.Wait(context.Background()); st.State != StateStopped || len(st.Rows) != 1 {
		t.Fatalf("%+v", st)
	}
}

func TestStopCancelsRunning(t *testing.T) {
	started := make(chan struct{})
	b := Start("b1", items("a", "b"), func(ctx context.Context, _ Item) (Row, bool) {
		close(started)
		<-ctx.Done()
		return Row{State: RowStopped}, true
	})
	<-started
	if st := b.Status(); st.Current != "a" || st.Done() {
		t.Fatalf("đang chạy: %+v", st)
	}
	b.Stop()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if st := b.Wait(ctx); st.State != StateStopped || len(st.Rows) != 1 {
		t.Fatalf("%+v", st)
	}
}

func TestResolve(t *testing.T) {
	dir := t.TempDir()
	for _, f := range []string{"a.json", "sub/b.json", ".git/x.json", "note.txt"} {
		p := filepath.Join(dir, f)
		_ = os.MkdirAll(filepath.Dir(p), 0o755)
		_ = os.WriteFile(p, []byte("{}"), 0o644)
	}
	got, err := Resolve([]string{dir, filepath.Join(dir, "a.json"), "mau:go-chu"}, Select{})
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, it := range got {
		names = append(names, it.Name)
	}
	if strings.Join(names, ",") != "a,sub/b,mau:go-chu" {
		t.Errorf("trùng / thư mục ẩn / file khác: %v", names)
	}
	if _, err := Resolve([]string{"mau:khong-co"}, Select{}); err == nil {
		t.Error("mẫu không có phải báo lỗi")
	}
	if _, err := Resolve([]string{"a.json"}, Select{}); err == nil {
		t.Error("đường dẫn tương đối phải báo lỗi")
	}
	if _, err := Resolve(nil, Select{}); err == nil {
		t.Error("không có gì để chạy phải báo lỗi")
	}
}

func TestResolveSamples(t *testing.T) {
	auto, _ := Resolve(nil, Select{Samples: true})
	all, _ := Resolve(nil, Select{All: true})
	has := func(list []Item, id string) bool {
		for _, it := range list {
			if it.Sample == id {
				return true
			}
		}
		return false
	}
	if len(auto) == 0 || len(all) <= len(auto) {
		t.Fatalf("auto %d, all %d", len(auto), len(all))
	}
	for _, id := range []string{"wiki-tim-bai", "bi-mat"} { // web thật / cần chuẩn bị tay
		if has(auto, id) || !has(all, id) {
			t.Errorf("%s: --samples phải bỏ, --all phải có", id)
		}
	}
	lv, _ := Resolve(nil, Select{Samples: true, Level: 3})
	if len(lv) == 0 || len(lv) >= len(auto) {
		t.Errorf("lọc mức 3: %d / %d", len(lv), len(auto))
	}
}

func TestTable(t *testing.T) {
	if got := RowLine(Row{Name: "go-chu", State: RowSuccess, Ms: 3200}, 8); got != "✓ go-chu    3.2 s" {
		t.Errorf("%q", got)
	}
	got := RowLine(Row{Name: "anh", State: RowFail, Code: "not_found", Node: "n4", Error: "không thấy ảnh", Ms: 65_000}, 3)
	if got != "✗ anh  1 phút 5 s  not_found n4 – không thấy ảnh" {
		t.Errorf("%q", got)
	}
	st := Status{State: StateStopped, Total: 5, Rows: []Row{{State: RowSuccess}, {State: RowStopped}}, Ms: 1500}
	if got := Summary(st); got != "Qua 1/5 · lỗi 1 · 1.5 s · đã dừng (3 kịch bản chưa chạy)" {
		t.Errorf("%q", got)
	}
}
