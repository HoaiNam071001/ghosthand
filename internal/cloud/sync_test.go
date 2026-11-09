package cloud_test

import (
	"context"
	"errors"
	"testing"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/cloudtest"
)

var all = cloud.Scope{Scripts: true, Settings: true, Secrets: true}

// device – một máy: kho riêng, state riêng, cùng một cloud.
type device struct {
	name  string
	local *cloudtest.MemLocal
	state cloud.State
}

func newDevice(name string, files map[string]string) *device {
	return &device{name: name, local: cloudtest.NewLocal(files), state: cloud.State{Files: map[string]string{}}}
}

func (d *device) sync(t *testing.T, remote cloud.Provider, scope cloud.Scope, resolve cloud.Resolver) cloud.Result {
	t.Helper()
	s := &cloud.Syncer{Remote: remote, Local: d.local, State: &d.state, Device: d.name, Scope: scope, Resolve: resolve}
	res, err := s.Run(context.Background())
	if err != nil {
		t.Fatalf("%s: %v", d.name, err)
	}
	return res
}

func TestDecideTable(t *testing.T) {
	cases := []struct {
		name                string
		local, base, remote string
		want                cloud.Action
	}{
		{"giống nhau", "a", "a", "a", cloud.ActNone},
		{"mới cả hai, giống", "a", "", "a", cloud.ActNone},
		{"chỉ máy đổi", "b", "a", "a", cloud.ActPush},
		{"chỉ cloud đổi", "a", "a", "b", cloud.ActPull},
		{"mới ở máy", "a", "", "", cloud.ActPush},
		{"mới ở cloud", "", "", "a", cloud.ActPull},
		{"máy xoá, cloud không đổi", "", "a", "a", cloud.ActDeleteRemote},
		{"cloud xoá, máy không đổi", "a", "a", "", cloud.ActDeleteLocal},
		{"cả hai đổi khác nhau", "b", "a", "c", cloud.ActConflict},
		{"mới cả hai, khác nhau", "b", "", "c", cloud.ActConflict},
		{"máy xoá, cloud sửa", "", "a", "c", cloud.ActConflict},
		{"máy sửa, cloud xoá", "b", "a", "", cloud.ActConflict},
		{"cả hai cùng xoá", "", "a", "", cloud.ActNone},
	}
	for _, c := range cases {
		if got := cloud.Decide(c.local, c.base, c.remote); got != c.want {
			t.Errorf("%s: %v, muốn %v", c.name, got, c.want)
		}
	}
}

func TestFirstSyncThenSecondDevice(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "X1", "settings.json": "S1"})
	res := a.sync(t, remote, all, nil)
	if len(res.Pushed) != 2 || !remote.Has(cloud.ManifestPath) {
		t.Fatalf("A chưa đẩy đủ: %+v", res)
	}
	b := newDevice("B", nil)
	res = b.sync(t, remote, all, nil)
	if len(res.Pulled) != 2 || b.local.Str("scripts/x.json") != "X1" {
		t.Fatalf("B chưa kéo đủ: %+v", res)
	}
	// lượt thứ hai: không có gì đổi, không Put thêm file nào
	remote.Puts = nil
	if res := a.sync(t, remote, all, nil); res.Changed() || len(remote.Puts) != 0 {
		t.Fatalf("lượt rỗng vẫn làm việc: %+v puts=%v", res, remote.Puts)
	}
}

func TestOnlyChangedFilesPushed(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/1.json": "1", "scripts/2.json": "2"})
	a.sync(t, remote, all, nil)
	remote.Puts = nil
	a.local.Write("scripts/2.json", []byte("2b"))
	a.sync(t, remote, all, nil)
	want := map[string]bool{"scripts/2.json": true, cloud.ManifestPath: true}
	if len(remote.Puts) != 2 || !want[remote.Puts[0]] || !want[remote.Puts[1]] {
		t.Fatalf("đẩy thừa file: %v", remote.Puts)
	}
}

func TestPropagateEditAndDelete(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "1", "scripts/y.json": "y"})
	b := newDevice("B", nil)
	a.sync(t, remote, all, nil)
	b.sync(t, remote, all, nil)
	b.local.Write("scripts/x.json", []byte("2"))
	b.local.Remove("scripts/y.json")
	b.sync(t, remote, all, nil)
	res := a.sync(t, remote, all, nil)
	if a.local.Str("scripts/x.json") != "2" || len(res.DeletedLocal) != 1 || a.local.Str("scripts/y.json") != "" {
		t.Fatalf("A chưa nhận sửa / xoá: %+v", res)
	}
	if remote.Has("scripts/y.json") {
		t.Fatal("file đã xoá vẫn còn trên cloud")
	}
}

func TestConflictNeverOverwritesWithoutResolver(t *testing.T) {
	remote, _, b := conflictSetup(t)
	res := b.sync(t, remote, all, nil)
	if len(res.Conflicts) != 1 || res.Conflicts[0].Device != "A" {
		t.Fatalf("muốn 1 xung đột từ máy A: %+v", res)
	}
	if b.local.Str("scripts/x.json") != "B1" || string(remote.Raw("scripts/x.json")) != "A1" {
		t.Fatal("xung đột bị tự ghi đè")
	}
	// Skip rõ ràng cũng không đổi gì
	res = b.sync(t, remote, all, func(cloud.Conflict) cloud.Choice { return cloud.Skip })
	if len(res.Conflicts) != 1 || b.local.Str("scripts/x.json") != "B1" {
		t.Fatalf("Skip đã đổi dữ liệu: %+v", res)
	}
}

// conflictSetup: A và B cùng sửa scripts/x.json (A đã đẩy A1, B còn B1 chưa đẩy).
func conflictSetup(t *testing.T) (*cloudtest.Fake, *device, *device) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "0"})
	b := newDevice("B", nil)
	a.sync(t, remote, all, nil)
	b.sync(t, remote, all, nil)
	a.local.Write("scripts/x.json", []byte("A1"))
	b.local.Write("scripts/x.json", []byte("B1"))
	a.sync(t, remote, all, nil)
	return remote, a, b
}

func TestResolveKeepLocal(t *testing.T) {
	remote, _, b := conflictSetup(t)
	b.sync(t, remote, all, func(cloud.Conflict) cloud.Choice { return cloud.KeepLocal })
	if string(remote.Raw("scripts/x.json")) != "B1" || b.local.Str("scripts/x.json") != "B1" {
		t.Fatal("KeepLocal không đẩy bản máy")
	}
}

func TestResolveTakeRemote(t *testing.T) {
	remote, _, b := conflictSetup(t)
	b.sync(t, remote, all, func(cloud.Conflict) cloud.Choice { return cloud.TakeRemote })
	if b.local.Str("scripts/x.json") != "A1" {
		t.Fatal("TakeRemote không lấy bản cloud")
	}
}

func TestResolveKeepBoth(t *testing.T) {
	remote, a, b := conflictSetup(t)
	res := b.sync(t, remote, all, func(cloud.Conflict) cloud.Choice { return cloud.KeepBoth })
	alt := "scripts/x (A).json"
	if len(res.Kept) != 1 || res.Kept[0] != alt {
		t.Fatalf("tên bản thứ hai: %+v", res.Kept)
	}
	if b.local.Str("scripts/x.json") != "B1" || b.local.Str(alt) != "A1" {
		t.Fatal("máy B mất một trong hai bản")
	}
	if string(remote.Raw("scripts/x.json")) != "B1" || string(remote.Raw(alt)) != "A1" {
		t.Fatal("cloud chưa có đủ hai bản")
	}
	a.sync(t, remote, all, nil) // máy A nhận cả hai, không xung đột nữa
	if a.local.Str("scripts/x.json") != "B1" || a.local.Str(alt) != "A1" {
		t.Fatal("máy A không nhận đủ")
	}
}

func TestConflictDeleteVsEdit(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "0"})
	b := newDevice("B", nil)
	a.sync(t, remote, all, nil)
	b.sync(t, remote, all, nil)
	a.local.Remove("scripts/x.json")
	a.sync(t, remote, all, nil)
	b.local.Write("scripts/x.json", []byte("B1"))
	res := b.sync(t, remote, all, func(c cloud.Conflict) cloud.Choice {
		if c.RemoteHash != "" {
			t.Errorf("cloud đã xoá, RemoteHash phải rỗng")
		}
		return cloud.KeepBoth // một bên xoá → giữ bản còn lại
	})
	if len(res.Kept) != 0 || string(remote.Raw("scripts/x.json")) != "B1" {
		t.Fatalf("giữ bản còn lại: %+v", res)
	}
}

func TestHoldDefersPull(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "1", "scripts/y.json": "1"})
	b := newDevice("B", nil)
	a.sync(t, remote, all, nil)
	b.sync(t, remote, all, nil)
	a.local.Write("scripts/x.json", []byte("2"))
	a.local.Write("scripts/y.json", []byte("2"))
	a.sync(t, remote, all, nil)
	s := &cloud.Syncer{Remote: remote, Local: b.local, State: &b.state, Device: "B", Scope: all,
		Hold: func(p string) bool { return p == "scripts/x.json" }}
	res, err := s.Run(context.Background())
	if err != nil || len(res.Held) != 1 || b.local.Str("scripts/x.json") != "1" || b.local.Str("scripts/y.json") != "2" {
		t.Fatalf("hoãn kéo file đang mở: %+v %v", res, err)
	}
	// hết bị giữ thì kéo
	b.sync(t, remote, all, nil)
	if b.local.Str("scripts/x.json") != "2" {
		t.Fatal("lượt sau không kéo")
	}
}

func TestScopeLimitsFiles(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "1", "settings.json": "S", "secrets.enc": "ENC"})
	a.sync(t, remote, cloud.Scope{Scripts: true}, nil)
	if remote.Has("settings.json") || remote.Has("secrets.enc") || !remote.Has("scripts/x.json") {
		t.Fatal("đẩy ngoài phạm vi")
	}
	if (cloud.Scope{}).Includes(cloud.SecretsPath) {
		t.Fatal("bí mật phải tắt mặc định")
	}
}

func TestAssetsNeverDeleted(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"assets/ab12/a.png": "PNG", "scripts/x.json": "1"})
	a.sync(t, remote, all, nil)
	a.local.Remove("assets/ab12/a.png") // kịch bản thôi dùng tệp này
	a.sync(t, remote, all, nil)
	if !remote.Has("assets/ab12/a.png") {
		t.Fatal("tệp đi kèm bị xoá khỏi cloud")
	}
}

func TestOtherDevicePushedMeanwhile(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "0"})
	a.sync(t, remote, all, nil)
	b := newDevice("B", nil)
	b.sync(t, remote, all, nil)
	// A sửa; ngay khi A đẩy file đầu tiên thì B đẩy xen vào → manifest đổi, A phải đọc lại và làm tiếp
	a.local.Write("scripts/x.json", []byte("A1"))
	b.local.Write("scripts/z.json", []byte("Z"))
	remote.FailPut = func(p string) error {
		if p == "scripts/x.json" {
			remote.FailPut = nil
			b.sync(t, remote, all, nil)
		}
		return nil
	}
	a.sync(t, remote, all, nil)
	if string(remote.Raw("scripts/x.json")) != "A1" || !remote.Has("scripts/z.json") {
		t.Fatal("mất dữ liệu khi hai máy đẩy cùng lúc")
	}
	if a.local.Str("scripts/z.json") != "Z" {
		t.Fatal("A chưa nhận file của B sau khi làm lại")
	}
}

func TestPutFailureKeepsProgress(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/1.json": "1", "scripts/2.json": "2"})
	boom := errors.New("mất mạng")
	remote.FailPut = func(p string) error {
		if p == "scripts/2.json" {
			return boom
		}
		return nil
	}
	s := &cloud.Syncer{Remote: remote, Local: a.local, State: &a.state, Device: "A", Scope: all}
	if _, err := s.Run(context.Background()); !errors.Is(err, boom) {
		t.Fatalf("muốn lỗi mạng, được %v", err)
	}
	remote.FailPut = nil
	res := a.sync(t, remote, all, nil)
	if len(res.Pushed) != 1 || res.Pushed[0] != "scripts/2.json" {
		t.Fatalf("lượt sau chỉ cần đẩy phần còn lại: %+v", res)
	}
}

func TestCorruptRemoteDetected(t *testing.T) {
	remote := cloudtest.New()
	a := newDevice("A", map[string]string{"scripts/x.json": "1"})
	a.sync(t, remote, all, nil)
	remote.Put(context.Background(), "scripts/x.json", []byte("khác manifest"), cloud.IfAny)
	b := newDevice("B", nil)
	s := &cloud.Syncer{Remote: remote, Local: b.local, State: &b.state, Device: "B", Scope: all}
	if _, err := s.Run(context.Background()); err == nil {
		t.Fatal("phải báo lỗi khi nội dung trên cloud không khớp manifest")
	}
	if b.local.Str("scripts/x.json") != "" {
		t.Fatal("đã ghi nội dung không khớp")
	}
}
