package cloud_test

import (
	"context"
	"testing"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/cloudtest"
)

// Ba nguồn (kịch bản, cài đặt, bí mật) qua một Syncer: mỗi file đi đúng nguồn, phạm vi tắt thì không đụng.
func TestMultiRoutesByPathAndScope(t *testing.T) {
	scripts := cloudtest.NewLocal(map[string]string{cloud.ScriptsDir + "a.json": `{"a":1}`})
	var imported []byte
	settings := cloud.SettingsLocal{
		Export: func() ([]byte, error) { return []byte(`{"theme":"dark"}`), nil },
		Import: func(b []byte) error { imported = b; return nil },
	}
	m := &cloud.Multi{}
	m.Add(scripts, cloud.ScriptsDir)
	m.Add(settings, cloud.SettingsPath)

	remote := cloudtest.New()
	st := cloud.State{}
	sy := &cloud.Syncer{Remote: remote, Local: m, State: &st, Device: "A", Scope: cloud.Scope{Scripts: true, Settings: true}}
	res, err := sy.Run(context.Background())
	if err != nil || len(res.Pushed) != 2 {
		t.Fatalf("đẩy lần đầu: %+v %v", res, err)
	}
	// máy khác (chưa có gì) kéo về: cài đặt đi vào Import, kịch bản vào thư mục
	scripts2 := cloudtest.NewLocal(nil)
	m2 := &cloud.Multi{}
	m2.Add(scripts2, cloud.ScriptsDir)
	settings2 := cloud.SettingsLocal{
		Export: func() ([]byte, error) { return []byte(`{"theme":"light"}`), nil },
		Import: func(b []byte) error { imported = b; return nil },
	}
	m2.Add(settings2, cloud.SettingsPath)
	st2 := cloud.State{}
	sy2 := &cloud.Syncer{Remote: remote, Local: m2, State: &st2, Device: "B", Scope: cloud.Scope{Scripts: true, Settings: true},
		Resolve: func(cloud.Conflict) cloud.Choice { return cloud.TakeRemote }}
	if _, err := sy2.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if string(scripts2.F[cloud.ScriptsDir+"a.json"]) != `{"a":1}` || string(imported) != `{"theme":"dark"}` {
		t.Fatalf("kéo về sai: %v %s", scripts2.F, imported)
	}
}
