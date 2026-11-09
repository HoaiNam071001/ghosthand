package cloud

import "sort"

// Hành động cho một đường dẫn sau khi so ba bên.
type Action int

const (
	ActNone         Action = iota // giống nhau / chỉ cần ghi nhận
	ActPush                       // máy → cloud
	ActPull                       // cloud → máy
	ActDeleteLocal                // cloud đã xoá, máy chưa đổi
	ActDeleteRemote               // máy đã xoá, cloud chưa đổi
	ActConflict                   // hai bên cùng đổi khác nhau (cả xoá một bên – sửa một bên)
)

// Decide – bảng quyết định cho một file. Hash "" = không có file. local = máy, base = bản cuối đã đồng bộ, remote = cloud.
//
//	local == remote                  → không làm gì
//	local == base (máy không đổi)    → cloud đổi: kéo về (cloud xoá → xoá ở máy)
//	remote == base (cloud không đổi) → máy đổi: đẩy lên (máy xoá → xoá trên cloud)
//	còn lại (hai bên cùng đổi khác nhau, kể cả mới ở cả hai) → xung đột
func Decide(local, base, remote string) Action {
	switch {
	case local == remote:
		return ActNone
	case local == base:
		if remote == "" {
			return ActDeleteLocal
		}
		return ActPull
	case remote == base:
		if local == "" {
			return ActDeleteRemote
		}
		return ActPush
	}
	return ActConflict
}

// Item – một dòng của kế hoạch.
type Item struct {
	Path   string
	Action Action
}

// Plan lập kế hoạch từ ba bảng hash, chỉ xét đường dẫn thuộc scope; thứ tự theo tên để kết quả ổn định.
// Tệp đi kèm (assets/) không bao giờ bị xoá (keepOnDelete) – bản xoá thành ActNone.
func Plan(local, base, remote map[string]string, scope Scope) []Item {
	paths := map[string]bool{}
	for _, m := range []map[string]string{local, base, remote} {
		for p := range m {
			if scope.Includes(p) {
				paths[p] = true
			}
		}
	}
	var items []Item
	for p := range paths {
		a := Decide(local[p], base[p], remote[p])
		if (a == ActDeleteLocal || a == ActDeleteRemote) && keepOnDelete(p) {
			a = ActNone
		}
		items = append(items, Item{p, a})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Path < items[j].Path })
	return items
}
