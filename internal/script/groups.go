package script

import (
	"fmt"
	"slices"

	"ghosthand/internal/model"
)

// validateGroups: nhóm chỉ là khung UI nhưng file viết tay / AI có thể trỏ sai – id nhóm không trùng, thành viên là node có
// thật, một node không ở hai nhóm (khung chồng nhau không kéo cả cụm được).
func validateGroups(groups []model.Group, idx map[string]int) error {
	ids := map[string]bool{}
	in := map[string]string{}
	for _, g := range groups {
		if g.ID == "" || ids[g.ID] {
			return &model.ScriptError{Field: "groups", Msg: fmt.Sprintf("nhóm %q thiếu id hoặc trùng id", g.Name)}
		}
		ids[g.ID] = true
		for _, m := range g.Members {
			if _, ok := idx[m]; !ok {
				return &model.ScriptError{Field: "groups", Msg: fmt.Sprintf("nhóm %q chứa node %q không còn trong kịch bản", g.Name, m)}
			}
			if other, dup := in[m]; dup {
				return &model.ScriptError{Field: "groups", Msg: fmt.Sprintf("node %q nằm trong cả hai nhóm %q và %q", m, other, g.Name)}
			}
			in[m] = g.Name
		}
	}
	return nil
}

// DropMember bỏ node khỏi mọi nhóm (xoá node); nhóm hết thành viên thì xoá luôn. Trả bản mới, không sửa đầu vào.
func DropMember(groups []model.Group, id string) []model.Group {
	var out []model.Group
	for _, g := range groups {
		g.Members = slices.DeleteFunc(slices.Clone(g.Members), func(m string) bool { return m == id })
		if len(g.Members) > 0 {
			out = append(out, g)
		}
	}
	return out
}
