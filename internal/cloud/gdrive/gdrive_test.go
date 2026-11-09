package gdrive

import (
	"context"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/cloudtest"
)

// ---- máy chủ giả: OAuth + Drive v3 (đủ phần provider dùng) ----

type gfile struct {
	id, name, parent, mime string
	data                   []byte
}

func (f gfile) md5() string {
	s := md5.Sum(f.data)
	return hex.EncodeToString(s[:])
}

type fakeGoogle struct {
	t   *testing.T
	srv *httptest.Server

	mu       sync.Mutex
	files    map[string]*gfile
	next     int
	sessions map[string]*gfile // phiên resumable → file sẽ ghi (nil data = tạo mới)
	patch    map[string]string // phiên resumable → id file sẽ ghi đè

	codes       map[string]string // code → code_challenge
	refreshOK   bool              // false → invalid_grant (đã bị thu hồi)
	revoked     []string
	listCalls   int
	fail429     int // số lần đầu GET /files trả 429
	fail401Once bool
	issued      int
}

func newFakeGoogle(t *testing.T) *fakeGoogle {
	g := &fakeGoogle{t: t, files: map[string]*gfile{}, sessions: map[string]*gfile{}, patch: map[string]string{},
		codes: map[string]string{}, refreshOK: true}
	g.srv = httptest.NewServer(http.HandlerFunc(g.handle))
	t.Cleanup(g.srv.Close)
	return g
}

func (g *fakeGoogle) cfg() Config {
	return Config{ClientID: "cid", ClientSecret: "sec", AuthURL: g.srv.URL + "/auth", TokenURL: g.srv.URL + "/token", RevokeURL: g.srv.URL + "/revoke"}
}

func (g *fakeGoogle) newID() string {
	g.next++
	return "id" + strconv.Itoa(g.next)
}

func (g *fakeGoogle) handle(w http.ResponseWriter, r *http.Request) {
	g.mu.Lock()
	defer g.mu.Unlock()
	switch {
	case r.URL.Path == "/token":
		g.token(w, r)
	case r.URL.Path == "/revoke":
		r.ParseForm()
		g.revoked = append(g.revoked, r.Form.Get("token"))
	case strings.HasPrefix(r.URL.Path, "/resumable/"):
		g.resumablePut(w, r)
	case strings.HasPrefix(r.URL.Path, "/upload/drive/v3/files"), strings.HasPrefix(r.URL.Path, "/drive/v3/files"):
		g.drive(w, r)
	default:
		http.NotFound(w, r)
	}
}

func (g *fakeGoogle) token(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	if r.Form.Get("client_id") != "cid" || r.Form.Get("client_secret") != "sec" {
		http.Error(w, `{"error":"invalid_client"}`, 401)
		return
	}
	switch r.Form.Get("grant_type") {
	case "authorization_code":
		ch, ok := g.codes[r.Form.Get("code")]
		sum := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
		if !ok || base64.RawURLEncoding.EncodeToString(sum[:]) != ch {
			http.Error(w, `{"error":"invalid_grant"}`, 400)
			return
		}
		g.issued++
		fmt.Fprintf(w, `{"access_token":"acc%d","refresh_token":"ref1","expires_in":3600}`, g.issued)
	case "refresh_token":
		if !g.refreshOK || r.Form.Get("refresh_token") != "ref1" {
			http.Error(w, `{"error":"invalid_grant","error_description":"Token has been expired or revoked."}`, 400)
			return
		}
		g.issued++
		fmt.Fprintf(w, `{"access_token":"acc%d","expires_in":3600}`, g.issued)
	}
}

var (
	reName   = regexp.MustCompile(`name = '((?:[^'\\]|\\.)*)'`)
	reParent = regexp.MustCompile(`'((?:[^'\\]|\\.)*)' in parents`)
)

func unq(s string) string { return strings.NewReplacer(`\'`, `'`, `\\`, `\`).Replace(s) }

func (g *fakeGoogle) drive(w http.ResponseWriter, r *http.Request) {
	if g.fail401Once && r.Header.Get("Authorization") == "Bearer acc1" {
		g.fail401Once = false
		http.Error(w, `{"error":{"message":"Invalid Credentials"}}`, 401)
		return
	}
	if r.Header.Get("Authorization") == "" {
		http.Error(w, "no auth", 401)
		return
	}
	path := strings.TrimPrefix(strings.TrimPrefix(r.URL.Path, "/upload"), "/drive/v3/files")
	id := strings.TrimPrefix(path, "/")
	upload := strings.HasPrefix(r.URL.Path, "/upload")
	switch {
	case r.Method == http.MethodGet && id == "":
		g.listCalls++
		if g.fail429 > 0 {
			g.fail429--
			w.Header().Set("Retry-After", "1")
			http.Error(w, "slow down", 429)
			return
		}
		g.list(w, r.URL.Query().Get("q"))
	case r.Method == http.MethodGet:
		f, ok := g.files[id]
		if !ok {
			http.NotFound(w, r)
			return
		}
		w.Write(f.data)
	case r.Method == http.MethodDelete:
		delete(g.files, id)
		w.WriteHeader(204)
	case r.Method == http.MethodPost && id == "" && !upload: // tạo thư mục
		var m struct {
			Name    string
			Parents []string
		}
		json.NewDecoder(r.Body).Decode(&m)
		f := &gfile{id: g.newID(), name: m.Name, mime: folderMime}
		if len(m.Parents) > 0 {
			f.parent = m.Parents[0]
		} else {
			f.parent = "root"
		}
		g.files[f.id] = f
		fmt.Fprintf(w, `{"id":%q}`, f.id)
	case upload:
		g.upload(w, r, id)
	default:
		http.Error(w, "không hỗ trợ "+r.Method+" "+r.URL.Path, 400)
	}
}

func (g *fakeGoogle) list(w http.ResponseWriter, query string) {
	name := unq(reName.FindStringSubmatch(query)[1])
	parent := unq(reParent.FindStringSubmatch(query)[1])
	wantFolder := strings.Contains(query, "mimeType = '"+folderMime)
	out := []map[string]string{}
	for _, f := range g.files {
		if f.name == name && f.parent == parent && (f.mime == folderMime) == wantFolder {
			out = append(out, map[string]string{"id": f.id, "md5Checksum": f.md5()})
		}
	}
	json.NewEncoder(w).Encode(map[string]any{"files": out})
}

func (g *fakeGoogle) upload(w http.ResponseWriter, r *http.Request, id string) {
	switch r.URL.Query().Get("uploadType") {
	case "multipart":
		_, params, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		mr := multipart.NewReader(r.Body, params["boundary"])
		p1, _ := mr.NextPart()
		var meta struct {
			Name    string
			Parents []string
		}
		json.NewDecoder(p1).Decode(&meta)
		p2, _ := mr.NextPart()
		data, _ := io.ReadAll(p2)
		g.store(w, id, meta.Name, meta.Parents, p2.Header.Get("Content-Type"), data)
	case "resumable":
		var meta struct {
			Name    string
			Parents []string
		}
		json.NewDecoder(r.Body).Decode(&meta)
		sid := "s" + g.newID()
		g.sessions[sid] = &gfile{name: meta.Name, mime: r.Header.Get("X-Upload-Content-Type")}
		if len(meta.Parents) > 0 {
			g.sessions[sid].parent = meta.Parents[0]
		}
		g.patch[sid] = id
		w.Header().Set("Location", g.srv.URL+"/resumable/"+sid)
	}
}

func (g *fakeGoogle) resumablePut(w http.ResponseWriter, r *http.Request) {
	sid := strings.TrimPrefix(r.URL.Path, "/resumable/")
	s, ok := g.sessions[sid]
	if !ok {
		http.NotFound(w, r)
		return
	}
	data, _ := io.ReadAll(r.Body)
	var parents []string
	if s.parent != "" {
		parents = []string{s.parent}
	}
	g.store(w, g.patch[sid], s.name, parents, s.mime, data)
}

func (g *fakeGoogle) store(w http.ResponseWriter, id, name string, parents []string, mime string, data []byte) {
	f, ok := g.files[id]
	if !ok {
		f = &gfile{id: g.newID(), name: name, parent: parents[0]}
		g.files[f.id] = f
	}
	f.mime, f.data = mime, data
	fmt.Fprintf(w, `{"id":%q,"md5Checksum":%q}`, f.id, f.md5())
}

// ---- tiện ích ----

type memTokens struct {
	mu sync.Mutex
	t  Token
}

func (m *memTokens) Load(context.Context) (Token, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.t, nil
}
func (m *memTokens) Save(_ context.Context, t Token) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.t = t
	return nil
}
func (m *memTokens) Clear(context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.t = Token{}
	return nil
}

// browser giả: đọc URL đăng nhập, kiểm tra tham số PKCE rồi để "Google" gọi về loopback.
func (g *fakeGoogle) browser(t *testing.T, code string, tamper func(redirect string)) func(string) error {
	return func(authURL string) error {
		u, _ := url.Parse(authURL)
		q := u.Query()
		if q.Get("code_challenge_method") != "S256" || q.Get("scope") != Scope || q.Get("access_type") != "offline" ||
			q.Get("client_id") != "cid" || !strings.HasPrefix(q.Get("redirect_uri"), "http://127.0.0.1:") {
			t.Errorf("tham số đăng nhập sai: %v", q)
		}
		g.mu.Lock()
		g.codes[code] = q.Get("code_challenge")
		g.mu.Unlock()
		go func() {
			if tamper != nil {
				tamper(q.Get("redirect_uri"))
			}
			resp, err := http.Get(q.Get("redirect_uri") + "/?code=" + code + "&state=" + url.QueryEscape(q.Get("state")))
			if err == nil {
				resp.Body.Close()
			}
		}()
		return nil
	}
}

func newAuth(g *fakeGoogle) (*Auth, *memTokens) {
	st := &memTokens{}
	return &Auth{Cfg: g.cfg(), Store: st}, st
}

func loggedInDrive(t *testing.T, g *fakeGoogle) (*Drive, *Auth) {
	a, _ := newAuth(g)
	if err := a.Login(context.Background(), g.browser(t, "code1", nil)); err != nil {
		t.Fatal(err)
	}
	return &Drive{Auth: a, APIBase: g.srv.URL + "/drive/v3", UploadBase: g.srv.URL + "/upload/drive/v3", Sleep: func(time.Duration) {}}, a
}

// ---- C1: đăng nhập ----

func TestLoginStoresRefreshToken(t *testing.T) {
	g := newFakeGoogle(t)
	a, st := newAuth(g)
	if a.LoggedIn(context.Background()) {
		t.Fatal("chưa đăng nhập mà báo đã đăng nhập")
	}
	if err := a.Login(context.Background(), g.browser(t, "c", nil)); err != nil {
		t.Fatal(err)
	}
	if st.t.Refresh != "ref1" || !a.LoggedIn(context.Background()) {
		t.Fatalf("chưa lưu refresh token: %+v", st.t)
	}
	if tok, err := a.AccessToken(context.Background()); err != nil || tok != "acc1" {
		t.Fatalf("access token: %q %v", tok, err)
	}
}

func TestLoginIgnoresForgedCallback(t *testing.T) {
	g := newFakeGoogle(t)
	a, _ := newAuth(g)
	forged := func(redirect string) { // trang web khác dò cổng với state sai: không được làm hỏng / chiếm đăng nhập
		resp, err := http.Get(redirect + "/?code=hacker&state=sai")
		if err == nil {
			if resp.StatusCode != 400 {
				t.Errorf("callback giả phải bị 400, được %d", resp.StatusCode)
			}
			resp.Body.Close()
		}
	}
	if err := a.Login(context.Background(), g.browser(t, "that", forged)); err != nil {
		t.Fatalf("đăng nhập thật phải vẫn thành công: %v", err)
	}
}

func TestLoginDenied(t *testing.T) {
	g := newFakeGoogle(t)
	a, _ := newAuth(g)
	err := a.Login(context.Background(), func(authURL string) error {
		u, _ := url.Parse(authURL)
		go http.Get(u.Query().Get("redirect_uri") + "/?error=access_denied&state=" + url.QueryEscape(u.Query().Get("state")))
		return nil
	})
	if err == nil || !strings.Contains(err.Error(), "access_denied") {
		t.Fatalf("muốn lỗi access_denied: %v", err)
	}
}

func TestLoginWithoutClientID(t *testing.T) {
	a := &Auth{Store: &memTokens{}}
	if err := a.Login(context.Background(), func(string) error { return nil }); !errors.Is(err, ErrNoClient) {
		t.Fatalf("muốn ErrNoClient: %v", err)
	}
}

func TestAccessTokenRefreshesWhenExpired(t *testing.T) {
	g := newFakeGoogle(t)
	a, _ := newAuth(g)
	now := time.Now()
	a.Now = func() time.Time { return now }
	a.Login(context.Background(), g.browser(t, "c", nil))
	now = now.Add(2 * time.Hour)
	tok, err := a.AccessToken(context.Background())
	if err != nil || tok != "acc2" {
		t.Fatalf("phải làm mới sang acc2: %q %v", tok, err)
	}
	if a.tok.Refresh != "ref1" {
		t.Fatal("làm mới không được mất refresh token")
	}
}

func TestRevokedGrantAsksForLogin(t *testing.T) {
	g := newFakeGoogle(t)
	a, _ := newAuth(g)
	now := time.Now()
	a.Now = func() time.Time { return now }
	a.Login(context.Background(), g.browser(t, "c", nil))
	g.refreshOK = false // người dùng thu hồi quyền ở tài khoản Google
	now = now.Add(2 * time.Hour)
	if _, err := a.AccessToken(context.Background()); !errors.Is(err, ErrNeedLogin) {
		t.Fatalf("muốn ErrNeedLogin: %v", err)
	}
}

func TestLogoutRevokesAndClears(t *testing.T) {
	g := newFakeGoogle(t)
	a, st := newAuth(g)
	a.Login(context.Background(), g.browser(t, "c", nil))
	if err := a.Logout(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(g.revoked) != 1 || g.revoked[0] != "ref1" || st.t.Refresh != "" || a.LoggedIn(context.Background()) {
		t.Fatalf("đăng xuất chưa thu hồi / xoá token: revoked=%v tok=%+v", g.revoked, st.t)
	}
	if _, err := a.AccessToken(context.Background()); !errors.Is(err, ErrNeedLogin) {
		t.Fatalf("sau đăng xuất phải đòi đăng nhập: %v", err)
	}
}

// ---- C2: provider Drive ----

func TestDriveRoundTripAndFolders(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	ctx := context.Background()
	if _, _, err := d.Get(ctx, "scripts/a.json"); !errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("chưa có file phải ErrNotFound: %v", err)
	}
	v1, err := d.Put(ctx, "scripts/nhóm/a.json", []byte(`{"x":1}`), "")
	if err != nil || v1 == "" {
		t.Fatalf("Put: %q %v", v1, err)
	}
	b, ver, err := d.Get(ctx, "scripts/nhóm/a.json")
	if err != nil || string(b) != `{"x":1}` || ver != v1 {
		t.Fatalf("Get: %q %q %v", b, ver, err)
	}
	// cây thư mục thật: Ghosthand/scripts/nhóm, đúng một bản mỗi thư mục
	folders := map[string]int{}
	for _, f := range g.files {
		if f.mime == folderMime {
			folders[f.name]++
		}
	}
	if folders["Ghosthand"] != 1 || folders["scripts"] != 1 || folders["nhóm"] != 1 {
		t.Fatalf("cây thư mục: %v", folders)
	}
	// Put thứ hai vào cùng thư mục không tạo thêm thư mục
	d.Put(ctx, "scripts/nhóm/b.json", []byte("b"), "")
	d2 := &Drive{Auth: d.Auth, APIBase: d.APIBase, UploadBase: d.UploadBase, Sleep: d.Sleep} // máy mới, chưa có cache
	if _, _, err := d2.Get(ctx, "scripts/nhóm/b.json"); err != nil {
		t.Fatalf("máy khác phải tìm lại được thư mục có sẵn: %v", err)
	}
	for _, f := range g.files {
		if f.mime == folderMime && f.name == "Ghosthand" && f.parent != "root" {
			t.Fatal("thư mục gốc phải nằm ở My Drive")
		}
	}
	n := 0
	for _, f := range g.files {
		if f.mime == folderMime {
			n++
		}
	}
	if n != 3 {
		t.Fatalf("tạo thừa thư mục: %d", n)
	}
}

func TestDriveIfMatch(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	ctx := context.Background()
	v1, _ := d.Put(ctx, "settings.json", []byte("1"), "")
	if _, err := d.Put(ctx, "settings.json", []byte("x"), ""); !errors.Is(err, cloud.ErrPrecondition) {
		t.Fatalf("tạo mới trên file đã có phải ErrPrecondition: %v", err)
	}
	if _, err := d.Put(ctx, "settings.json", []byte("x"), "sai"); !errors.Is(err, cloud.ErrPrecondition) {
		t.Fatalf("sai version phải ErrPrecondition: %v", err)
	}
	if _, err := d.Put(ctx, "chua-co.json", []byte("x"), "v"); !errors.Is(err, cloud.ErrPrecondition) {
		t.Fatalf("cập nhật file chưa có phải ErrPrecondition: %v", err)
	}
	v2, err := d.Put(ctx, "settings.json", []byte("2"), v1)
	if err != nil || v2 == v1 {
		t.Fatalf("ghi đúng version: %q %v", v2, err)
	}
	if _, err := d.Put(ctx, "settings.json", []byte("3"), cloud.IfAny); err != nil {
		t.Fatal(err)
	}
	if b, _, _ := d.Get(ctx, "settings.json"); string(b) != "3" {
		t.Fatalf("nội dung: %q", b)
	}
	if len(g.files) != 2 { // thư mục gốc + 1 file (cập nhật tại chỗ, không tạo bản trùng)
		t.Fatalf("ghi đè phải cập nhật tại chỗ: %d mục", len(g.files))
	}
}

func TestDriveResumableForLargeFile(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	d.ResumableOver = 10
	ctx := context.Background()
	big := []byte(strings.Repeat("x", 100))
	if _, err := d.Put(ctx, "assets/ab/big.png", big, ""); err != nil {
		t.Fatal(err)
	}
	if b, _, err := d.Get(ctx, "assets/ab/big.png"); err != nil || string(b) != string(big) {
		t.Fatalf("file lớn: %v", err)
	}
	// ghi đè file lớn (PATCH resumable)
	if _, err := d.Put(ctx, "assets/ab/big.png", []byte(strings.Repeat("y", 50)), cloud.IfAny); err != nil {
		t.Fatal(err)
	}
	if b, _, _ := d.Get(ctx, "assets/ab/big.png"); len(b) != 50 {
		t.Fatalf("ghi đè resumable: %d byte", len(b))
	}
}

func TestDriveDelete(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	ctx := context.Background()
	d.Put(ctx, "scripts/a.json", []byte("a"), "")
	if err := d.Delete(ctx, "scripts/a.json"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := d.Get(ctx, "scripts/a.json"); !errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("đã xoá: %v", err)
	}
	if err := d.Delete(ctx, "scripts/khong-co.json"); err != nil {
		t.Fatalf("xoá file không có phải coi như xong: %v", err)
	}
	if err := d.Delete(ctx, "khong-co/x.json"); err != nil {
		t.Fatalf("xoá trong thư mục không có phải coi như xong: %v", err)
	}
}

func TestDriveRetriesRateLimit(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	var waits []time.Duration
	d.Sleep = func(t time.Duration) { waits = append(waits, t) }
	g.fail429 = 2
	if _, _, err := d.Get(context.Background(), "x.json"); !errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("sau khi thử lại phải ra kết quả thật: %v", err)
	}
	if len(waits) != 2 || waits[0] != time.Second {
		t.Fatalf("phải chờ theo Retry-After 2 lần: %v", waits)
	}
}

func TestDriveGivesUpAfterManyFailures(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	g.fail429 = 100
	if _, _, err := d.Get(context.Background(), "x.json"); err == nil || errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("phải báo lỗi sau nhiều lần thử: %v", err)
	}
	if g.listCalls != maxTries {
		t.Fatalf("số lần thử: %d, muốn %d", g.listCalls, maxTries)
	}
}

func TestDriveRefreshesOn401(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	g.fail401Once = true // token acc1 bị Google từ chối giữa chừng
	if _, _, err := d.Get(context.Background(), "x.json"); !errors.Is(err, cloud.ErrNotFound) {
		t.Fatalf("sau khi làm mới token phải gọi lại được: %v", err)
	}
}

func TestDriveRevokedAccessAsksForLogin(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	g.refreshOK = false
	g.fail401Once = true
	if _, _, err := d.Get(context.Background(), "x.json"); !errors.Is(err, ErrNeedLogin) {
		t.Fatalf("thu hồi quyền phải báo đăng nhập lại: %v", err)
	}
}

func TestDriveRejectsBadPaths(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	for _, p := range []string{"", "/x", "a/../b", `a\b`} {
		if _, err := d.Put(context.Background(), p, nil, ""); err == nil {
			t.Errorf("Put(%q) phải bị từ chối", p)
		}
	}
}

func TestQuoteInQuery(t *testing.T) {
	if got := q(`It's a\b`); got != `It\'s a\\b` {
		t.Fatalf("q: %s", got)
	}
}

// Đồng bộ trọn vòng qua Drive giả: máy A đẩy, máy B (cache trống) kéo.
func TestSyncerOverDrive(t *testing.T) {
	g := newFakeGoogle(t)
	d, _ := loggedInDrive(t, g)
	scope := cloud.Scope{Scripts: true, Settings: true}
	a := cloudtest.NewLocal(map[string]string{"scripts/x.json": "X", "settings.json": "S"})
	stA := cloud.State{}
	if _, err := (&cloud.Syncer{Remote: d, Local: a, State: &stA, Device: "A", Scope: scope}).Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	b := cloudtest.NewLocal(nil)
	stB := cloud.State{}
	dB := &Drive{Auth: d.Auth, APIBase: d.APIBase, UploadBase: d.UploadBase, Sleep: d.Sleep}
	res, err := (&cloud.Syncer{Remote: dB, Local: b, State: &stB, Device: "B", Scope: scope}).Run(context.Background())
	if err != nil || len(res.Pulled) != 2 || b.Str("scripts/x.json") != "X" {
		t.Fatalf("máy B: %+v %v", res, err)
	}
}
