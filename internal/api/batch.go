package api

import (
	"net/http"

	"ghosthand/internal/batch"
)

// Lượt chạy nhiều kịch bản (bước 61 M2) – CLI `ghosthand test` gửi rồi hỏi tiến độ định kỳ (một lượt có thể vài phút).

func (s *Server) addBatch() {
	s.mux.HandleFunc("POST /batch", func(w http.ResponseWriter, r *http.Request) {
		var req batch.Request
		if !readJSON(w, r, &req) {
			return
		}
		id, names, err := s.back.StartBatch(req)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"batchId": id, "names": names})
	})
	s.mux.HandleFunc("GET /batch", func(w http.ResponseWriter, r *http.Request) {
		st, err := s.back.BatchStatus(r.URL.Query().Get("id"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, st)
	})
	s.mux.HandleFunc("POST /batch/stop", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID string `json:"batchId"`
		}
		if !readJSON(w, r, &req) {
			return
		}
		writeJSON(w, 200, map[string]any{"stopped": s.back.StopBatch(req.ID)})
	})
}
