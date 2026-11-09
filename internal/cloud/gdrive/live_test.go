package gdrive

import (
	"context"
	"os"
	"testing"
	"time"

	"ghosthand/internal/cloud"
	"ghosthand/internal/launch"
)

// Thử thật với Google (mở trình duyệt, cần người bấm đồng ý): GHOSTHAND_LIVE_GDRIVE=1 và khoá trong
// GHOSTHAND_GOOGLE_CLIENT_ID / _SECRET (hoặc -ldflags). Tạo rồi xoá file thử trong thư mục Ghosthand/_livetest của Drive.
func TestLiveGoogleDrive(t *testing.T) {
	if os.Getenv("GHOSTHAND_LIVE_GDRIVE") != "1" {
		t.Skip("đặt GHOSTHAND_LIVE_GDRIVE=1 để thử với Google thật")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
	defer cancel()
	a := &Auth{Store: &memTokens{}}
	if err := a.Login(ctx, func(u string) error { return launch.OpenTarget(u, "") }); err != nil {
		t.Fatal(err)
	}
	d := &Drive{Auth: a}
	p := "_livetest/thu.json"
	v1, err := d.Put(ctx, p, []byte(`{"lan":1}`), cloud.IfAny)
	if err != nil {
		t.Fatalf("Put: %v", err)
	}
	b, v, err := d.Get(ctx, p)
	if err != nil || string(b) != `{"lan":1}` || v != v1 {
		t.Fatalf("Get: %q %q %v (version Put %q)", b, v, err, v1)
	}
	if _, err := d.Put(ctx, p, []byte("x"), "sai-version"); err != cloud.ErrPrecondition {
		t.Fatalf("ifMatch sai phải ErrPrecondition: %v", err)
	}
	v2, err := d.Put(ctx, p, []byte(`{"lan":2}`), v1)
	if err != nil || v2 == v1 {
		t.Fatalf("ghi đè đúng version: %q %v", v2, err)
	}
	if err := d.Delete(ctx, p); err != nil {
		t.Fatal(err)
	}
	if _, _, err := d.Get(ctx, p); err != cloud.ErrNotFound {
		t.Fatalf("sau xoá: %v", err)
	}
	if err := a.Logout(ctx); err != nil {
		t.Fatal(err)
	}
}
