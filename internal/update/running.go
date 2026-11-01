package update

import (
	"os"
	"time"
)

// Running – bản đang chạy (59 U1): MCP `app_info`, /health – AI / dev-install kiểm đúng bản vừa cài đã lên.
type Running struct {
	Version   string `json:"version"`
	Commit    string `json:"commit,omitempty"`
	BuiltAt   string `json:"builtAt,omitempty"`
	StartedAt string `json:"startedAt"`
	PID       int    `json:"pid"`
	Path      string `json:"path,omitempty"` // .app (macOS) / exe; trống khi không đọc được
}

var started = time.Now()

// Current – thông tin tiến trình này.
func Current() Running {
	r := Running{Version: Version, Commit: Commit, BuiltAt: BuiltAt, StartedAt: started.Format(time.RFC3339), PID: os.Getpid()}
	if IsDev() {
		r.Version = "dev"
	}
	if exe, err := os.Executable(); err == nil {
		r.Path = exe
		if app := AppBundle(exe); app != "" {
			r.Path = app
		}
	}
	return r
}
