package wisp

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"ghosthand/internal/model"
	"ghosthand/internal/web"
)

// Thử với Wisp thật: WISP_REAL=1, WISP_USER_DATA = thư mục dữ liệu của Wisp dev đang chạy, WISP_TEST_URL = trang thử
// (h1, ô #name có nhãn "Họ tên", nút Gửi ghi #out, nút Báo alert, link Sang B, nút xa cuối trang, nút Lưu trong
// role=dialog + Lưu ngoài).
func TestRealWisp(t *testing.T) {
	if os.Getenv("WISP_REAL") != "1" {
		t.Skip("đặt WISP_REAL=1 + WISP_USER_DATA + WISP_TEST_URL để thử với Wisp thật")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	b := New(false)
	defer b.Close()
	if err := b.Open(ctx, os.Getenv("WISP_TEST_URL")); err != nil {
		t.Fatal(err)
	}
	q := func(lines ...string) web.Query {
		var qs web.Query
		for _, l := range lines {
			s, _ := model.ParseSelector(l)
			qs.Selectors = append(qs.Selectors, s)
		}
		qs.Background = true
		return qs
	}
	waitFound := func(qq web.Query) web.Found {
		for i := 0; i < 40; i++ {
			f, err := b.Find(ctx, qq)
			if err != nil {
				t.Fatal(err)
			}
			if f.OK {
				return f
			}
			time.Sleep(150 * time.Millisecond)
		}
		t.Fatalf("không thấy %+v", qq.Selectors)
		return web.Found{}
	}
	// gõ: tìm ô theo nhãn, bấm, kiểm focus, xoá chữ cũ + gõ
	in := q(`label="Họ tên"`)
	in.Scroll = true
	f := waitFound(in)
	c := model.Point{X: f.Rect.X + f.Rect.W/2, Y: f.Rect.Y + f.Rect.H/2}
	if err := b.BgClick(ctx, c.X, c.Y, "left", 1); err != nil {
		t.Fatal(err)
	}
	if ok, at, err := b.Focused(ctx); !ok || err != nil {
		t.Fatalf("Focused: %v %s %v", ok, at, err)
	}
	if err := b.BgType(ctx, "Nguyễn Văn A", true, false); err != nil {
		t.Fatal(err)
	}
	// bấm Gửi + đọc kết quả
	send := q(`role=button[name="Gửi"]`)
	send.Scroll = true
	f = waitFound(send)
	m, err := b.Mark(ctx, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if err := b.BgClick(ctx, f.Rect.X+5, f.Rect.Y+5, "left", 1); err != nil {
		t.Fatal(err)
	}
	if eff, err := b.Settle(ctx, m); err != nil || eff.Navigated {
		t.Errorf("Settle sau Gửi: %+v %v", eff, err)
	}
	out := q("css=#out")
	out.Read = "text"
	if f = waitFound(out); f.Value != "Đã gửi: Nguyễn Văn A (thật)" {
		t.Errorf("đọc #out = %q", f.Value)
	}
	// nút ngoài khung nhìn: Find cuộn tới, bấm được
	far := q("text=Nút xa")
	far.Scroll = true
	f = waitFound(far)
	if f.OffView {
		t.Errorf("Find (Scroll) phải cuộn tới nút xa: %+v", f)
	}
	if err := b.BgClick(ctx, f.Rect.X+3, f.Rect.Y+3, "left", 1); err != nil {
		t.Fatal(err)
	}
	waitFound(q("text=Đã bấm xa"))
	// phạm vi hộp thoại + chỗ thứ 2
	sc := q("text=Lưu")
	sc.Scope = model.WebScopeDialog
	if f = waitFound(sc); f.Count != 1 {
		t.Errorf("Lưu trong hộp thoại: count %d", f.Count)
	}
	two := q("text=Lưu")
	two.Occurrence = 2
	if f = waitFound(two); f.Count != 2 {
		t.Errorf("Lưu chỗ thứ 2: count %d", f.Count)
	}
	// hộp thoại JS: báo ngay, accept rồi tìm tiếp
	bao := q("text=Báo")
	bao.Scroll = true
	f = waitFound(bao)
	if err := b.BgClick(ctx, f.Rect.X+3, f.Rect.Y+3, "left", 1); err != nil {
		t.Fatal(err)
	}
	var d web.Found
	for i := 0; i < 30 && d.Dialog == nil; i++ {
		time.Sleep(100 * time.Millisecond)
		d, _ = b.Find(ctx, q("css=h1"))
	}
	if d.Dialog == nil || d.Dialog.Message != "Xin chào" {
		t.Fatalf("hộp thoại JS: %+v", d)
	}
	h1 := q("css=h1")
	h1.Dialog = model.WebDialogAccept
	if f, err := b.Find(ctx, h1); err != nil || f.Handled == nil {
		t.Errorf("accept hộp thoại: %+v %v", f, err)
	}
	// phím + outline + điều hướng
	if _, err := b.Keys(ctx, "", []string{"tab"}, nil, false); err != nil {
		t.Error(err)
	}
	o, err := b.PageOutline(ctx, "")
	if err != nil || len(o.Items) == 0 || !strings.Contains(o.Text(), "Gửi") {
		t.Errorf("outline: %v %d dòng", err, len(o.Items))
	}
	link := q("text=Sang B")
	link.Scroll = true
	f = waitFound(link)
	m, _ = b.Mark(ctx, "", true)
	if err := b.BgClick(ctx, f.Rect.X+3, f.Rect.Y+3, "left", 1); err != nil {
		t.Fatal(err)
	}
	if eff, err := b.Settle(ctx, m); err != nil || !eff.Navigated || !strings.HasSuffix(eff.URL, "b.html") {
		t.Errorf("Settle sau link: %+v %v", eff, err)
	}
	shot, err := b.Screenshot(ctx, "")
	if err != nil || shot.Image.Bounds().Dx() == 0 || shot.CSSWidth == 0 {
		t.Errorf("screenshot: %v", err)
	}
}
