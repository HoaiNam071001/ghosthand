package web

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"strings"

	"github.com/chromedp/chromedp"
)

// Thử trang (bước 44): mở url trên Chrome của app, chờ trang yên (pageload.go), gom dấu hiệu (pagecheck.js) → kết luận trang dùng
// được node web không hay phải dùng node ảnh / chữ (captcha, chặn bot, game vẽ canvas, trang trống). Chỉ đọc trang.

//go:embed pagecheck.js
var pagecheckJS string

// Kết luận của PageCheck.Verdict.
const (
	PageOK      = "ok"      // dùng được node web
	PageCaptcha = "captcha" // có captcha / kiểm tra "bạn là người"
	PageBlocked = "blocked" // trang chặn truy cập (403, Access denied…)
	PageCanvas  = "canvas"  // nội dung vẽ trong canvas (game) – node web không thấy nút bên trong
	PageEmpty   = "empty"   // không có phần tử nào đọc được
	PageLoading = "loading" // hết giờ chờ mà trang chưa hiện gì – chưa kết luận, dò lại sau (url rỗng)
)

const (
	maxCheckList = 40   // số phần tử outline gửi kèm
	shortPage    = 1500 // chữ dài hơn → không dò câu kiểu captcha trong thân trang (tránh nhầm bài viết)
)

// PageCheck – kết quả thử trang.
type PageCheck struct {
	Verdict  string        `json:"verdict"`
	UseWeb   bool          `json:"useWeb"` // = verdict ok
	Signs    []string      `json:"signs"`  // dấu hiệu thấy (chữ cho người dùng / AI)
	URL      string        `json:"url"`    // URL sau chuyển tiếp
	Title    string        `json:"title"`
	Loaded   bool          `json:"loaded"`         // tải xong trước khi hết giờ chờ
	Elements int           `json:"elements"`       // số phần tử đọc được (PageOutline)
	Outline  []OutlineItem `json:"outline"`        // ≤ maxCheckList phần tử đầu – AI viết selector luôn
	Tab      string        `json:"tab"`            // id tab đã dò – ghim tab cho node web / read_web_outline (46 A4)
	Tabs     []Tab         `json:"tabs,omitempty"` // các tab đang mở kèm id
}

// pageSigns – dữ liệu pagecheck.js trả.
type pageSigns struct {
	URL    string      `json:"url"`
	Title  string      `json:"title"`
	Text   string      `json:"text"`
	Frames []pageFrame `json:"frames"`
	Marks  []string    `json:"marks"`  // selector khung captcha đang hiện (.g-recaptcha…)
	Canvas float64     `json:"canvas"` // phần khung nhìn canvas lớn nhất che (0–1)
}

type pageFrame struct {
	Src   string `json:"src"`
	Title string `json:"title"`
	W     int    `json:"w"`
	H     int    `json:"h"`
	Shown bool   `json:"shown"`
}

// CheckPage mở u ở tab mới (chưa mở trình duyệt thì bật lên) rồi dò trang. u rỗng = dò lại tab đang mở, không tải
// lại – cho trang tải lâu: chờ trang hiện xong rồi dò lại.
func (c *Chrome) CheckPage(ctx context.Context, u string) (PageCheck, error) {
	if u != "" {
		if err := c.Open(ctx, u); err != nil {
			return PageCheck{}, err
		}
	}
	t, _, err := c.activeTabFor(ctx, "")
	if errors.Is(err, ErrNoBrowser) && u == "" {
		return PageCheck{}, &BrowserError{"chưa có trang nào mở trên Chrome của app – nhập URL để thử"}
	}
	if err != nil {
		return PageCheck{}, err
	}
	loaded, err := waitSettled(ctx, t.ctx)
	if err != nil {
		return PageCheck{}, err
	}
	s, err := run(ctx, t.ctx, "dò trang", chromedp.Evaluate[pageSigns](pageJS(pagecheckJS)))
	if err != nil {
		return PageCheck{}, err
	}
	o, err := outlineOf(ctx, t, false)
	if err != nil {
		return PageCheck{}, err
	}
	pc := classifyPage(s, o.Total, loaded)
	pc.Outline = o.Items[:min(len(o.Items), maxCheckList)]
	pc.Tab, pc.Tabs = t.id, c.Status(ctx).Tabs
	c.checks.put(pc)
	return pc, nil
}

// LastCheck – kết quả Thử trang gần nhất của trang tabURL (cùng URL hoặc cùng host); chưa thử thì ok = false.
func (c *Chrome) LastCheck(tabURL string) (PageCheck, bool) { return c.checks.lookup(tabURL) }

// Dấu hiệu theo src iframe / câu chữ (chữ thường).
var (
	captchaFrames = []string{"recaptcha", "hcaptcha.com", "challenges.cloudflare.com", "arkoselabs", "funcaptcha", "geetest", "captcha"}
	captchaWords  = []string{"verify you are human", "i'm not a robot", "i am not a robot", "are you a robot", "checking your browser",
		"checking if the site connection is secure", "just a moment", "unusual traffic", "complete the security check", "press & hold",
		"xác minh bạn là người", "tôi không phải là người máy", "xác minh bảo mật"}
	blockedWords = []string{"access denied", "403 forbidden", "you have been blocked", "attention required", "request blocked",
		"error 1020", "truy cập bị từ chối", "bạn đã bị chặn"}
)

// classifyPage – kết luận từ dấu hiệu (hàm thuần). Thứ tự: captcha > chặn > canvas > chưa tải / trống > dùng được.
func classifyPage(s pageSigns, elements int, loaded bool) PageCheck {
	pc := PageCheck{URL: s.URL, Title: s.Title, Loaded: loaded, Elements: elements, Signs: []string{}}
	add := func(f string, a ...any) { pc.Signs = append(pc.Signs, fmt.Sprintf(f, a...)) }
	if !loaded {
		add("trang chưa tải xong / còn đổi sau %d giây", int(loadTimeout.Seconds()))
	}
	captcha, blocked := false, false
	for _, f := range s.Frames {
		src := strings.ToLower(f.Src)
		kw := firstIn(src, captchaFrames)
		switch {
		case kw == "":
		case strings.Contains(src, "size=invisible"):
			add("có reCAPTCHA ẩn (v3) – thường không chặn, nhưng trang đang chấm điểm bot")
		case f.Shown && f.W*f.H >= 2500:
			captcha = true
			add("khung captcha đang hiện (iframe %s, %d×%d)", hostOf(f.Src), f.W, f.H)
		}
	}
	for _, m := range s.Marks {
		captcha = true
		add("khối captcha đang hiện (%s)", m)
	}
	title := strings.ToLower(s.Title)
	text := strings.ToLower(s.Text)
	if len([]rune(s.Text)) > shortPage {
		text = "" // trang dài (bài viết…) – chỉ xét tiêu đề
	}
	if w := firstIn(title+"\n"+text, captchaWords); w != "" {
		captcha = true
		add("trang ghi “%s”", w)
	}
	if w := firstIn(title+"\n"+text, blockedWords); w != "" {
		blocked = true
		add("trang ghi “%s”", w)
	}
	bigCanvas := s.Canvas >= 0.4
	if bigCanvas {
		add("canvas chiếm %d%% khung nhìn – nút vẽ trong canvas node web không thấy", int(s.Canvas*100))
	}
	switch {
	case captcha:
		pc.Verdict = PageCaptcha
	case blocked:
		pc.Verdict = PageBlocked
	case bigCanvas && elements < 15:
		pc.Verdict = PageCanvas
	case elements == 0 && len(strings.TrimSpace(s.Text)) < 20 && !loaded:
		pc.Verdict = PageLoading
	case elements == 0 && len(strings.TrimSpace(s.Text)) < 20:
		pc.Verdict = PageEmpty
		add("không có phần tử nào đọc được")
	default:
		pc.Verdict = PageOK
	}
	pc.UseWeb = pc.Verdict == PageOK
	return pc
}

func firstIn(s string, words []string) string {
	for _, w := range words {
		if strings.Contains(s, w) {
			return w
		}
	}
	return ""
}

// hostOf – tên miền của src (ngắn gọn cho dấu hiệu).
func hostOf(src string) string {
	s := src
	if i := strings.Index(s, "://"); i >= 0 {
		s = s[i+3:]
	}
	if i := strings.IndexAny(s, "/?#"); i >= 0 {
		s = s[:i]
	}
	return s
}
