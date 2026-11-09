package mcpcloud

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"path"
	"strings"
	"sync"

	"ghosthand/internal/cloud"
	"ghosthand/internal/cloud/mcpmap"
	"ghosthand/internal/mcpclient"
)

// CallFunc gọi một tool của server (app bọc bằng cổng quyền MCP: hỏi server lần đầu, hỏi tool ghi/xoá).
type CallFunc func(ctx context.Context, tool string, args map[string]any) (mcpclient.Result, error)

// Provider – cloud.Provider trên MCP. Version = sha256 nội dung; MCP không có ghi có điều kiện nên ifMatch kiểm tra phía
// client ngay trước khi ghi (cửa sổ hở nhỏ còn lại do manifest của Syncer chặn bằng hash, như Drive).
type Provider struct {
	Map  mcpmap.Mapping
	Call CallFunc

	mu   sync.Mutex
	dirs map[string]bool // thư mục đã tạo trong lượt này
}

var _ cloud.Provider = (*Provider)(nil)

// Chuỗi server hay dùng để báo "không có file" – khớp không phân biệt hoa thường.
var notFoundMarks = []string{"not found", "no such file", "enoent", "does not exist", "doesn't exist", "không tìm thấy", "không tồn tại"}

func (p *Provider) full(rel string) string {
	return strings.TrimRight(p.Map.Root, "/\\") + "/" + strings.TrimLeft(rel, "/")
}

func version(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

// call gọi tool và đổi kết quả lỗi của tool thành error (lời báo của server cắt ngắn, chỉ là dữ liệu).
func (p *Provider) call(ctx context.Context, tool string, args map[string]any) (string, error) {
	res, err := p.Call(ctx, tool, args)
	if err != nil {
		return "", err
	}
	txt := res.Text()
	if res.IsError {
		return txt, &toolError{tool: tool, msg: txt}
	}
	return txt, nil
}

type toolError struct{ tool, msg string }

func (e *toolError) Error() string {
	m := e.msg
	if r := []rune(m); len(r) > 200 {
		m = string(r[:200]) + "…"
	}
	return fmt.Sprintf("tool %s báo lỗi: %s", e.tool, m)
}

func (e *toolError) notFound() bool {
	l := strings.ToLower(e.msg)
	for _, m := range notFoundMarks {
		if strings.Contains(l, m) {
			return true
		}
	}
	return false
}

func (p *Provider) Get(ctx context.Context, rel string) ([]byte, string, error) {
	txt, err := p.call(ctx, p.Map.ReadTool, map[string]any{p.Map.PathArg: p.full(rel)})
	var te *toolError
	if errors.As(err, &te) && te.notFound() {
		return nil, "", cloud.ErrNotFound
	}
	if err != nil {
		return nil, "", err
	}
	data, derr := base64.StdEncoding.DecodeString(strings.TrimSpace(txt))
	if derr != nil {
		return nil, "", fmt.Errorf("%s trên server: %w (%v)", rel, errNotOurs, derr)
	}
	return data, version(data), nil
}

func (p *Provider) Put(ctx context.Context, rel string, data []byte, ifMatch string) (string, error) {
	if ifMatch != cloud.IfAny {
		if err := p.check(ctx, rel, ifMatch); err != nil {
			return "", err
		}
	}
	if err := p.mkdir(ctx, path.Dir(p.full(rel))); err != nil {
		return "", err
	}
	_, err := p.call(ctx, p.Map.WriteTool, map[string]any{
		p.Map.PathArg: p.full(rel), p.Map.ContentArg: base64.StdEncoding.EncodeToString(data),
	})
	if err != nil {
		return "", err
	}
	return version(data), nil
}

func (p *Provider) mkdir(ctx context.Context, dir string) error {
	if p.Map.MkdirTool == "" {
		return nil
	}
	p.mu.Lock()
	done := p.dirs[dir]
	p.mu.Unlock()
	if done {
		return nil
	}
	if _, err := p.call(ctx, p.Map.MkdirTool, map[string]any{p.Map.PathArg: dir}); err != nil {
		return err
	}
	p.mu.Lock()
	if p.dirs == nil {
		p.dirs = map[string]bool{}
	}
	p.dirs[dir] = true
	p.mu.Unlock()
	return nil
}

func (p *Provider) Delete(ctx context.Context, rel string) error {
	if p.Map.DeleteTool == "" {
		return nil // manifest mới là danh sách file hợp lệ: file mồ côi trên server không ảnh hưởng
	}
	_, err := p.call(ctx, p.Map.DeleteTool, map[string]any{p.Map.PathArg: p.full(rel)})
	var te *toolError
	if errors.As(err, &te) && te.notFound() {
		return nil
	}
	return err
}

// check: ifMatch "" = chỉ tạo mới (đã có file → ErrPrecondition), còn lại = file phải đang đúng version đó.
func (p *Provider) check(ctx context.Context, rel, ifMatch string) error {
	_, ver, err := p.Get(ctx, rel)
	switch {
	case errors.Is(err, cloud.ErrNotFound):
		if ifMatch != "" {
			return cloud.ErrPrecondition
		}
		return nil
	case errors.Is(err, errNotOurs):
		return cloud.ErrPrecondition // có file lạ ở đó: để Syncer quyết định ghi đè (IfAny) chứ không im lặng
	case err != nil:
		return err
	case ifMatch == "" || ifMatch != ver:
		return cloud.ErrPrecondition
	}
	return nil
}

var errNotOurs = errors.New("không phải file do Ghosthand ghi")
