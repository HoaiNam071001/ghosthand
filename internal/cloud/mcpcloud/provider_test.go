package mcpcloud

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/cloudtest"
	"ghosthand/internal/cloud/mcpmap"
	"ghosthand/internal/mcpclient"
)

// fakeFS – server kiểu Filesystem trong bộ nhớ: không tự tạo thư mục cha, báo lỗi dạng chữ khi thiếu file.
type fakeFS struct {
	mu    sync.Mutex
	files map[string]string
	dirs  map[string]bool
	calls []string
}

type args struct {
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
}

func (f *fakeFS) client(t *testing.T, withDelete bool) mcpclient.Client {
	srv := mcp.NewServer(&mcp.Implementation{Name: "fakefs", Version: "1"}, nil)
	text := func(s string, isErr bool) *mcp.CallToolResult {
		return &mcp.CallToolResult{IsError: isErr, Content: []mcp.Content{&mcp.TextContent{Text: s}}}
	}
	add := func(name string, h func(a args) *mcp.CallToolResult) {
		mcp.AddTool(srv, &mcp.Tool{Name: name}, func(_ context.Context, _ *mcp.CallToolRequest, a args) (*mcp.CallToolResult, any, error) {
			f.mu.Lock()
			defer f.mu.Unlock()
			f.calls = append(f.calls, name)
			return h(a), nil, nil
		})
	}
	add("read_text_file", func(a args) *mcp.CallToolResult {
		c, ok := f.files[a.Path]
		if !ok {
			return text("ENOENT: no such file or directory, open '"+a.Path+"'", true)
		}
		return text(c, false)
	})
	add("write_file", func(a args) *mcp.CallToolResult {
		dir := a.Path[:strings.LastIndex(a.Path, "/")]
		if !f.dirs[dir] {
			return text("ENOENT: parent directory missing", true)
		}
		f.files[a.Path] = a.Content
		return text("ok", false)
	})
	add("create_directory", func(a args) *mcp.CallToolResult { f.dirs[a.Path] = true; return text("ok", false) })
	if withDelete {
		add("delete_file", func(a args) *mcp.CallToolResult {
			if _, ok := f.files[a.Path]; !ok {
				return text("not found", true)
			}
			delete(f.files, a.Path)
			return text("ok", false)
		})
	}
	ct, st := mcp.NewInMemoryTransports()
	if _, err := srv.Connect(context.Background(), st, nil); err != nil {
		t.Fatal(err)
	}
	cl, err := mcpclient.DialTransport(context.Background(), ct)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cl.Close() })
	return cl
}

func newProvider(t *testing.T, withDelete bool) (*Provider, *fakeFS) {
	f := &fakeFS{files: map[string]string{}, dirs: map[string]bool{}}
	cl := f.client(t, withDelete)
	m := mcpmap.Presets()[0].Mapping
	m.Server, m.Root = "fs", "/sync/Ghosthand"
	if withDelete {
		m.DeleteTool = "delete_file"
	}
	return &Provider{Map: m, Call: func(ctx context.Context, tool string, a map[string]any) (mcpclient.Result, error) {
		return cl.CallTool(ctx, tool, a)
	}}, f
}

func TestRoundTripBinary(t *testing.T) {
	p, f := newProvider(t, true)
	ctx := context.Background()
	if _, _, err := p.Get(ctx, "scripts/a.json"); !errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("file chưa có phải ErrNotFound, được %v", err)
	}
	data := []byte{0, 1, 2, 0xff, 0xfe, '\n', 'x'} // nhị phân (ảnh mẫu / bản mã) đi qua tool chỉ có chữ
	v1, err := p.Put(ctx, "scripts/a.json", data, "")
	if err != nil {
		t.Fatal(err)
	}
	if f.files["/sync/Ghosthand/scripts/a.json"] == string(data) {
		t.Fatal("nội dung phải được mã hoá base64 khi gửi")
	}
	got, v2, err := p.Get(ctx, "scripts/a.json")
	if err != nil || string(got) != string(data) || v1 != v2 {
		t.Fatalf("get = %v %q %v", err, got, v2)
	}
}

func TestIfMatch(t *testing.T) {
	p, _ := newProvider(t, true)
	ctx := context.Background()
	v1, _ := p.Put(ctx, "x.json", []byte("1"), "")
	if _, err := p.Put(ctx, "x.json", []byte("2"), ""); !errors.Is(err, cloud.ErrPrecondition) {
		t.Errorf("tạo mới đè file có sẵn phải ErrPrecondition, được %v", err)
	}
	if _, err := p.Put(ctx, "x.json", []byte("2"), "sai"); !errors.Is(err, cloud.ErrPrecondition) {
		t.Errorf("sai version phải ErrPrecondition, được %v", err)
	}
	if _, err := p.Put(ctx, "nope.json", []byte("2"), v1); !errors.Is(err, cloud.ErrPrecondition) {
		t.Errorf("file mất mà ifMatch có version phải ErrPrecondition, được %v", err)
	}
	if _, err := p.Put(ctx, "x.json", []byte("2"), v1); err != nil {
		t.Errorf("đúng version phải ghi được: %v", err)
	}
	if _, err := p.Put(ctx, "x.json", []byte("3"), cloud.IfAny); err != nil {
		t.Errorf("IfAny phải ghi được: %v", err)
	}
}

func TestForeignFileIsPrecondition(t *testing.T) {
	p, f := newProvider(t, false)
	f.dirs["/sync/Ghosthand"] = true
	f.files["/sync/Ghosthand/y.json"] = "not base64 !!!"
	if _, err := p.Put(context.Background(), "y.json", []byte("1"), ""); !errors.Is(err, cloud.ErrPrecondition) {
		t.Errorf("file lạ phải ErrPrecondition để Syncer hỏi/ghi đè có chủ đích, được %v", err)
	}
}

func TestDelete(t *testing.T) {
	p, f := newProvider(t, true)
	ctx := context.Background()
	_, _ = p.Put(ctx, "d.json", []byte("1"), "")
	if err := p.Delete(ctx, "d.json"); err != nil || len(f.files) != 0 {
		t.Fatalf("delete: %v %v", err, f.files)
	}
	if err := p.Delete(ctx, "d.json"); err != nil {
		t.Errorf("xoá file không có coi như xong: %v", err)
	}
	q, g := newProvider(t, false) // server không có tool xoá
	_, _ = q.Put(ctx, "d.json", []byte("1"), "")
	if err := q.Delete(ctx, "d.json"); err != nil || len(g.files) != 1 {
		t.Errorf("không có tool xoá: bỏ qua, file mồ côi giữ nguyên (%v %v)", err, g.files)
	}
}

func TestMkdirOncePerDir(t *testing.T) {
	p, f := newProvider(t, false)
	ctx := context.Background()
	for _, n := range []string{"scripts/a.json", "scripts/b.json"} {
		if _, err := p.Put(ctx, n, []byte("1"), cloud.IfAny); err != nil {
			t.Fatal(err)
		}
	}
	n := 0
	for _, c := range f.calls {
		if c == "create_directory" {
			n++
		}
	}
	if n != 1 {
		t.Errorf("tạo thư mục %d lần, muốn 1", n)
	}
}

func TestMappingCheck(t *testing.T) {
	m := mcpmap.Presets()[0].Mapping
	if m.Check() == nil {
		t.Error("thiếu server / thư mục gốc phải lỗi")
	}
	m.Server, m.Root = "fs", "/x"
	if err := m.Check(); err != nil {
		t.Error(err)
	}
	m.ContentArg = ""
	if m.Check() == nil {
		t.Error("thiếu đối số nội dung phải lỗi")
	}
}

// Syncer chạy trọn vòng trên provider MCP: đẩy, rồi máy thứ hai kéo về.
func TestSyncerOverMCP(t *testing.T) {
	p, _ := newProvider(t, false)
	a, b := cloudtest.NewLocal(map[string]string{"scripts/k.json": `{"name":"k"}`}), cloudtest.NewLocal(nil)
	ctx := context.Background()
	sa := &cloud.Syncer{Remote: p, Local: a, State: &cloud.State{}, Device: "A", Scope: cloud.Scope{Scripts: true}}
	if _, err := sa.Run(ctx); err != nil {
		t.Fatal(err)
	}
	sb := &cloud.Syncer{Remote: p, Local: b, State: &cloud.State{}, Device: "B", Scope: cloud.Scope{Scripts: true}}
	if _, err := sb.Run(ctx); err != nil {
		t.Fatal(err)
	}
	if got := b.F["scripts/k.json"]; string(got) != `{"name":"k"}` {
		t.Errorf("máy B nhận %q", got)
	}
}

func TestToolErrorTruncated(t *testing.T) {
	e := &toolError{tool: "write_file", msg: strings.Repeat("ê", 500)}
	if n := len([]rune(e.Error())); n > 260 {
		t.Errorf("lời báo của server phải cắt ngắn, dài %d ký tự", n)
	}
	if !strings.Contains(e.Error(), "write_file") {
		t.Error("lời báo phải nêu tên tool")
	}
}
