package app

import (
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"sync"

	"ghosthand/internal/launch"
	"ghosthand/internal/model"
	"ghosthand/internal/samples"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/wisp"
)

// Kịch bản mẫu để test (bước 33): danh sách, mở bản sao, mở trang sân thử.

// Samples trả danh sách kịch bản mẫu.
func (a *App) Samples() ([]samples.Info, error) { return samples.List() }

// OpenSample ghi sân thử ra ConfigDir/sandbox rồi trả kịch bản của mẫu id (target trỏ tới trang trong đó).
// Frontend mở như kịch bản mới chưa lưu – mẫu gốc không đổi.
func (a *App) OpenSample(id string) (model.Script, error) {
	url, err := sandboxURL()
	if err != nil {
		return model.Script{}, err
	}
	return samples.Open(id, url)
}

// OpenSandboxPage mở trang sân thử (vd click.html; "" = danh sách trang) bằng trình duyệt mặc định.
// Mẫu web thật: page là URL – mở thẳng.
func (a *App) OpenSandboxPage(page string) error {
	if strings.Contains(page, "://") {
		return launch.OpenTarget(page, "")
	}
	url, err := sandboxURL()
	if err != nil {
		return err
	}
	if page == "" {
		page = "index.html"
	}
	return launch.OpenTarget(url+"/"+page, "")
}

func sandboxURL() (string, error) {
	cfg, err := store.ConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(cfg, "sandbox")
	if err := samples.WriteSandbox(dir); err != nil {
		return "", err
	}
	if use, _ := session.UseWisp(store.CurrentSettings().Web.Browser, wisp.Running); use {
		return sandboxHTTP(dir)
	}
	return samples.FileURL(dir), nil
}

// sandboxSrv – sân thử qua http cho Wisp (cổng Wisp chỉ mở http(s), không file://): chỉ 127.0.0.1, cổng ngẫu nhiên,
// chỉ đọc thư mục sân thử; bật lần đầu cần, sống tới khi app tắt.
var sandboxSrv struct {
	once sync.Once
	url  string
	err  error
}

func sandboxHTTP(dir string) (string, error) {
	sandboxSrv.once.Do(func() {
		l, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			sandboxSrv.err = err
			return
		}
		go func() { _ = http.Serve(l, http.FileServer(http.Dir(dir))) }()
		sandboxSrv.url = "http://" + l.Addr().String()
	})
	return sandboxSrv.url, sandboxSrv.err
}
