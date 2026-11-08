package web

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	cdpruntime "github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"

	"ghosthand/internal/model"
)

// Bước 46 A0 – tái hiện các lỗi góp ý khi dùng MCP trên form kiểu antd (`samples/pages/antd-form.html`).
// Mỗi ca ghi điều ĐÚNG ra sao; ca nào đang đỏ là lỗi chưa sửa (A3 / A2). Chỉ khi GHOSTHAND_REAL=1.

func antdChrome(t *testing.T) (*Chrome, context.Context, string) {
	t.Helper()
	if os.Getenv("GHOSTHAND_REAL") != "1" {
		t.Skip("đặt GHOSTHAND_REAL=1 để thử với Chrome thật")
	}
	src, err := filepath.Abs("../samples/pages/antd-form.html")
	if err != nil {
		t.Fatal(err)
	}
	c := NewChrome(filepath.Join(os.TempDir(), "ghosthand-test-browser"), func(int, int) error { return nil })
	t.Cleanup(c.Close)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	t.Cleanup(cancel)
	page := "file://" + filepath.ToSlash(src)
	if !strings.HasPrefix(filepath.ToSlash(src), "/") {
		page = "file:///" + filepath.ToSlash(src)
	}
	if err := c.Open(ctx, page); err != nil {
		t.Fatal(err)
	}
	time.Sleep(time.Second)
	return c, ctx, page
}

func antdFind(c *Chrome, ctx context.Context, sel model.Selector) (Found, error) {
	return c.Find(ctx, Query{Selectors: []model.Selector{sel}, Scroll: true, Background: true})
}

// Ô “Mã nhân viên” có hai chỗ: ô lọc lưới (sau lớp phủ) và ô trong hộp thoại. Selector phải ra ô bấm được.
func TestRealAntdSameNameBehindModal(t *testing.T) {
	c, ctx, _ := antdChrome(t)
	f, err := antdFind(c, ctx, model.Selector{By: model.SelRole, Value: "textbox", Name: "Mã nhân viên"})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("found: %+v", f)
	if !f.OK {
		t.Errorf("khớp nhầm ô lọc của lưới nằm sau hộp thoại: OK=false, bị che bởi %q (%d ô hiện)", f.Covered, f.Count)
	}
}

// text="Ngày sinh" (khớp cả chuỗi) phải thấy nhãn dù trong nhãn còn dấu * ở thẻ riêng.
func TestRealAntdExactTextWithStar(t *testing.T) {
	c, ctx, _ := antdChrome(t)
	f, err := antdFind(c, ctx, model.Selector{By: model.SelText, Value: "Ngày sinh", Exact: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("found: %+v", f)
	if !f.OK {
		t.Errorf("text=\"Ngày sinh\" không thấy nhãn “* Ngày sinh” (counts %+v)", f.Counts)
	}
}

// webType: click rồi chờ focusWaitMs (100 ms) kiểm tra ô nhận focus – lặp lại đúng thứ tự đó.
func antdTypeFocus(t *testing.T, sel model.Selector, dy int) (bool, string) {
	t.Helper()
	c, ctx, _ := antdChrome(t)
	dx := 0
	if dy < 0 { // dy < 0: lệch đúng bằng khoảng từ đích tới ô #join
		l, err1 := antdFind(c, ctx, sel)
		j, err2 := antdFind(c, ctx, model.Selector{By: model.SelCSS, Value: "#join"})
		if err1 != nil || err2 != nil || !l.OK || !j.OK {
			t.Fatalf("đo khoảng cách: %v %v", err1, err2)
		}
		dy = j.Rect.Y + j.Rect.H/2 - (l.Rect.Y + l.Rect.H/2)
		dx = j.Rect.X + j.Rect.W/2 - (l.Rect.X + l.Rect.W/2)
	}
	f, err := antdFind(c, ctx, sel)
	if err != nil || !f.OK {
		t.Fatalf("không tìm thấy %+v: %+v %v", sel, f, err)
	}
	x, y := f.Rect.X+f.Rect.W/2+dx, f.Rect.Y+f.Rect.H/2+dy
	if err := c.BgClick(ctx, x, y, "left", 1); err != nil {
		t.Fatal(err)
	}
	// như Engine.waitFocus: chờ 100 ms rồi hỏi lại mỗi 50 ms tới 600 ms
	time.Sleep(100 * time.Millisecond)
	for waited := 100; ; waited += 50 {
		ok, at, err := c.Focused(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if ok || waited >= 600 {
			return ok, at
		}
		time.Sleep(50 * time.Millisecond)
	}
}

// Đích là ô ngày bọc trong khung (css) – focus ở ô con.
func TestRealAntdPickerFocus(t *testing.T) {
	if ok, at := antdTypeFocus(t, model.Selector{By: model.SelCSS, Value: "#dob-wrap"}, 0); !ok {
		t.Errorf("ô ngày không nhận focus (đang focus: %s)", at)
	}
}

// Đích là nhãn không có for + dy xuống ô bên dưới (cách người dùng hay làm khi chỉ biết nhãn).
func TestRealAntdLabelWithOffset(t *testing.T) {
	if ok, at := antdTypeFocus(t, model.Selector{By: model.SelText, Value: "Ngày vào làm"}, -1); !ok {
		t.Errorf("click xuống dưới nhãn vào đúng ô mà báo không nhận focus (đang focus: %s)", at)
	}
}

// Ô nhận focus chậm hơn 100 ms sau click (React state / animation).
func TestRealAntdSlowFocus(t *testing.T) {
	if ok, at := antdTypeFocus(t, model.Selector{By: model.SelCSS, Value: "#city"}, 0); !ok {
		t.Errorf("ô nhận focus sau 250 ms bị báo không nhận focus (đang focus: %s)", at)
	}
}

// probe_page không URL phải dò tab đang điều khiển, kể cả tab popup do trang tự mở (window.open).
func TestRealCheckPageFollowsPopup(t *testing.T) {
	c, ctx, page := antdChrome(t)
	tab, _, err := c.tabFor(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	popup := strings.Replace(page, "antd-form.html", "login.html", 1)
	if _, err := run(ctx, tab.ctx, "mở popup", chromedp.Evaluate[any](`!!window.open("`+popup+`")`, func(p *cdpruntime.EvaluateParams) { g := true; p.UserGesture = &g })); err != nil {
		t.Fatal(err)
	}
	time.Sleep(2 * time.Second)
	t.Logf("tabs: %+v", c.Status(ctx).Tabs)
	pc, err := c.CheckPage(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("title=%q url=%q", pc.Title, pc.URL)
	if strings.Contains(pc.URL, "antd-form") {
		t.Errorf("dò lại vẫn trả tab cũ (%s), không phải popup vừa mở", pc.URL)
	}
	// 46 A4: trả id tab đã dò + danh sách tab kèm id; ghim lại theo id ra đúng tab đó
	seen := false
	for _, x := range pc.Tabs {
		seen = seen || x.ID == pc.Tab
	}
	if pc.Tab == "" || !seen {
		t.Errorf("tab %q không có trong tabs %+v", pc.Tab, pc.Tabs)
	}
	if o, err := c.ReadOutline(ctx, pc.Tab, false, false); err != nil || o.Tab != pc.Tab {
		t.Errorf("ghim theo id %q → %q, %v", pc.Tab, o.Tab, err)
	}
}

// read_web_outline: dialog = chỉ ô trong hộp thoại (không lẫn ô lọc của lưới), tab ghim được theo id.
func TestRealReadOutlineDialog(t *testing.T) {
	c, ctx, _ := antdChrome(t)
	all, err := c.ReadOutline(ctx, "", false, false)
	if err != nil {
		t.Fatal(err)
	}
	dlg, err := c.ReadOutline(ctx, all.Tab, true, false)
	if err != nil {
		t.Fatal(err)
	}
	t.Log("\n" + dlg.Text())
	if dlg.Dialogs != 1 || dlg.Total >= all.Total || strings.Contains(dlg.Text(), "Tên nhân viên") {
		t.Errorf("dialog=%d total %d/%d, lẫn ô lọc lưới:\n%s", dlg.Dialogs, dlg.Total, all.Total, dlg.Text())
	}
	if !strings.Contains(dlg.Text(), `Mã nhân viên`) || !strings.Contains(dlg.Text(), "Lưu") {
		t.Errorf("thiếu ô / nút trong hộp thoại:\n%s", dlg.Text())
	}
	// 56 B3: đọc cả trang (all) – dòng vùng có Region, dòng trong vùng sâu hơn một bậc
	full, err := c.ReadOutline(ctx, all.Tab, false, true)
	if err != nil {
		t.Fatal(err)
	}
	regions := 0
	for i, it := range full.Items {
		if it.Region {
			regions++
			if it.Role == "dialog" && (i+1 >= len(full.Items) || full.Items[i+1].Depth != it.Depth+1) {
				t.Errorf("dòng sau hộp thoại không nằm trong nó: %+v", full.Items[i:min(i+2, len(full.Items))])
			}
		}
	}
	if regions == 0 || len(full.Items) != full.Total {
		t.Errorf("all: %d vùng, %d / %d dòng", regions, len(full.Items), full.Total)
	}
}

// 46 A3 – trường mới: label= ra ô của nhãn (cả nhãn không gắn for), webScope dialog bỏ ô lọc phía sau, occurrence chọn chỗ thứ N.
func TestRealAntdScopeLabelOccurrence(t *testing.T) {
	c, ctx, _ := antdChrome(t)
	idOf := func(q Query) string {
		t.Helper()
		q.Read, q.Attr, q.Background = "attr", "id", true
		f, err := c.Find(ctx, q)
		if err != nil {
			t.Fatal(err)
		}
		return f.Value
	}
	label := func(v string) []model.Selector { return []model.Selector{{By: model.SelLabel, Value: v, Exact: true}} }
	for v, want := range map[string]string{"Ngày vào làm": "join", "Ngày sinh": "dob", "Thành phố": "city"} {
		if got := idOf(Query{Selectors: label(v)}); got != want {
			t.Errorf("label=%q → ô %q, muốn %q", v, got, want)
		}
	}
	aria := []model.Selector{{By: model.SelAria, Value: "Mã nhân viên"}}
	if got := idOf(Query{Selectors: aria, Scope: model.WebScopeDialog}); got != "code" {
		t.Errorf("webScope dialog → %q, muốn ô trong hộp thoại", got)
	}
	if got := idOf(Query{Selectors: aria, Occurrence: 1}); got != "f-code" {
		t.Errorf("occurrence 1 → %q, muốn ô lọc của lưới (chỗ đầu trong trang)", got)
	}
	if got := idOf(Query{Selectors: aria, Occurrence: 2}); got != "code" {
		t.Errorf("occurrence 2 → %q, muốn ô trong hộp thoại", got)
	}
	if f, err := c.Find(ctx, Query{Selectors: aria, Occurrence: 3, Background: true}); err != nil || f.OK || f.Selector >= 0 {
		t.Errorf("occurrence 3 (chỉ có 2 ô) phải không thấy: %+v, %v", f, err)
	}
}

// 46 B4: chụp một tab qua CDP – ảnh khung nhìn, bề rộng CSS để đổi px ảnh → toạ độ trang.
func TestRealTabScreenshot(t *testing.T) {
	c, ctx, _ := antdChrome(t)
	sh, err := c.Screenshot(ctx, "antd-form")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("ảnh %v, css %d, tab %s", sh.Image.Bounds().Size(), sh.CSSWidth, sh.Tab)
	if sh.Image.Bounds().Dx() < 100 || sh.CSSWidth < 100 || sh.Tab == "" || !strings.Contains(sh.URL, "antd-form") {
		t.Errorf("chụp tab: %+v", sh)
	}
}
