package engine

import (
	"unicode/utf8"

	"ghosthand/internal/model"
	"ghosthand/internal/script"
)

// Dữ liệu cho Lịch sử chạy dạng cây (bước 60 V0): input đã thay biến + lượt lặp của mỗi lần chạy node.

const maxInputRunes = 200 // chuỗi dài (thân HTTP, văn bản gõ) cắt bớt – lịch sử chỉ cần nhìn

// nodeInput – ô có biến của node gốc s → giá trị sau khi thay (rs = bản đã thay, cùng cấu trúc với s).
// Ô không có biến bỏ qua: giá trị cố định đọc được từ kịch bản.
func nodeInput(s, rs model.Step) map[string]any {
	src, dst := script.VarFields(&s), script.VarFields(&rs)
	if len(src) != len(dst) {
		return nil
	}
	var out map[string]any
	for i, f := range src {
		if !script.NodeVarRe.MatchString(*f.Ptr) {
			continue
		}
		if out == nil {
			out = map[string]any{}
		}
		out[f.Name] = clipInput(*dst[i].Ptr)
	}
	return out
}

func clipInput(v string) string {
	if utf8.RuneCountInString(v) <= maxInputRunes {
		return v
	}
	r := []rune(v)
	return string(r[:maxInputRunes]) + "…"
}

// iterStack – các vòng lặp đang mở, trong cùng ở cuối.
type iterStack []model.IterRef

// track ghi res.Iter: node lặp đi vào thân vòng → mở lượt mới (bỏ các vòng con còn treo); đi ra cổng hết → đóng vòng,
// ghi lượt của vòng ngoài. Node khác ghi lượt của vòng trong cùng.
func (st *iterStack) track(s model.Step, res *model.StepResult) {
	loopType := s.Type == model.StepCounter || s.Type == model.StepForEach
	if loopType && res.Status == model.StatusSuccess {
		st.close(s.ID)
		if idx, ok := iterIndex(s.Type, res); ok {
			*st = append(*st, model.IterRef{NodeID: s.ID, Index: idx})
		}
	}
	if n := len(*st); n > 0 {
		top := (*st)[n-1]
		res.Iter = &top
	}
}

func (st *iterStack) close(id string) {
	for i, r := range *st {
		if r.NodeID == id {
			*st = (*st)[:i]
			return
		}
	}
}

func iterIndex(typ string, res *model.StepResult) (int, bool) {
	key, port := "count", model.PortNext
	if typ == model.StepForEach {
		key, port = "index", model.PortItem
	}
	if res.Port != port {
		return 0, false
	}
	n, ok := res.Output[key].(int)
	return n, ok
}
