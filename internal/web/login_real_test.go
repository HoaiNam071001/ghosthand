package web

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Đăng nhập: Chrome của app mở lại không cổng điều khiển (node web không tự bật được), cookie đặt lúc đó còn sau Xong
// (mở lại chế độ điều khiển). Chỉ khi GHOSTHAND_REAL=1.
func TestRealLogin(t *testing.T) {
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để thử với Chrome thật")
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/login" {
			http.SetCookie(w, &http.Cookie{Name: "phien", Value: "da-dang-nhap", MaxAge: 3600, Path: "/"})
		}
		_, _ = w.Write([]byte("<!doctype html><title>Sân thử đăng nhập</title>ok"))
	}))
	defer srv.Close()
	c := NewChrome(filepath.Join(os.TempDir(), "ghosthand-test-browser"), func(int, int) error { return nil })
	defer c.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	if err := c.Open(ctx, srv.URL+"/home"); err != nil { // đang chế độ điều khiển → phải đóng trước khi mở đăng nhập
		t.Fatal(err)
	}
	if err := c.StartLogin(ctx, srv.URL+"/login"); err != nil {
		t.Fatal(err)
	}
	time.Sleep(4 * time.Second) // trang đặt cookie
	if st := c.Status(ctx); !st.Login || st.Open {
		t.Errorf("đang đăng nhập: %+v", st)
	}
	if err := c.Open(ctx, srv.URL); err != errLoggingIn {
		t.Errorf("node web khi đang đăng nhập: %v", err)
	}
	if err := c.FinishLogin(ctx, srv.URL+"/home"); err != nil {
		t.Fatal(err)
	}
	if st := c.Status(ctx); st.Login || !st.Open {
		t.Errorf("sau Xong: %+v", st)
	}
	tab, _, err := c.tabFor(ctx, "/home")
	if err != nil {
		t.Fatal(err)
	}
	cookie, err := evalJS[string](ctx, tab.ctx, "đọc cookie", "document.cookie")
	if err != nil || !strings.Contains(cookie, "phien=da-dang-nhap") {
		t.Errorf("cookie sau Xong: %q %v", cookie, err)
	}
}
