package gdrive

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"ghosthand/internal/cloud"
)

const (
	apiBase       = "https://www.googleapis.com/drive/v3"
	uploadBase    = "https://www.googleapis.com/upload/drive/v3"
	folderMime    = "application/vnd.google-apps.folder"
	rootFolder    = "Ghosthand"
	resumableOver = 5 << 20 // file lớn hơn thì tải lên kiểu resumable
	maxTries      = 5
)

// Drive – cloud.Provider trên Google Drive: cây thư mục thật dưới "Ghosthand" (scripts/…, assets/…).
// Version = md5Checksum của nội dung. Drive v3 không hỗ trợ ghi có điều kiện theo version nên ifMatch kiểm tra
// phía client ngay trước khi ghi; cửa sổ hở nhỏ còn lại được manifest (Syncer) chặn bằng hash.
type Drive struct {
	Auth *Auth
	HTTP *http.Client

	// test trỏ sang máy chủ giả / đổi ngưỡng
	APIBase, UploadBase string
	ResumableOver       int
	Sleep               func(time.Duration)

	mu      sync.Mutex
	folders map[string]string // "scripts" → id thư mục
}

func (d *Drive) api() string {
	if d.APIBase != "" {
		return d.APIBase
	}
	return apiBase
}

func (d *Drive) upload() string {
	if d.UploadBase != "" {
		return d.UploadBase
	}
	return uploadBase
}

func (d *Drive) client() *http.Client {
	if d.HTTP != nil {
		return d.HTTP
	}
	return &http.Client{Timeout: 2 * time.Minute}
}

func (d *Drive) sleep(t time.Duration) {
	if d.Sleep != nil {
		d.Sleep(t)
		return
	}
	time.Sleep(t)
}

type fileInfo struct {
	ID  string `json:"id"`
	MD5 string `json:"md5Checksum"`
}

// do gửi request có token, thử lại khi 429 / 5xx / lỗi mạng (lùi dần, theo Retry-After); 401 thì làm mới token một lần.
// body gọi lại được nhiều lần (newBody) vì thử lại phải gửi lại từ đầu.
func (d *Drive) do(ctx context.Context, method, u string, newBody func() io.Reader, header http.Header) (*http.Response, error) {
	refreshed := false
	var lastErr error
	for try := 0; try < maxTries; try++ {
		if try > 0 {
			d.sleep(backoff(try, lastErr))
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
		}
		tok, err := d.Auth.AccessToken(ctx)
		if err != nil {
			return nil, err
		}
		var body io.Reader
		if newBody != nil {
			body = newBody()
		}
		req, err := http.NewRequestWithContext(ctx, method, u, body)
		if err != nil {
			return nil, err
		}
		for k, v := range header {
			req.Header[k] = v
		}
		req.Header.Set("Authorization", "Bearer "+tok)
		resp, err := d.client().Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			lastErr = err
			continue
		}
		switch {
		case resp.StatusCode == http.StatusUnauthorized && !refreshed:
			resp.Body.Close()
			refreshed = true
			if _, err := d.Auth.Refresh(ctx); err != nil {
				return nil, err
			}
			try-- // lần làm mới không tính vào số lần thử
		case resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500,
			resp.StatusCode == http.StatusForbidden && isRateLimit(resp):
			lastErr = &retryable{status: resp.StatusCode, after: resp.Header.Get("Retry-After")}
			resp.Body.Close()
		default:
			return resp, nil
		}
	}
	return nil, fmt.Errorf("Drive không phản hồi sau %d lần thử: %w", maxTries, lastErr)
}

type retryable struct {
	status int
	after  string
}

func (r *retryable) Error() string { return "Drive trả " + strconv.Itoa(r.status) }

// isRateLimit – Drive báo quá hạn mức bằng 403 (rateLimitExceeded / userRateLimitExceeded), không phải 429.
func isRateLimit(resp *http.Response) bool {
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	resp.Body = io.NopCloser(bytes.NewReader(b))
	return bytes.Contains(b, []byte("ateLimitExceeded"))
}

func backoff(try int, last error) time.Duration {
	if r, ok := last.(*retryable); ok {
		if s, err := strconv.Atoi(r.after); err == nil && s > 0 && s <= 60 {
			return time.Duration(s) * time.Second
		}
	}
	return 500 * time.Millisecond << (try - 1)
}

// decode đọc JSON trả về; mã lỗi khác 2xx thành lỗi có nội dung của Drive.
func decode(resp *http.Response, v any) error {
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if resp.StatusCode/100 != 2 {
		return apiError(resp.StatusCode, b)
	}
	if v == nil {
		return nil
	}
	return json.Unmarshal(b, v)
}

func apiError(status int, body []byte) error {
	var e struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(body, &e)
	msg := e.Error.Message
	if msg == "" {
		msg = strings.TrimSpace(string(body))
	}
	switch status {
	case http.StatusUnauthorized, http.StatusForbidden:
		if strings.Contains(msg, "has not been used") || strings.Contains(msg, "is disabled") {
			return fmt.Errorf("Google Drive API chưa bật cho project này (bật ở Google Cloud Console → APIs & Services): %s", msg)
		}
	}
	return fmt.Errorf("Drive %d: %s", status, msg)
}

// q – chuỗi truy vấn: thoát ' và \.
func q(s string) string {
	return strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(s)
}

// list tìm mục theo tên trong thư mục cha (có thể trùng tên: lấy cái tạo sớm nhất cho ổn định).
func (d *Drive) list(ctx context.Context, parent, name string, folder bool) (fileInfo, bool, error) {
	query := fmt.Sprintf("name = '%s' and '%s' in parents and trashed = false", q(name), q(parent))
	if folder {
		query += " and mimeType = '" + folderMime + "'"
	} else {
		query += " and mimeType != '" + folderMime + "'"
	}
	u := d.api() + "/files?" + url.Values{
		"q": {query}, "fields": {"files(id,md5Checksum)"}, "orderBy": {"createdTime"}, "pageSize": {"1"}, "spaces": {"drive"},
	}.Encode()
	resp, err := d.do(ctx, http.MethodGet, u, nil, nil)
	if err != nil {
		return fileInfo{}, false, err
	}
	var out struct {
		Files []fileInfo `json:"files"`
	}
	if err := decode(resp, &out); err != nil {
		return fileInfo{}, false, err
	}
	if len(out.Files) == 0 {
		return fileInfo{}, false, nil
	}
	return out.Files[0], true, nil
}

func (d *Drive) mkdir(ctx context.Context, parent, name string) (string, error) {
	meta := map[string]any{"name": name, "mimeType": folderMime}
	if parent != "" {
		meta["parents"] = []string{parent}
	}
	b, _ := json.Marshal(meta)
	resp, err := d.do(ctx, http.MethodPost, d.api()+"/files?fields=id", func() io.Reader { return bytes.NewReader(b) },
		http.Header{"Content-Type": {"application/json"}})
	if err != nil {
		return "", err
	}
	var f fileInfo
	if err := decode(resp, &f); err != nil {
		return "", err
	}
	return f.ID, nil
}

// folderID trả id thư mục "Ghosthand/a/b" (dir = "a/b", "" = gốc); create = tạo nếu thiếu, không thì ok=false.
func (d *Drive) folderID(ctx context.Context, dir string, create bool) (string, bool, error) {
	d.mu.Lock()
	if d.folders == nil {
		d.folders = map[string]string{}
	}
	if id, ok := d.folders[dir]; ok {
		d.mu.Unlock()
		return id, true, nil
	}
	d.mu.Unlock()

	parent := "root"
	cur := ""
	parts := []string{rootFolder}
	if dir != "" {
		parts = append(parts, strings.Split(dir, "/")...)
	}
	for i, name := range parts {
		if i > 0 {
			cur = strings.Join(parts[1:i+1], "/")
		}
		d.mu.Lock()
		id, cached := d.folders[cur]
		d.mu.Unlock()
		if !cached {
			f, found, err := d.list(ctx, parent, name, true)
			if err != nil {
				return "", false, err
			}
			switch {
			case found:
				id = f.ID
			case create:
				p := parent
				if p == "root" {
					p = "" // thư mục gốc "Ghosthand" nằm ở My Drive (mặc định)
				}
				if id, err = d.mkdir(ctx, p, name); err != nil {
					return "", false, err
				}
			default:
				return "", false, nil
			}
			d.mu.Lock()
			d.folders[cur] = id
			d.mu.Unlock()
		}
		parent = id
	}
	return parent, true, nil
}

func splitPath(p string) (dir, name string, err error) {
	if p == "" || strings.HasPrefix(p, "/") || strings.Contains(p, `\`) || strings.Contains(p, "..") {
		return "", "", fmt.Errorf("đường dẫn cloud không hợp lệ: %q", p)
	}
	if i := strings.LastIndex(p, "/"); i >= 0 {
		return p[:i], p[i+1:], nil
	}
	return "", p, nil
}

// locate tìm file theo đường dẫn; không có → ok=false.
func (d *Drive) locate(ctx context.Context, p string) (parent string, f fileInfo, ok bool, err error) {
	dir, name, err := splitPath(p)
	if err != nil {
		return "", f, false, err
	}
	parent, found, err := d.folderID(ctx, dir, false)
	if err != nil || !found {
		return "", f, false, err
	}
	f, ok, err = d.list(ctx, parent, name, false)
	return parent, f, ok, err
}

func (d *Drive) Get(ctx context.Context, p string) ([]byte, string, error) {
	_, f, ok, err := d.locate(ctx, p)
	if err != nil {
		return nil, "", err
	}
	if !ok {
		return nil, "", cloud.ErrNotFound
	}
	resp, err := d.do(ctx, http.MethodGet, d.api()+"/files/"+url.PathEscape(f.ID)+"?alt=media", nil, nil)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, "", cloud.ErrNotFound
	}
	b, err := io.ReadAll(resp.Body)
	if resp.StatusCode/100 != 2 {
		return nil, "", apiError(resp.StatusCode, b)
	}
	return b, f.MD5, err
}

func (d *Drive) Put(ctx context.Context, p string, data []byte, ifMatch string) (string, error) {
	dir, name, err := splitPath(p)
	if err != nil {
		return "", err
	}
	parent, _, err := d.folderID(ctx, dir, true)
	if err != nil {
		return "", err
	}
	f, exists, err := d.list(ctx, parent, name, false)
	if err != nil {
		return "", err
	}
	switch {
	case ifMatch == cloud.IfAny:
	case ifMatch == "" && exists, ifMatch != "" && (!exists || f.MD5 != ifMatch):
		return "", cloud.ErrPrecondition
	}
	meta := map[string]any{"name": name}
	method, target := http.MethodPost, "/files"
	if exists {
		method, target = http.MethodPatch, "/files/"+url.PathEscape(f.ID)
	} else {
		meta["parents"] = []string{parent}
	}
	mime := "application/octet-stream"
	if strings.HasSuffix(name, ".json") {
		mime = "application/json"
	}
	limit := d.ResumableOver
	if limit == 0 {
		limit = resumableOver
	}
	var out fileInfo
	if len(data) > limit {
		err = d.putResumable(ctx, method, target, meta, mime, data, &out)
	} else {
		err = d.putMultipart(ctx, method, target, meta, mime, data, &out)
	}
	return out.MD5, err
}

func (d *Drive) putMultipart(ctx context.Context, method, target string, meta map[string]any, mime string, data []byte, out *fileInfo) error {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	mj, _ := json.Marshal(meta)
	h := textproto.MIMEHeader{"Content-Type": {"application/json; charset=UTF-8"}}
	w, _ := mw.CreatePart(h)
	w.Write(mj)
	w, _ = mw.CreatePart(textproto.MIMEHeader{"Content-Type": {mime}})
	w.Write(data)
	mw.Close()
	body := buf.Bytes()
	resp, err := d.do(ctx, method, d.upload()+target+"?uploadType=multipart&fields=id,md5Checksum",
		func() io.Reader { return bytes.NewReader(body) }, http.Header{"Content-Type": {"multipart/related; boundary=" + mw.Boundary()}})
	if err != nil {
		return err
	}
	return decode(resp, out)
}

// putResumable: mở phiên (metadata) rồi gửi cả nội dung một lượt; lỗi giữa chừng thì thử lại từ đầu.
func (d *Drive) putResumable(ctx context.Context, method, target string, meta map[string]any, mime string, data []byte, out *fileInfo) error {
	mj, _ := json.Marshal(meta)
	resp, err := d.do(ctx, method, d.upload()+target+"?uploadType=resumable&fields=id,md5Checksum",
		func() io.Reader { return bytes.NewReader(mj) },
		http.Header{"Content-Type": {"application/json; charset=UTF-8"}, "X-Upload-Content-Type": {mime}, "X-Upload-Content-Length": {strconv.Itoa(len(data))}})
	if err != nil {
		return err
	}
	loc := resp.Header.Get("Location")
	if err := decode(resp, nil); err != nil {
		return err
	}
	if loc == "" {
		return errors.New("Drive không trả địa chỉ tải lên (resumable)")
	}
	resp, err = d.do(ctx, http.MethodPut, loc, func() io.Reader { return bytes.NewReader(data) }, http.Header{"Content-Type": {mime}})
	if err != nil {
		return err
	}
	return decode(resp, out)
}

func (d *Drive) Delete(ctx context.Context, p string) error {
	_, f, ok, err := d.locate(ctx, p)
	if err != nil || !ok {
		return err
	}
	resp, err := d.do(ctx, http.MethodDelete, d.api()+"/files/"+url.PathEscape(f.ID), nil, nil)
	if err != nil {
		return err
	}
	if resp.StatusCode == http.StatusNotFound {
		resp.Body.Close()
		return nil
	}
	return decode(resp, nil)
}
