// Package procinfo liệt kê tiến trình kèm CPU / RAM cho node Tiến trình (bước 43 S5). Làm với cả tiến trình nền
// không có cửa sổ (khác device.Apps). Test thay Backend bản giả.
package procinfo

import (
	"context"
	"sort"
	"time"

	"github.com/shirou/gopsutil/v4/process"
)

// Info – một tiến trình. CPU tính như Activity Monitor / Task Manager gộp lõi: 100 = đầy một lõi (có thể > 100).
type Info struct {
	PID   int
	Name  string
	CPU   float64
	MemMB float64
}

// Backend – liệt kê mọi tiến trình, CPU đo trong khoảng ngắn (SampleWindow).
type Backend interface {
	List(ctx context.Context) ([]Info, error)
}

// SampleWindow – khoảng đo CPU: chênh thời gian CPU giữa hai lần đọc chia cho khoảng này.
const SampleWindow = 300 * time.Millisecond

// System – Backend thật (gopsutil).
type System struct{}

func (System) List(ctx context.Context) ([]Info, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, err
	}
	before := make(map[int32]float64, len(procs))
	for _, p := range procs {
		if t, err := p.TimesWithContext(ctx); err == nil {
			before[p.Pid] = t.User + t.System
		}
	}
	start := time.Now()
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(SampleWindow):
	}
	elapsed := time.Since(start).Seconds()

	out := make([]Info, 0, len(procs))
	for _, p := range procs {
		name, err := p.NameWithContext(ctx)
		if err != nil || name == "" {
			continue // tiến trình vừa thoát / không đọc được (quyền)
		}
		in := Info{PID: int(p.Pid), Name: name}
		if t, err := p.TimesWithContext(ctx); err == nil {
			if b, ok := before[p.Pid]; ok {
				in.CPU = cpuPercent(t.User+t.System-b, elapsed)
			}
		}
		if m, err := p.MemoryInfoWithContext(ctx); err == nil && m != nil {
			in.MemMB = float64(m.RSS) / (1 << 20)
		}
		out = append(out, in)
	}
	return out, nil
}

func cpuPercent(deltaSec, elapsedSec float64) float64 {
	if deltaSec <= 0 || elapsedSec <= 0 {
		return 0
	}
	return deltaSec / elapsedSec * 100
}

// Group – các tiến trình cùng tên gộp một dòng (Chrome Helper ×12…) để người dùng chọn tên cho node Tiến trình.
type Group struct {
	Name  string  `json:"name"`
	Count int     `json:"count"`
	CPU   float64 `json:"cpu"`   // tổng CPU %
	MemMB float64 `json:"memMB"` // tổng RAM
}

// Groups gộp theo tên, nặng CPU trước rồi tới RAM, rồi theo tên.
func Groups(list []Info) []Group {
	by := map[string]*Group{}
	var out []*Group
	for _, p := range list {
		g := by[p.Name]
		if g == nil {
			g = &Group{Name: p.Name}
			by[p.Name] = g
			out = append(out, g)
		}
		g.Count++
		g.CPU += p.CPU
		g.MemMB += p.MemMB
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.CPU != b.CPU {
			return a.CPU > b.CPU
		}
		if a.MemMB != b.MemMB {
			return a.MemMB > b.MemMB
		}
		return a.Name < b.Name
	})
	res := make([]Group, len(out))
	for i, g := range out {
		res[i] = *g
	}
	return res
}
