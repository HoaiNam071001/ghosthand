package script

import (
	"fmt"
	"math"
	"reflect"
	"slices"

	"ghosthand/internal/model"
)

// Nhúng kịch bản khác vào kịch bản đang soạn (bước 39 G2): chép node + cạnh của child thành một khung nhóm G1.
// Làm một lần lúc nhúng – bản nhúng không đi theo file gốc nữa (Group.From chỉ để biết nguồn).

// embedGapY – khoảng cách dọc giữa node thấp nhất của kịch bản cha và cụm nhúng (toạ độ canvas).
const embedGapY = 240

// EmbedResult – kịch bản cha sau khi nhúng + những gì đã tự đổi, để UI báo người dùng.
type EmbedResult struct {
	Script       model.Script      `json:"script"`
	GroupID      string            `json:"groupId"`
	Nodes        int               `json:"nodes"`
	RenamedInput map[string]string `json:"renamedInput,omitempty"` // key input của child đổi vì trùng key khác định nghĩa ở cha
	DroppedEnds  int               `json:"droppedEnds"`            // node Kết thúc (thành công) bỏ đi để nối tiếp ra ngoài
}

// Embed trả bản sao parent có thêm node / cạnh / input của child. screen = màn hình chính, dùng khi kịch bản không có vùng.
//   - id node, cạnh, nhóm: đổi nếu trùng; ref (n2) trùng thì đặt ref mới và viết lại {{n2…}} trong ô chữ.
//   - toạ độ điểm quy từ vùng của child sang vùng của parent (giữ đúng chỗ trên màn hình, giữ kiểu neo của từng trục).
//   - node Kết thúc thành công bị bỏ: cổng nối vào nó thành cổng trống để người dùng nối tiếp ra ngoài; Kết thúc thất bại giữ.
//   - input: trùng key + cùng định nghĩa thì gộp (ghim thêm vào input có sẵn); trùng key khác định nghĩa thì đổi key child
//     (key_2…) và viết lại {{key}}.
//   - start của parent giữ nguyên; parent chưa có node thì start = start của child. Nhóm của child bỏ (một node một nhóm).
func Embed(parent, child model.Script, screen model.Rect, from string) (EmbedResult, error) {
	if len(child.Steps) == 0 {
		return EmbedResult{}, &model.ScriptError{Field: "steps", Msg: "kịch bản muốn nhúng không có node nào"}
	}
	res := EmbedResult{}
	out := parent
	out.Steps = slices.Clone(parent.Steps)
	out.Edges = slices.Clone(parent.Edges)
	out.Inputs = slices.Clone(parent.Inputs)
	out.Groups = slices.Clone(parent.Groups)

	usedID, usedRef := map[string]bool{}, map[string]bool{}
	for _, s := range parent.Steps {
		usedID[s.ID], usedRef[s.Ref] = true, true
	}
	ids, refs := map[string]string{}, map[string]string{}
	n, r := 0, 0
	for _, s := range child.Steps {
		id := s.ID
		if usedID[id] || id == "" {
			id = freeID(n+1, "s", func(x string) bool { return usedID[x] })
			n++
		}
		usedID[id], ids[s.ID] = true, id
		ref := s.Ref
		if usedRef[ref] || ref == "" {
			ref = freeID(r+1, "n", func(x string) bool { return usedRef[x] })
			r++
		}
		usedRef[ref], refs[s.Ref] = true, ref
	}

	renamed := mergeInputs(&out, child, ids, parent)
	res.RenamedInput = renamed

	from2, to2 := Bounds(child, screen), Bounds(parent, screen)
	dx, dy := embedOffset(parent, child)
	dropped := endsToDrop(child)
	var members []string
	for _, s := range child.Steps {
		if dropped[s.ID] {
			res.DroppedEnds++
			continue
		}
		st := CloneStep(s)
		st.ID, st.Ref = ids[s.ID], refs[s.Ref]
		if st.ImageFrom != "" {
			st.ImageFrom = ids[st.ImageFrom]
		}
		if st.TabFrom != "" {
			st.TabFrom = ids[st.TabFrom]
		}
		if st.Pos != nil {
			st.Pos = &model.Pos{X: st.Pos.X + dx, Y: st.Pos.Y + dy}
		}
		if from2 != to2 && st.CoordSpace != CoordAbsolute {
			for i := range st.Points {
				st.Points[i] = reanchorPoint(st.Points[i], from2, to2)
			}
		}
		for _, f := range VarFields(&st) {
			*f.Ptr = rewriteVars(*f.Ptr, refs, renamed)
		}
		out.Steps = append(out.Steps, st)
		members = append(members, st.ID)
	}

	usedEdge := map[string]bool{}
	for _, e := range parent.Edges {
		usedEdge[e.ID] = true
	}
	k := 0
	for _, e := range child.Edges {
		if dropped[e.To] || dropped[e.From] {
			continue
		}
		k++
		id := freeID(k, "e", func(x string) bool { return usedEdge[x] })
		usedEdge[id] = true
		out.Edges = append(out.Edges, model.Edge{ID: id, From: ids[e.From], Port: e.Port, To: ids[e.To]})
	}
	if parent.Start == "" || len(parent.Steps) == 0 {
		out.Start = ids[child.Start]
	}

	gid := freeID(len(out.Groups)+1, "g", func(x string) bool {
		return slices.ContainsFunc(out.Groups, func(g model.Group) bool { return g.ID == x })
	})
	name := child.Name
	if name == "" {
		name = "Kịch bản nhúng"
	}
	out.Groups = append(out.Groups, model.Group{ID: gid, Name: name, Members: members, From: from})
	res.Script, res.GroupID, res.Nodes = out, gid, len(members)
	return res, nil
}

// endsToDrop – node Kết thúc thành công của child (trừ node bắt đầu, và node mà ô chữ nào đó còn đọc kết quả).
func endsToDrop(child model.Script) map[string]bool {
	read := map[string]bool{}
	for _, s := range child.Steps {
		s := CloneStep(s)
		for _, f := range VarFields(&s) {
			for _, m := range NodeVarRe.FindAllStringSubmatch(*f.Ptr, -1) {
				read[m[1]] = true
			}
		}
	}
	out := map[string]bool{}
	for _, s := range child.Steps {
		if s.Type == model.StepEnd && s.EndStatus != model.EndFail && s.ID != child.Start && !read[s.Ref] {
			out[s.ID] = true
		}
	}
	return out
}

// embedOffset – dời cụm nhúng xuống dưới node thấp nhất của cha, thẳng cột với node trái nhất của cha.
// Child chưa có toạ độ (không node nào có pos) thì không dời – canvas tự xếp.
func embedOffset(parent, child model.Script) (dx, dy int) {
	cMinX, cMinY, ok := minPos(child.Steps)
	if !ok {
		return 0, 0
	}
	pMinX, _, pok := minPos(parent.Steps)
	pMaxY := 0
	for _, s := range parent.Steps {
		if s.Pos != nil {
			pMaxY = max(pMaxY, s.Pos.Y)
		}
	}
	if !pok {
		return -cMinX, -cMinY
	}
	return pMinX - cMinX, pMaxY + embedGapY - cMinY
}

func minPos(steps []model.Step) (x, y int, ok bool) {
	for _, s := range steps {
		if s.Pos == nil {
			continue
		}
		if !ok {
			x, y, ok = s.Pos.X, s.Pos.Y, true
		}
		x, y = min(x, s.Pos.X), min(y, s.Pos.Y)
	}
	return
}

// reanchorPoint giữ nguyên chỗ trên màn hình của điểm khi đổi khung từ from sang to, mỗi trục giữ kiểu neo của nó.
func reanchorPoint(p model.Point, from, to model.Rect) model.Point {
	if p.UsesVar() {
		return p
	}
	return model.Point{
		X: reanchorAxis(p.X, p.Ax, from.X, from.W, to.X, to.W), Y: reanchorAxis(p.Y, p.Ay, from.Y, from.H, to.Y, to.H),
		Ax: p.Ax, Ay: p.Ay,
	}
}

func reanchorAxis(v int, a string, fo, fs, to, ts int) int {
	abs := resolveAxis(v, a, fo, fs)
	switch a {
	case AnchorEnd:
		return to + ts - abs
	case AnchorCenter:
		return abs - (to + ts/2)
	case AnchorRatio:
		if ts <= 0 {
			return v
		}
		return int(math.Round(float64(abs-to) * RatioScale / float64(ts)))
	default:
		return abs - to
	}
}

// rewriteVars: {{n2.…}} theo ref mới, {{key}} theo key input mới.
func rewriteVars(text string, refs, keys map[string]string) string {
	text = NodeVarRe.ReplaceAllStringFunc(text, func(m string) string {
		sub := NodeVarRe.FindStringSubmatch(m)
		if nr, ok := refs[sub[1]]; ok && nr != sub[1] {
			return "{{" + nr + "." + sub[2] + "}}"
		}
		return m
	})
	if len(keys) == 0 {
		return text
	}
	return varRe.ReplaceAllStringFunc(text, func(m string) string {
		sub := varRe.FindStringSubmatch(m)
		if nk, ok := keys[sub[1]]; ok { // sub[1] trống với "\{{" (dấu thoát) – không có trong keys
			return "{{" + nk + "}}"
		}
		return m
	})
}

// mergeInputs gộp input của child vào out.Inputs (đích ghim đổi sang id mới). Trả bảng key child đổi tên.
func mergeInputs(out *model.Script, child model.Script, ids map[string]string, parent model.Script) map[string]string {
	renamed := map[string]string{}
	taken := map[string]bool{}
	for _, in := range parent.Inputs {
		taken[in.Key] = true
	}
	for _, in := range child.Inputs {
		in.Targets = slices.Clone(in.Targets)
		for i := range in.Targets {
			in.Targets[i].StepID = ids[in.Targets[i].StepID]
		}
		at := slices.IndexFunc(parent.Inputs, func(p model.ScriptInput) bool { return p.Key == in.Key })
		if at >= 0 {
			if sameInput(parent.Inputs[at], in) {
				out.Inputs[at].Targets = append(slices.Clone(out.Inputs[at].Targets), in.Targets...)
				continue
			}
			key := in.Key
			for i := 2; taken[key]; i++ {
				key = fmt.Sprintf("%s_%d", in.Key, i)
			}
			renamed[in.Key], in.Key = key, key
		}
		taken[in.Key] = true
		out.Inputs = append(out.Inputs, in)
	}
	if len(renamed) == 0 {
		return nil
	}
	return renamed
}

// sameInput: cùng định nghĩa, chỉ khác chỗ ghim.
func sameInput(a, b model.ScriptInput) bool {
	a.Targets, b.Targets = nil, nil
	return reflect.DeepEqual(a, b)
}
