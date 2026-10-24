package element

import "fmt"

// Change – một thay đổi giữa hai lần đọc cây (bước 43 A3).
type Change struct {
	Role   string `json:"role"`
	Name   string `json:"name,omitempty"`
	Before string `json:"before,omitempty"` // giá trị cũ (chỉ khi đổi)
	After  string `json:"after,omitempty"`
}

// Changes – phần đổi: phần tử mới hiện, mất đi, đổi giá trị. Mỗi loại cắt ở diffMax.
type Changes struct {
	Added   []Change `json:"added,omitempty"`
	Removed []Change `json:"removed,omitempty"`
	Changed []Change `json:"changed,omitempty"`
	Omitted int      `json:"omitted,omitempty"`
}

const diffMax = 30

// Empty – không có gì đổi.
func (c Changes) Empty() bool {
	return len(c.Added)+len(c.Removed)+len(c.Changed)+c.Omitted == 0
}

// Diff so cây trước / sau theo phần tử có nghĩa (cùng bộ lọc với Outline, không giới hạn số dòng). Khoá = vai trò + tên
// + thứ tự trong nhóm cùng khoá, nên danh sách chèn thêm một dòng không làm cả danh sách “đổi”. Phần tử cùng khoá mà
// giá trị khác (ô nhập, checkbox) là Changed; vị trí dời không tính.
func Diff(before, after []Node) Changes {
	b, a := keyed(before), keyed(after)
	var c Changes
	add := func(list *[]Change, ch Change) {
		if len(*list) >= diffMax {
			c.Omitted++
			return
		}
		*list = append(*list, ch)
	}
	for _, it := range a.order {
		old, ok := b.byKey[it]
		cur := a.byKey[it]
		switch {
		case !ok:
			add(&c.Added, Change{Role: cur.Role, Name: cur.Name, After: cur.Value})
		case old.Value != cur.Value:
			add(&c.Changed, Change{Role: cur.Role, Name: cur.Name, Before: old.Value, After: cur.Value})
		}
	}
	for _, it := range b.order {
		if _, ok := a.byKey[it]; !ok {
			old := b.byKey[it]
			add(&c.Removed, Change{Role: old.Role, Name: old.Name, Before: old.Value})
		}
	}
	return c
}

type keyedItems struct {
	order []string
	byKey map[string]Item
}

func keyed(nodes []Node) keyedItems {
	items, _ := Outline(nodes, OutlineOpts{Max: 1 << 20})
	k := keyedItems{byKey: map[string]Item{}}
	seen := map[string]int{}
	for _, it := range items {
		base := it.Role + "|" + it.Name
		seen[base]++
		key := fmt.Sprintf("%s|%d", base, seen[base])
		k.order = append(k.order, key)
		k.byKey[key] = it
	}
	return k
}
