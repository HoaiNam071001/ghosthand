package engine

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// Node Đọc tài liệu (bước 43 E3): toàn bộ chữ của ô soạn thảo / tài liệu đang mở (TextEdit, Notepad, ô nhiều dòng)
// qua giá trị accessibility – giữ nguyên xuống dòng, không rút gọn như Đọc chữ trang. selectionOnly = chỉ phần bôi đen.

func (e *Engine) readDocument(ctx context.Context, s model.Step) (map[string]any, error) {
	q, scoped, err := pageScope(s)
	if err != nil {
		return nil, err
	}
	var text string
	why := ""
	var miss func() map[string]any
	_, err = e.waitLoop(ctx, s, "element", func() (bool, int, error) {
		nodes, err := e.elems.Elements(s.ElementApp)
		if waitable(err) {
			why = err.Error()
			return false, 0, nil
		}
		if err != nil {
			return false, 0, err
		}
		var cands []int
		if scoped {
			r := element.Find(nodes, q)
			if !r.Found {
				why, miss = missWhy(r, nodes, max(s.Occurrence, 1)), func() map[string]any { return elementMiss(s.Selectors, nodes, r, q) }
				return false, 0, nil
			}
			cands = []int{r.Hit.Index}
		} else if cands = element.DocumentCandidates(nodes, s.SelectionOnly); len(cands) == 0 {
			why = "không thấy ô soạn thảo nào trong cửa sổ (chỉ selectors để chỉ đúng ô)"
			return false, 0, nil
		}
		if text, err = e.docText(s.ElementApp, nodes, cands, s.SelectionOnly); err != nil && !waitable(err) {
			return false, 0, err
		}
		if text == "" {
			why = map[bool]string{false: "ô tìm được nhưng chưa có chữ", true: "chưa có đoạn chữ nào đang được chọn"}[s.SelectionOnly]
			return false, 0, nil
		}
		return true, 100, nil
	})
	if errors.Is(err, errTimeout) {
		return nil, &notFoundErr{msg: fmt.Sprintf("không đọc được tài liệu sau %s – %s", fmtSeconds(s.TimeoutMs), why), detail: lazyDetail(miss)}
	}
	if err != nil {
		return nil, err
	}
	text = strings.ReplaceAll(strings.ReplaceAll(text, "\r\n", "\n"), "\r", "\n")
	return map[string]any{"text": text, "length": utf8.RuneCountInString(text), "lines": strings.Count(text, "\n") + 1}, nil
}

// docText – chữ của ứng viên đầu tiên có chữ. Ô có sẵn chữ trong cây đứng đầu cands (DocumentCandidates); không ô nào
// có thì hỏi hệ điều hành một lần cho cả danh sách (Windows TextPattern).
func (e *Engine) docText(app string, nodes []element.Node, cands []int, selection bool) (string, error) {
	if t := nodes[cands[0]].DocText(selection); t != "" {
		return t, nil
	}
	texts, err := e.elems.DocTexts(app, cands, selection)
	for _, t := range texts {
		if t != "" {
			return t, nil
		}
	}
	return "", err
}
