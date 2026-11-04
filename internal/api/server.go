// Package api – API local của app (bước 22): HTTP chỉ nghe 127.0.0.1, Bearer token. CLI (`ghosthand run`), chương
// trình khác và MCP (31 – gắn route /mcp qua Handle) đều gọi vào đây; việc thật làm ở Backend (App trong main).
//
//	GET  /health                 – app đang mở (không cần token) → {ok, version, commit}
//	POST /quit                   – thoát êm (59 U2); đang chạy kịch bản → 409 busy, chưa lưu → 409 unsaved
//	POST /run    {path, preset, values, countdown, source, wait} → {runId} (wait: chờ xong → Status)
//	POST /stop   {runId}         → {stopped}
//	GET  /status ?runId=         → Status (trống = đang chạy / gần nhất)
//	GET  /events ?runId=         – SSE: event của app (engine:progress, engine:node, run:ended…); có runId thì đóng sau run:ended của nó
//	GET  /script ?path=          → {script, revision}
//	PUT  /script {path, script, revision} → {revision} (revision cũ → 409 conflict)
//	POST /batch  batch.Request   → {batchId, names} – chạy nhiều kịch bản một lượt (61 M2, batch.go)
//	GET  /batch  ?id=            → batch.Status (trống = lượt mới nhất)
//	POST /batch/stop {batchId}   → {stopped}
package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io/fs"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ghosthand/internal/batch"
	"ghosthand/internal/model"
	"ghosthand/internal/session"
	"ghosthand/internal/store"
	"ghosthand/internal/update"
)

// RunRequest – thân POST /run.
type RunRequest struct {
	Path      string         `json:"path"`
	Preset    string         `json:"preset,omitempty"` // tên bộ giá trị input đã lưu trong app
	Values    map[string]any `json:"values,omitempty"` // ghi đè từng input (sau preset)
	Countdown int            `json:"countdown,omitempty"`
	Source    string         `json:"source,omitempty"` // api (mặc định) | cli
	Wait      bool           `json:"wait,omitempty"`
}

// Backend – việc thật (main.App). path luôn là đường dẫn tuyệt đối.
type Backend interface {
	Run(req RunRequest) (string, error)
	Stop(runID string) bool
	Status(runID string) (session.Status, error)
	Wait(ctx context.Context, runID string) (session.Status, error)
	ReadScript(path string) (model.Script, int, error)
	WriteScript(path string, sc model.Script, revision int) (int, error)
	// Lượt chạy nhiều kịch bản (61 M2): StartBatch trả id + tên các kịch bản sẽ chạy (theo thứ tự).
	StartBatch(req batch.Request) (string, []string, error)
	BatchStatus(id string) (batch.Status, error)
	StopBatch(id string) bool
	// Quit thoát app sau khi trả lời (dev-install, CLI `ghosthand quit`); từ chối khi đang chạy (bọc session.ErrBusy)
	// hoặc kịch bản đang soạn chưa lưu (bọc ErrUnsaved).
	Quit() error
}

// ErrUnsaved – kịch bản đang soạn chưa lưu, không tự thoát được.
var ErrUnsaved = errors.New("kịch bản đang soạn chưa lưu")

type Server struct {
	mux  *http.ServeMux
	back Backend
	hub  *Hub
}

func New(back Backend, hub *Hub) *Server {
	s := &Server{mux: http.NewServeMux(), back: back, hub: hub}
	s.mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		r := update.Current()
		writeJSON(w, 200, map[string]any{"ok": true, "version": r.Version, "commit": r.Commit})
	})
	s.mux.HandleFunc("POST /quit", func(w http.ResponseWriter, _ *http.Request) {
		if err := s.back.Quit(); err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"quitting": true})
	})
	s.mux.HandleFunc("POST /run", s.run)
	s.mux.HandleFunc("POST /stop", s.stop)
	s.mux.HandleFunc("GET /status", s.status)
	s.mux.HandleFunc("GET /events", s.events)
	s.mux.HandleFunc("GET /script", s.readScript)
	s.mux.HandleFunc("PUT /script", s.writeScript)
	s.addBatch()
	return s
}

// Handle gắn thêm route (vd /mcp – bước 31); vẫn qua kiểm tra token của listener.
func (s *Server) Handle(pattern string, h http.Handler) { s.mux.Handle(pattern, h) }

// Listener – một cổng đang nghe với token riêng.
type Listener struct {
	Port int
	srv  *http.Server
}

func (l *Listener) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	return l.srv.Shutdown(ctx)
}

// Listen nghe 127.0.0.1:port (0 = cổng ngẫu nhiên) với token.
func (s *Server) Listen(port int, token string) (*Listener, error) {
	ln, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(port)))
	if err != nil {
		return nil, err
	}
	srv := &http.Server{Handler: s.guard(token), ReadHeaderTimeout: 5 * time.Second}
	go srv.Serve(ln)
	return &Listener{Port: ln.Addr().(*net.TCPAddr).Port, srv: srv}, nil
}

// guard: Host phải là localhost (chặn DNS rebinding từ trang web), token đúng (trừ /health).
func (s *Server) guard(token string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" {
			writeErr(w, 403, "forbidden", "chỉ nhận yêu cầu tới 127.0.0.1")
			return
		}
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if r.URL.Path != "/health" && subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
			writeErr(w, 401, "unauthorized", "thiếu hoặc sai token (Authorization: Bearer <token>)")
			return
		}
		s.mux.ServeHTTP(w, r)
	})
}

func (s *Server) run(w http.ResponseWriter, r *http.Request) {
	var req RunRequest
	if !readJSON(w, r, &req) {
		return
	}
	if req.Path == "" {
		writeErr(w, 400, "invalid", "thiếu path (file kịch bản)")
		return
	}
	id, err := s.back.Run(req)
	if err != nil {
		writeError(w, err)
		return
	}
	if !req.Wait {
		writeJSON(w, 200, map[string]any{"runId": id})
		return
	}
	st, err := s.back.Wait(r.Context(), id)
	if err != nil && st.RunID == "" {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, st)
}

func (s *Server) stop(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RunID string `json:"runId"`
	}
	if r.ContentLength != 0 && !readJSON(w, r, &req) {
		return
	}
	writeJSON(w, 200, map[string]any{"stopped": s.back.Stop(req.RunID)})
}

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	st, err := s.back.Status(r.URL.Query().Get("runId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, st)
}

func (s *Server) readScript(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	sc, rev, err := s.back.ReadScript(path)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"path": path, "script": sc, "revision": rev})
}

func (s *Server) writeScript(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path     string       `json:"path"`
		Script   model.Script `json:"script"`
		Revision int          `json:"revision"`
	}
	if !readJSON(w, r, &req) {
		return
	}
	rev, err := s.back.WriteScript(req.Path, req.Script, req.Revision)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"revision": rev})
}

// ---- JSON + lỗi có cấu trúc (AI tự sửa được) ----

func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20)).Decode(v); err != nil {
		writeErr(w, 400, "invalid", "JSON không đọc được: "+err.Error())
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, kind, msg string) {
	writeJSON(w, code, map[string]any{"error": msg, "code": kind})
}

// writeError đổi lỗi Go → mã HTTP + code; lỗi kịch bản kèm chi tiết (node, trường).
func writeError(w http.ResponseWriter, err error) {
	body := map[string]any{"error": err.Error(), "code": "invalid"}
	code := 400
	var se *model.ScriptError
	var ce *store.ConflictError
	switch {
	case errors.Is(err, session.ErrBusy):
		code, body["code"] = 409, "busy"
	case errors.Is(err, ErrUnsaved):
		code, body["code"] = 409, "unsaved"
	case errors.Is(err, session.ErrNotFound), errors.Is(err, fs.ErrNotExist):
		code, body["code"] = 404, "not_found"
	case errors.Is(err, session.ErrDangerNotConfirmed):
		code, body["code"] = 403, "permission"
	case errors.As(err, &ce):
		code, body["code"], body["revision"] = 409, ce.Code(), ce.Have
	case errors.As(err, &se):
		body["detail"] = se
	}
	writeJSON(w, code, body)
}
