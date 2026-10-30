package element

import "slices"

// DocumentCandidates – chỉ số các ô soạn thảo / tài liệu (textbox, searchbox, document) trong nodes khi người dùng
// không chỉ selector, theo thứ tự nên đọc. Ô đã có chữ ngay trong cây (Value / Selected) đứng trước, rồi tới ô chưa có –
// Windows chỉ đọc chữ của ô đó qua TextPattern (ElementReader.DocTexts) vì đọc cho mọi ô mỗi lần thì chậm.
// Đọc cả ô: diện tích lớn trước (thân tài liệu lớn hơn ô tìm kiếm / ô địa chỉ). selection: thứ tự đọc.
func DocumentCandidates(nodes []Node, selection bool) []int {
	var has, rest []int
	for i, n := range nodes {
		if n.Role != "textbox" && n.Role != "searchbox" && n.Role != "document" {
			continue
		}
		if n.DocText(selection) != "" {
			has = append(has, i)
		} else {
			rest = append(rest, i)
		}
	}
	if !selection {
		byArea := func(a, b int) int { return nodes[b].Box.W*nodes[b].Box.H - nodes[a].Box.W*nodes[a].Box.H }
		slices.SortStableFunc(has, byArea)
		slices.SortStableFunc(rest, byArea)
	}
	return append(has, rest...)
}

// DocText – chữ của ô đã có trong cây: cả ô (Value) hoặc phần đang chọn (Selected).
func (n Node) DocText(selection bool) string {
	if selection {
		return n.Selected
	}
	return n.Value
}
