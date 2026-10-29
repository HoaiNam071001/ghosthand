package engine

import (
	"context"
	"errors"
	"os"
	"testing"

	"ghosthand/internal/mcpclient"
	"ghosthand/internal/model"
	"ghosthand/internal/model/modeltest"
	"ghosthand/internal/script/scripttest"
)

type mcpCall struct {
	server, tool string
	args         map[string]any
}

func runMCP(t *testing.T, call MCPCaller, patch func(*model.Step)) (map[string]any, string, error) {
	t.Helper()
	s := modeltest.Step(model.StepMCPTool, func(s *model.Step) {
		s.MCPServer, s.MCPTool = "fs", "read"
		if patch != nil {
			patch(s)
		}
	})
	e := newEngine(nil, scripttest.Linear(model.Script{Loops: 1, Steps: []model.Step{s}}), nil)
	e.mcp = call
	err := e.Run(t.Context())
	if r := e.results[e.sc.Steps[0].ID]; r != nil {
		return r.Output, code(e), err
	}
	return nil, code(e), err
}

func textResult(s string) mcpclient.Result {
	return mcpclient.Result{Content: []mcpclient.Content{{Kind: "text", Text: s}}}
}

func TestMCPToolText(t *testing.T) {
	var got mcpCall
	out, c, err := runMCP(t, func(_ context.Context, srv, tool string, args map[string]any) (mcpclient.Result, error) {
		got = mcpCall{srv, tool, args}
		return textResult(" xin chào \n"), nil
	}, func(s *model.Step) { s.MCPArgs = `{"path":"/a/b","n":3}` })
	if err != nil || c != "" || out["text"] != "xin chào" || out["isError"] != false {
		t.Fatalf("out=%v code=%q err=%v", out, c, err)
	}
	if got.server != "fs" || got.tool != "read" || got.args["path"] != "/a/b" {
		t.Errorf("gọi sai: %+v", got)
	}
}

func TestMCPToolStructuredAndJSONText(t *testing.T) {
	out, _, err := runMCP(t, func(context.Context, string, string, map[string]any) (mcpclient.Result, error) {
		r := textResult(`{"a":1}`)
		r.Structured = map[string]any{"count": float64(2)}
		return r, nil
	}, nil)
	if j, _ := out["json"].(map[string]any); err != nil || j["count"] != 2 {
		t.Fatalf("structured: out=%v err=%v", out, err)
	}
	out, _, _ = runMCP(t, func(context.Context, string, string, map[string]any) (mcpclient.Result, error) {
		return textResult(`[1,2]`), nil
	}, nil)
	if j, _ := out["json"].([]any); len(j) != 2 {
		t.Errorf("json từ chữ: %v", out)
	}
}

func TestMCPToolIsErrorFails(t *testing.T) {
	out, c, err := runMCP(t, func(context.Context, string, string, map[string]any) (mcpclient.Result, error) {
		r := textResult("không thấy file")
		r.IsError = true
		return r, nil
	}, nil)
	if err == nil || c != model.ErrMCP || out["isError"] != true || out["text"] != "không thấy file" {
		t.Fatalf("out=%v code=%q err=%v", out, c, err)
	}
}

func TestMCPToolErrors(t *testing.T) {
	fail := func(err error) MCPCaller {
		return func(context.Context, string, string, map[string]any) (mcpclient.Result, error) {
			return mcpclient.Result{}, err
		}
	}
	for name, tc := range map[string]struct {
		call  MCPCaller
		patch func(*model.Step)
		code  string
	}{
		"không nối được": {fail(errors.New("connection refused")), nil, model.ErrMCP},
		"từ chối":        {fail(mcpclient.ErrDenied), nil, model.ErrPermission},
		"hết giờ":        {fail(context.DeadlineExceeded), nil, model.ErrMCP},
		"không có app":   {nil, nil, model.ErrInvalidInput},
	} {
		if _, c, err := runMCP(t, tc.call, tc.patch); err == nil || c != tc.code {
			t.Errorf("%s: code=%q err=%v, muốn %q", name, c, err, tc.code)
		}
	}
}

func TestMCPToolSavesImage(t *testing.T) {
	out, _, err := runMCP(t, func(context.Context, string, string, map[string]any) (mcpclient.Result, error) {
		return mcpclient.Result{Content: []mcpclient.Content{{Kind: "image", MIME: "image/png", Data: []byte("png")}}}, nil
	}, nil)
	items, _ := out["content"].([]any)
	if err != nil || len(items) != 1 {
		t.Fatalf("out=%v err=%v", out, err)
	}
	p, _ := items[0].(map[string]any)["path"].(string)
	if b, rerr := os.ReadFile(p); rerr != nil || string(b) != "png" {
		t.Errorf("ảnh không lưu: %q %v", p, rerr)
	} else {
		_ = os.Remove(p)
	}
}
