package web

import (
	"context"
	_ "embed"
	"strconv"
	"time"

	"ghosthand/internal/model"
)

// "Chọn phần tử trên trang" (D3): người dùng bấm vào phần tử trong Chrome của app → sinh selector cho node web.

//go:embed pick.js
var pickJS string

// Picked – phần tử người dùng vừa chọn: selector đã kiểm (tìm lại ra đúng phần tử này), dòng đầu bền nhất.
type Picked struct {
	Selectors []string `json:"selectors"`
	Text      string   `json:"text"` // chữ của phần tử (cắt ngắn)
	Tab       string   `json:"tab"`  // URL tab đã chọn
}

// pickPoll – nhịp đọc trạng thái chọn trong trang.
const pickPoll = 150 * time.Millisecond

// maxPicked – số selector giữ lại (dòng sau là dự phòng).
const maxPicked = 3

// ErrPickCancelled – người dùng bấm Esc trong trang.
var ErrPickCancelled error = &BrowserError{"đã huỷ chọn phần tử"}

type pickState struct {
	State string   `json:"state"` // picking | done | cancelled | gone (trang đã chuyển / tải lại)
	Cands []string `json:"cands"`
	Text  string   `json:"text"`
}

// Pick đưa tab (lọc như Query.Tab) lên trước, bật chế độ chọn rồi chờ tới khi người dùng bấm (hoặc Esc / ctx huỷ).
// Không giữ khoá trong lúc chờ – Status / Find vẫn gọi được.
func (c *Chrome) Pick(ctx context.Context, tab string) (Picked, error) {
	t, url, err := c.tabFor(ctx, tab)
	if err != nil {
		return Picked{}, err
	}
	if err := bringToFront(ctx, t.ctx); err != nil {
		return Picked{}, err
	}
	pick := func(op string) (pickState, error) {
		return evalJS[pickState](ctx, t.ctx, "chọn phần tử", pageJS(pickJS, strconv.Quote(op)))
	}
	if _, err := pick("start"); err != nil {
		return Picked{}, err
	}
	defer func() {
		_, _ = evalJS[pickState](context.Background(), t.ctx, "gỡ chế độ chọn", pageJS(pickJS, `"stop"`))
	}()
	for {
		if err := sleepCtx(ctx, pickPoll); err != nil {
			return Picked{}, err
		}
		st, err := pick("read")
		if err != nil {
			return Picked{}, err
		}
		switch st.State {
		case "cancelled":
			return Picked{}, ErrPickCancelled
		case "gone":
			return Picked{}, &BrowserError{"trang vừa chuyển / tải lại – bấm Chọn phần tử lần nữa"}
		case "done":
			sels, err := c.verify(ctx, t, st.Cands)
			return Picked{Selectors: sels, Text: st.Text, Tab: url}, err
		}
	}
}

// verify giữ các ứng viên tìm lại ra đúng phần tử đã chọn (hoặc phần tử con – chữ trong nút), tối đa maxPicked.
// text="…" chỉ dùng khi text=… (chứa) không khớp – dòng dự phòng phải khác cách tìm thật.
// Không cái nào khớp (hiếm – trang đổi ngay sau khi bấm) → giữ ứng viên cuối (đường CSS) để người dùng sửa.
func (c *Chrome) verify(ctx context.Context, t *tabConn, cands []string) ([]string, error) {
	var out []string
	loose := map[string]bool{} // giá trị text= (chứa) đã giữ
	for _, line := range cands {
		if len(out) == maxPicked {
			break
		}
		sel, err := model.ParseSelector(line)
		if err != nil || sel.By == model.SelText && sel.Exact && loose[sel.Value] {
			continue
		}
		r, err := runFind(ctx, t.ctx, Query{Selectors: []model.Selector{sel}})
		if err != nil {
			continue // selector CSS lạ trình duyệt không nhận
		}
		if r.Sel < 0 {
			continue
		}
		same, err := evalJS[bool](ctx, t.ctx, "kiểm selector", sameTargetJS)
		if err != nil {
			return nil, err
		}
		if same {
			out = append(out, line)
			loose[sel.Value] = loose[sel.Value] || sel.By == model.SelText && !sel.Exact
		}
	}
	if len(out) == 0 && len(cands) > 0 {
		out = cands[len(cands)-1:]
	}
	return out, nil
}

const sameTargetJS = `(() => { const p = window.__acPicked, t = window.__acTarget; return !!(p && t && (p === t || p.contains(t))); })()`

// tabFor – kết nối tới tab lọc theo filter (như Query.Tab) + URL của nó; filter rỗng = tab ưu tiên của node web.
func (c *Chrome) tabFor(ctx context.Context, filter string) (*tabConn, string, error) {
	return c.pickFor(ctx, filter, false)
}

// activeTabFor – như tabFor nhưng filter rỗng = tab đang hiện (vừa mở / vừa dùng gần nhất, kể cả popup trang tự mở),
// không bám tab Open cũ – cho công cụ đọc của AI (probe_page, read_web_outline).
func (c *Chrome) activeTabFor(ctx context.Context, filter string) (*tabConn, string, error) {
	return c.pickFor(ctx, filter, true)
}

func (c *Chrome) pickFor(ctx context.Context, filter string, active bool) (*tabConn, string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	port, err := c.connect(ctx)
	if err != nil {
		return nil, "", err
	}
	tabs, err := listTabs(ctx, port)
	if err != nil {
		return nil, "", &BrowserError{"mất kết nối trình duyệt: " + err.Error()}
	}
	prefer := c.prefer
	if active {
		prefer = ""
	}
	ti, ok := pickTab(tabs, filter, prefer)
	if !ok {
		if filter == "" {
			return nil, "", ErrNoBrowser
		}
		return nil, "", &BrowserError{"không thấy tab nào có URL / tiêu đề chứa “" + filter + "”"}
	}
	t, err := c.tab(ti.ID, tabs)
	return t, ti.URL, err
}
