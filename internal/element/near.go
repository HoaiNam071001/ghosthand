package element

import (
	"cmp"
	"slices"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Near – phần tử gần giống cách tìm (StepError.Detail khi không thấy, bước 31b): AI / người xem để sửa selector.
type Near struct {
	Role   string     `json:"role"`
	Name   string     `json:"name"`
	Box    model.Rect `json:"box"`
	Score  int        `json:"score"`            // % giống tên (vision.Similarity), cao nhất trong các selector
	Hidden bool       `json:"hidden,omitempty"` // khung bị kẹp (ngoài viewport / khung cuộn) – phải cuộn tới mới bấm được
}

// nearMin – dưới mức này coi như không liên quan (trừ phần tử cùng vai trò với role=).
const nearMin = 50

type nearCand struct {
	Near
	sameRole, inDoc bool
}

// NearMatches – tối đa n phần tử giống q nhất (đã lọc vùng); phần tử khớp hẳn cũng có (100 %) – khi thiếu chỗ thứ N,
// chúng là các chỗ đã thấy. Thứ tự (57 C1): cùng vai trò với role= (tên chỉ phụ – nhãn hay đổi theo ngôn ngữ / bản
// app) → đang hiện → nằm trong vùng trang (document; ngoài đó là thanh tab / địa chỉ của trình duyệt) → % giống.
func NearMatches(nodes []Node, q Query, n int) []Near {
	docs := documentBoxes(nodes)
	var cands []nearCand
	for _, nd := range nodes {
		if nd.Role == "window" || nd.Role == "document" || q.Area != nil && !inside(nd.Box, *q.Area) {
			continue
		}
		best, same := 0, false
		for _, s := range q.Selectors {
			best = max(best, nearScore(nd, s))
			same = same || s.By == model.SelRole && nd.Role == s.Value
		}
		if best >= nearMin || same {
			cands = append(cands, nearCand{Near{Role: nd.Role, Name: cmp.Or(nd.Name(), nd.Text()), Box: nd.Box, Score: best, Hidden: !nd.Shown()},
				same, inAny(nd.Box, docs)})
		}
	}
	slices.SortStableFunc(cands, func(a, b nearCand) int {
		return cmp.Or(firstTrue(a.sameRole, b.sameRole), firstTrue(!a.Hidden, !b.Hidden), firstTrue(a.inDoc, b.inDoc),
			b.Score-a.Score)
	})
	out := make([]Near, 0, min(len(cands), n))
	for _, c := range cands[:min(len(cands), n)] {
		out = append(out, c.Near)
	}
	return out
}

// firstTrue – so sánh cho sort: true đứng trước.
func firstTrue(a, b bool) int {
	switch {
	case a == b:
		return 0
	case a:
		return -1
	}
	return 1
}

// documentBoxes – khung các vùng trang (role document). Không có (app thường) → nil: mọi phần tử coi như trong trang.
func documentBoxes(nodes []Node) []model.Rect {
	var out []model.Rect
	for _, nd := range nodes {
		if nd.Role == "document" && nd.Shown() {
			out = append(out, nd.Box)
		}
	}
	return out
}

func inAny(b model.Rect, areas []model.Rect) bool {
	if areas == nil {
		return true
	}
	return slices.ContainsFunc(areas, func(a model.Rect) bool { return inside(b, a) })
}

// nearScore – một phần tử giống một selector bao nhiêu %. role=: sai vai trò thì chỉ tính nửa phần tên.
func nearScore(nd Node, s model.Selector) int {
	switch s.By {
	case model.SelText:
		return max(vision.Similarity(nd.ownText(), s.Value), vision.Similarity(nd.Name(), s.Value))
	case model.SelAria:
		return max(vision.Similarity(nd.Desc, s.Value), vision.Similarity(nd.Name(), s.Value))
	case model.SelRole:
		name := 100
		if s.Name != "" {
			name = vision.Similarity(nd.Name(), s.Name)
		}
		if nd.Role != s.Value {
			if s.Name == "" {
				return 0
			}
			return name / 2
		}
		return name
	}
	return 0
}
