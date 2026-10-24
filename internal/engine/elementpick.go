package engine

import (
	"errors"

	"ghosthand/internal/element"
	"ghosthand/internal/model"
)

// ElementPick – kết quả "Chọn phần tử trên màn" (37 E3): selector sinh cho phần tử dưới điểm đã bấm (dòng đầu ưu
// tiên, mỗi dòng đã tìm lại đúng phần tử này), chỗ thứ mấy, vai trò / tên / khung để inspector báo đã chọn gì.
type ElementPick struct {
	Selectors  []string   `json:"selectors"`
	Occurrence int        `json:"occurrence"`
	Role       string     `json:"role"`
	Name       string     `json:"name"`
	Box        model.Rect `json:"box"`
	// Suggestions – mọi cách tìm khác (43 A4), xếp bền → kém, kèm số chỗ khớp: inspector cho chọn lại.
	Suggestions []element.Suggestion `json:"suggestions"`
}

// PickElement – phần tử dưới điểm p (toạ độ robotgo) trong cây của app ("" = app có cửa sổ trên cùng, trừ app này)
// và cách tìm lại nó. {{biến}} trong app phải thay sẵn.
func (e *Engine) PickElement(app string, p model.Point) (ElementPick, error) {
	nodes, err := e.elems.Elements(app)
	if err != nil {
		return ElementPick{}, err
	}
	i := element.At(nodes, p)
	if i < 0 {
		return ElementPick{}, errors.New("không có phần tử nào ở chỗ này – cửa sổ app phải đang hiện trên màn, nằm trên cùng")
	}
	pk := element.QueryFor(nodes, i)
	if len(pk.Selectors) == 0 {
		return ElementPick{}, errors.New("phần tử ở chỗ này không có chữ / nhãn để tìm lại – chọn phần tử có chữ gần đó, hoặc dùng Tìm theo chữ / ảnh")
	}
	n := nodes[i]
	return ElementPick{Selectors: pk.Selectors, Occurrence: pk.Occurrence, Role: n.Role, Name: n.Name(), Box: n.Box,
		Suggestions: element.Suggest(nodes, i)}, nil
}
