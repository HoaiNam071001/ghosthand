package element

import (
	"fmt"
	"sort"
	"strings"

	"ghosthand/internal/model"
)

// Suggestion – một selector ứng viên cho một phần tử (bước 43 A4), đã thử trên cây hiện tại.
type Suggestion struct {
	Selector   string `json:"selector"`
	Occurrence int    `json:"occurrence"`     // chỗ thứ mấy (1 = chỗ đầu) – ghi vào trường occurrence của node
	Matches    int    `json:"matches"`        // số phần tử khớp selector này trên màn hiện tại
	Unique     bool   `json:"unique"`         // chỉ một phần tử khớp – không cần occurrence
	Stability  string `json:"stability"`      // good | fair | poor
	Note       string `json:"note,omitempty"` // vì sao xếp vậy
	rank       int
}

// Suggest sinh các selector tìm lại đúng nodes[i], xếp bền → kém: duy nhất trước (nhãn aria > chữ > vai trò + tên > vai
// trò), rồi tới những selector phải kèm “chỗ thứ N” (dễ hỏng khi danh sách đổi thứ tự). Mỗi dòng đều kiểm bằng Find.
func Suggest(nodes []Node, i int) []Suggestion {
	var out []Suggestion
	for _, line := range candidates(nodes[i]) {
		s, err := model.ParseSelector(line)
		if err != nil {
			continue
		}
		k := occurrenceOf(nodes, s, i)
		if k == 0 {
			continue
		}
		n := len(match(nodes, s, Query{}))
		sg := Suggestion{Selector: line, Occurrence: k, Matches: n, Unique: n == 1, rank: rankOf(line)}
		switch {
		case n == 1 && sg.rank <= 1:
			sg.Stability = "good"
		case n == 1:
			sg.Stability = "fair"
			sg.Note = "chỉ dựa vào vai trò / tên – đổi nhãn là hỏng"
		default:
			sg.Stability = "poor"
			sg.Note = fmt.Sprintf("%d chỗ khớp – phải kèm occurrence %d", n, k)
		}
		out = append(out, sg)
	}
	sort.SliceStable(out, func(a, b int) bool {
		if out[a].Unique != out[b].Unique {
			return out[a].Unique
		}
		return out[a].rank < out[b].rank
	})
	return out
}

// candidates – các dòng selector có thể viết cho n, theo độ ưu tiên (nhãn aria bền hơn chữ vì ít bị đổi theo ngôn ngữ).
func candidates(n Node) []string {
	var lines []string
	if d := strings.TrimSpace(n.Desc); usable(d) {
		lines = append(lines, quoted("aria", d))
	}
	if t := strings.TrimSpace(n.ownText()); usable(t) {
		lines = append(lines, quoted("text", t))
	}
	if name := strings.TrimSpace(n.Name()); n.Role != "" && usable(name) && !strings.Contains(name, `"`) {
		lines = append(lines, fmt.Sprintf(`role=%s[name="%s"]`, n.Role, name))
	}
	if n.Role != "" {
		lines = append(lines, "role="+n.Role)
	}
	return lines
}

// rankOf – độ bền theo loại selector: aria 0, chữ 1, vai trò + tên 2, vai trò 3.
func rankOf(line string) int {
	switch {
	case strings.HasPrefix(line, "aria="):
		return 0
	case strings.HasPrefix(line, "text="):
		return 1
	case strings.Contains(line, "[name="):
		return 2
	}
	return 3
}
