package web

import (
	"testing"
	"time"
)

func TestLoadWatch(t *testing.T) {
	t0 := time.Unix(0, 0)
	at := func(ms int) time.Time { return t0.Add(time.Duration(ms) * time.Millisecond) }
	type sample struct {
		ms    int
		state string
		nodes int
		idle  int // ms từ lần cuối có phần tử thêm / bớt (settleJS)
	}
	cases := []struct {
		name    string
		samples []sample
		wantAt  int // ms lần đầu settled; -1 = không bao giờ
	}{
		{"complete, đứng yên", []sample{{0, "complete", 200, 0}, {900, "complete", 200, 0}, {1500, "complete", 200, 0}}, 1500},
		{"không bao giờ complete nhưng đã đứng yên", []sample{{0, "interactive", 500, 0}, {1000, "interactive", 501, 0}, {1600, "interactive", 502, 0}}, 1600},
		{"còn loading thì chờ", []sample{{0, "loading", 100, 0}, {1500, "loading", 100, 0}, {3000, "loading", 100, 0}}, -1},
		{"SPA đang dựng thêm phần tử", []sample{{0, "complete", 20, 0}, {1000, "complete", 300, 0}, {2000, "complete", 800, 0}, {3600, "complete", 805, 0}}, 3600},
		{"đồng hồ / carousel đổi ít", []sample{{0, "complete", 1000, 0}, {800, "complete", 1010, 0}, {1600, "complete", 995, 0}}, 1600},
		{"observer đã yên đủ lâu thì xong ngay", []sample{{0, "complete", 300, 1500}}, 0},
		{"observer yên nhưng còn loading", []sample{{0, "loading", 300, 2000}, {300, "loading", 300, 2300}}, -1},
	}
	for _, c := range cases {
		var w loadWatch
		got := -1
		for _, s := range c.samples {
			if w.settled(settleProbe{State: s.state, Nodes: s.nodes, Idle: s.idle}, at(s.ms)) {
				got = s.ms
				break
			}
		}
		if got != c.wantAt {
			t.Errorf("%s: settled lúc %d ms, muốn %d", c.name, got, c.wantAt)
		}
	}
}
