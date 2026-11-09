// Package gdrive – Google Drive cho đồng bộ cloud (bước 54 C1 + C2): đăng nhập OAuth (loopback + PKCE, mở trình duyệt hệ
// thống) và cloud.Provider qua Drive REST. Scope `drive.file`: app chỉ thấy file nó tạo, trong thư mục "Ghosthand".
package gdrive

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// Scope – chỉ file do app tạo (không cần Google duyệt scope nhạy cảm).
const Scope = "https://www.googleapis.com/auth/drive.file"

// ClientID / ClientSecret – khoá OAuth loại Desktop app, nhúng lúc build (-ldflags, xem scripts/). Google coi secret của
// Desktop app là công khai; PKCE mới là lớp bảo vệ chính.
var (
	ClientID     string
	ClientSecret string
)

// ErrNeedLogin – chưa đăng nhập, hoặc quyền đã bị thu hồi / token hết hạn (Google trả invalid_grant): đăng nhập lại.
var ErrNeedLogin = errors.New("cần đăng nhập lại Google (chưa đăng nhập, quyền đã bị thu hồi hoặc phiên hết hạn)")

// ErrNoClient – bản build không kèm khoá OAuth.
var ErrNoClient = errors.New("bản này chưa kèm khoá đăng nhập Google (CLIENT_ID / CLIENT_SECRET lúc build)")

// Config – điểm cuối OAuth; để trống thì dùng của Google (test trỏ sang máy chủ giả).
type Config struct {
	ClientID, ClientSecret string
	AuthURL, TokenURL      string
	RevokeURL              string
}

func (c Config) withDefaults() Config {
	if c.ClientID == "" {
		c.ClientID, c.ClientSecret = ClientID, ClientSecret
	}
	if c.ClientID == "" { // wails dev không có -ldflags: đặt biến môi trường thay
		c.ClientID, c.ClientSecret = os.Getenv("GHOSTHAND_GOOGLE_CLIENT_ID"), os.Getenv("GHOSTHAND_GOOGLE_CLIENT_SECRET")
	}
	if c.AuthURL == "" {
		c.AuthURL = "https://accounts.google.com/o/oauth2/v2/auth"
	}
	if c.TokenURL == "" {
		c.TokenURL = "https://oauth2.googleapis.com/token"
	}
	if c.RevokeURL == "" {
		c.RevokeURL = "https://oauth2.googleapis.com/revoke"
	}
	return c
}

// Token – thứ lưu trong keychain. Chỉ Refresh là lâu dài; Access sống ~1 giờ.
type Token struct {
	Refresh string    `json:"refresh"`
	Access  string    `json:"access,omitempty"`
	Expiry  time.Time `json:"expiry,omitempty"`
}

// TokenStore – nơi cất token (keychain; KHÔNG phải settings.json).
type TokenStore interface {
	Load(ctx context.Context) (Token, error) // chưa có → Token{} và nil
	Save(ctx context.Context, t Token) error
	Clear(ctx context.Context) error
}

// Auth – đăng nhập + cấp access token.
type Auth struct {
	Cfg   Config
	Store TokenStore
	HTTP  *http.Client
	Now   func() time.Time

	mu  sync.Mutex
	tok *Token // bản nhớ trong tiến trình
}

func (a *Auth) now() time.Time {
	if a.Now != nil {
		return a.Now()
	}
	return time.Now()
}

func (a *Auth) client() *http.Client {
	if a.HTTP != nil {
		return a.HTTP
	}
	return &http.Client{Timeout: 30 * time.Second}
}

// LoggedIn – đã có refresh token.
func (a *Auth) LoggedIn(ctx context.Context) bool {
	t, err := a.load(ctx)
	return err == nil && t.Refresh != ""
}

func (a *Auth) load(ctx context.Context) (Token, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.tok != nil {
		return *a.tok, nil
	}
	t, err := a.Store.Load(ctx)
	if err != nil {
		return Token{}, err
	}
	a.tok = &t
	return t, nil
}

func (a *Auth) save(ctx context.Context, t Token) error {
	a.mu.Lock()
	a.tok = &t
	a.mu.Unlock()
	return a.Store.Save(ctx, t)
}

// Login mở trình duyệt hệ thống tới trang đồng ý của Google (open nhận URL), chờ Google gọi về cổng loopback.
// Không dùng webview: Google chặn đăng nhập trong webview nhúng.
func (a *Auth) Login(ctx context.Context, open func(url string) error) error {
	cfg := a.Cfg.withDefaults()
	if cfg.ClientID == "" {
		return ErrNoClient
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("không mở được cổng nhận đăng nhập: %w", err)
	}
	defer ln.Close()
	redirect := "http://" + ln.Addr().String()
	verifier, challenge := newPKCE()
	state := randomString(24)

	type result struct {
		code string
		err  error
	}
	ch := make(chan result, 1)
	srv := &http.Server{ReadHeaderTimeout: 10 * time.Second, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if r.URL.Path != "/" || (q.Get("code") == "" && q.Get("error") == "") {
			http.NotFound(w, r) // vd /favicon.ico – không phải lời gọi về của Google
			return
		}
		if q.Get("state") != state {
			// yêu cầu không phải do Google gọi về (trang web / chương trình khác dò cổng): bỏ qua, vẫn chờ đúng lời gọi
			http.Error(w, "sai mã state", http.StatusBadRequest)
			return
		}
		var res result
		switch {
		case q.Get("error") != "":
			res.err = fmt.Errorf("Google từ chối đăng nhập: %s", q.Get("error"))
		default:
			res.code = q.Get("code")
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if res.err != nil {
			fmt.Fprintf(w, "<h3>Đăng nhập không thành công</h3><p>%s</p>", html.EscapeString(res.err.Error()))
		} else {
			io.WriteString(w, "<h3>Đã đăng nhập Google</h3><p>Quay lại Ghosthand – đóng tab này được rồi.</p>")
		}
		select {
		case ch <- res:
		default:
		}
	})}
	go srv.Serve(ln)
	defer srv.Close()

	authURL := cfg.AuthURL + "?" + url.Values{
		"client_id": {cfg.ClientID}, "redirect_uri": {redirect}, "response_type": {"code"}, "scope": {Scope},
		"code_challenge": {challenge}, "code_challenge_method": {"S256"}, "state": {state},
		"access_type": {"offline"}, "prompt": {"consent"}, // consent: luôn nhận refresh token
	}.Encode()
	if err := open(authURL); err != nil {
		return fmt.Errorf("không mở được trình duyệt: %w", err)
	}
	var res result
	select {
	case res = <-ch:
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(5 * time.Minute):
		return errors.New("hết 5 phút chờ đăng nhập – thử lại")
	}
	if res.err != nil {
		return res.err
	}
	tr, err := a.tokenRequest(ctx, cfg, url.Values{
		"grant_type": {"authorization_code"}, "code": {res.code}, "redirect_uri": {redirect}, "code_verifier": {verifier},
	})
	if err != nil {
		return err
	}
	if tr.Refresh == "" {
		return errors.New("Google không trả refresh token – thu hồi quyền của Ghosthand ở myaccount.google.com/permissions rồi đăng nhập lại")
	}
	return a.save(ctx, tr)
}

// AccessToken trả access token còn hạn (làm mới khi sắp hết); chưa đăng nhập / bị thu hồi → ErrNeedLogin.
func (a *Auth) AccessToken(ctx context.Context) (string, error) {
	t, err := a.load(ctx)
	if err != nil {
		return "", err
	}
	if t.Refresh == "" {
		return "", ErrNeedLogin
	}
	if t.Access != "" && a.now().Add(time.Minute).Before(t.Expiry) {
		return t.Access, nil
	}
	return a.Refresh(ctx)
}

// Refresh ép lấy access token mới (vd Drive trả 401).
func (a *Auth) Refresh(ctx context.Context) (string, error) {
	t, err := a.load(ctx)
	if err != nil {
		return "", err
	}
	if t.Refresh == "" {
		return "", ErrNeedLogin
	}
	cfg := a.Cfg.withDefaults()
	if cfg.ClientID == "" {
		return "", ErrNoClient
	}
	nt, err := a.tokenRequest(ctx, cfg, url.Values{"grant_type": {"refresh_token"}, "refresh_token": {t.Refresh}})
	if err != nil {
		return "", err
	}
	nt.Refresh = t.Refresh // lần làm mới không trả lại refresh token
	if err := a.save(ctx, nt); err != nil {
		return "", err
	}
	return nt.Access, nil
}

// Logout thu hồi quyền ở Google (cố gắng, lỗi mạng không chặn) rồi xoá token khỏi keychain.
func (a *Auth) Logout(ctx context.Context) error {
	t, _ := a.load(ctx)
	if t.Refresh != "" {
		cfg := a.Cfg.withDefaults()
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.RevokeURL, strings.NewReader(url.Values{"token": {t.Refresh}}.Encode()))
		if err == nil {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			if resp, err := a.client().Do(req); err == nil {
				resp.Body.Close()
			}
		}
	}
	a.mu.Lock()
	a.tok = &Token{}
	a.mu.Unlock()
	return a.Store.Clear(ctx)
}

func (a *Auth) tokenRequest(ctx context.Context, cfg Config, form url.Values) (Token, error) {
	form.Set("client_id", cfg.ClientID)
	if cfg.ClientSecret != "" {
		form.Set("client_secret", cfg.ClientSecret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return Token{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := a.client().Do(req)
	if err != nil {
		return Token{}, fmt.Errorf("không gọi được Google: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var tr struct {
		Access  string `json:"access_token"`
		Refresh string `json:"refresh_token"`
		Expires int    `json:"expires_in"`
		Error   string `json:"error"`
		Desc    string `json:"error_description"`
	}
	_ = json.Unmarshal(body, &tr)
	if resp.StatusCode != http.StatusOK || tr.Access == "" {
		if tr.Error == "invalid_grant" {
			return Token{}, ErrNeedLogin
		}
		return Token{}, fmt.Errorf("Google từ chối cấp token (%d %s %s)", resp.StatusCode, tr.Error, tr.Desc)
	}
	return Token{Refresh: tr.Refresh, Access: tr.Access, Expiry: a.now().Add(time.Duration(tr.Expires) * time.Second)}, nil
}

func newPKCE() (verifier, challenge string) {
	verifier = randomString(64)
	sum := sha256.Sum256([]byte(verifier))
	return verifier, base64.RawURLEncoding.EncodeToString(sum[:])
}

func randomString(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err) // không có nguồn ngẫu nhiên an toàn – không được đi tiếp với state / verifier đoán được
	}
	return base64.RawURLEncoding.EncodeToString(b)[:n]
}
