package script

import (
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"ghosthand/internal/model"
)

// NodeVarRe – biến đọc kết quả node: {{n2.output.x}}, {{n2.status}}, {{n2.error.message}}, {{vars.ten}}, {{last.output.text}}.
// Khác {{key}} của input (không có dấu chấm, inputs.go varRe).
var NodeVarRe = regexp.MustCompile(`\{\{\s*([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9_.]+)\s*\}\}`)

// ValidateFlow kiểm tra cấu trúc flow trước khi chạy: node bắt đầu, cạnh, mã node, nguồn chỗ thấy của click theo ảnh,
// biến trỏ node. Dữ liệu từng node (điểm, ảnh mẫu, phím…) do validateScript kiểm tra.
// Node không đi tới được từ start không phải lỗi (unreachableNodes – UI cảnh báo).
func validateFlow(sc model.Script) error {
	if len(sc.Steps) == 0 {
		return &model.ScriptError{Msg: "kịch bản chưa có node nào"}
	}
	idx := make(map[string]int, len(sc.Steps))
	refs := make(map[string]int, len(sc.Steps))
	for i, s := range sc.Steps {
		idx[s.ID] = i
		if !model.ValidRef(s.Ref) {
			return stepErr(i, s, "ref", "mã node %q không hợp lệ – chữ cái đầu, sau đó chữ / số / _ (không dùng vars, last)", s.Ref)
		}
		if _, dup := refs[s.Ref]; dup {
			return stepErr(i, s, "ref", "mã node %q trùng với node khác", s.Ref)
		}
		refs[s.Ref] = i
	}
	if _, ok := idx[sc.Start]; !ok {
		return &model.ScriptError{Field: "start", Msg: "chưa chọn node bắt đầu"}
	}

	if err := validateGroups(sc.Groups, idx); err != nil {
		return err
	}

	ports := map[[2]string]bool{}
	for _, e := range sc.Edges {
		i, ok := idx[e.From]
		if !ok {
			return &model.ScriptError{Field: "edges", Edge: e.ID, Msg: fmt.Sprintf("cạnh %s đi ra từ node không còn trong kịch bản", e.ID)}
		}
		s := sc.Steps[i]
		_, toOK := idx[e.To]
		var err *model.ScriptError
		switch {
		case !model.HasPort(s, e.Port):
			err = stepErr(i, s, "edges", "node không có cổng %q", e.Port)
		case !toOK:
			err = stepErr(i, s, "edges", "cổng %s nối tới node không còn trong kịch bản", e.Port)
		case e.From == e.To:
			err = stepErr(i, s, "edges", "cổng %s nối vào chính node này – vòng lặp phải đi qua node khác (vd Đếm)", e.Port)
		case ports[[2]string{e.From, e.Port}]:
			err = stepErr(i, s, "edges", "cổng %s có hơn một cạnh", e.Port)
		}
		if err != nil {
			err.Edge = e.ID
			return err
		}
		ports[[2]string{e.From, e.Port}] = true
	}

	for i, s := range sc.Steps {
		if !s.Enabled {
			continue
		}
		if s.Type == model.StepClickImage && s.ImageSource != model.ImageFromSearch {
			j, ok := idx[s.ImageFrom]
			switch {
			case s.ImageFrom == "":
				return stepErr(i, s, "imageFrom", "chưa chọn node lấy chỗ thấy (Chờ ảnh / Chờ chữ)")
			case !ok:
				return stepErr(i, s, "imageFrom", "node lấy chỗ thấy không còn trong kịch bản – chọn lại")
			case !findsImage(sc.Steps[j]):
				return stepErr(i, s, "imageFrom", "node %s không tìm ảnh / chữ nên không có chỗ thấy", sc.Steps[j].Ref)
			}
		}
		if model.HasShotArea(s.Type) && s.ShotArea == model.ShotNode {
			j, ok := idx[s.ImageFrom]
			switch {
			case s.ImageFrom == "":
				return stepErr(i, s, "imageFrom", "chưa chọn node lấy khung chụp (Chờ ảnh / chữ, phần tử web…)")
			case !ok:
				return stepErr(i, s, "imageFrom", "node lấy khung chụp không còn trong kịch bản – chọn lại")
			case !HasFoundBox(sc.Steps[j]):
				return stepErr(i, s, "imageFrom", "node %s không có chỗ thấy (khung x, y, w, h trên màn hình)", sc.Steps[j].Ref)
			}
		}
		if err := validateTabFrom(sc, idx, i, s); err != nil {
			return err
		}
		if err := checkNumVarPins(sc, i, s); err != nil {
			return err
		}
		for _, f := range VarFields(&s) {
			if err := checkVarField(f, refs, sc.Steps); err != nil {
				return stepErr(i, s, f.Name, "%v", err)
			}
		}
	}
	return nil
}

// findsImage: node có "chỗ thấy" để click theo – chờ ảnh / chữ, click theo ảnh tự tìm, Nếu / Switch theo màn hình
// (chỗ thấy của điều kiện đúng đầu tiên).
func findsImage(s model.Step) bool {
	return s.Type == model.StepWaitImage || s.Type == model.StepClickImage && s.ImageSource == model.ImageFromSearch || s.Type == model.StepIf || s.Type == model.StepSwitchScreen
}

// HasFoundBox: output node có khung chỗ thấy trên màn hình (x, y = tâm, w, h) – chụp theo node (screenshot ShotNode).
// Node web chạy nền trả toạ độ trong trang nên không dùng được. Cùng công thức hasFoundBox (frontend/src/flow/shot.ts).
func HasFoundBox(s model.Step) bool {
	switch s.Type {
	case model.StepWebWait:
		return !s.WebGone && !s.WebBackground
	case model.StepWebClick:
		return !s.WebBackground
	case model.StepWindow:
		return !slices.Contains([]string{model.WinWaitClose, model.WinMin, model.WinClose}, s.WinOp)
	}
	return findsImage(s)
}

// UnreachableNodes – id các node không đi tới được từ start (sẽ không bao giờ chạy), theo thứ tự trong mảng.
func unreachableNodes(sc model.Script) []string {
	ok := model.ReachableFrom(sc)
	out := []string{}
	for _, s := range sc.Steps {
		if !ok[s.ID] {
			out = append(out, s.ID)
		}
	}
	return out
}

// checkVarField – biến node trong ô f trỏ node có thật (refs: ref → chỉ số trong steps); ô số còn phải ra số.
func checkVarField(f VarField, refs map[string]int, steps []model.Step) error {
	for _, m := range NodeVarRe.FindAllStringSubmatch(*f.Ptr, -1) {
		if name := m[1]; name != "vars" && name != "last" && name != "secret" {
			j, ok := refs[name]
			if !ok {
				return fmt.Errorf("biến %s trỏ tới node %q không có trong kịch bản", m[0], name)
			}
			if f.Num {
				if err := coordVar(m[0], m[2], steps[j]); err != nil {
					return err
				}
			}
		}
	}
	if !f.Num {
		return nil
	}
	isCoord := !strings.HasPrefix(f.Name, "numVars")
	if strings.TrimSpace(*f.Ptr) == "" {
		if !isCoord {
			return errors.New("chưa nhập giá trị (số hoặc biến)")
		}
		axis := "X"
		if strings.HasSuffix(f.Name, "yVar") {
			axis = "Y"
		}
		return fmt.Errorf("chưa nhập toạ độ %s", axis)
	}
	if _, err := EvalCoord(withoutVars(*f.Ptr)); err != nil {
		if !isCoord {
			return fmt.Errorf("“%s” sai dạng – cần số hoặc biến, cộng / trừ được (vd {{n2.output.count}} + 1)", *f.Ptr)
		}
		return fmt.Errorf("toạ độ “%s” sai dạng – cần số hoặc biến, cộng / trừ px (vd {{n2.output.x}} + 20)", *f.Ptr)
	}
	return nil
}

// coordVar – biến m (đường path) trong ô số phải là output của node src (vd x, y, w, h của Chờ ảnh / chữ).
func coordVar(m, path string, src model.Step) error {
	key, ok := strings.CutPrefix(path, "output.")
	outs := model.OutputsOf(src.Type)
	if !ok {
		return fmt.Errorf("biến %s không phải số – ô số dùng output của node, vd {{%s.output.x}}", m, src.Ref)
	}
	// đọc sâu: json.data.count của node HTTP, item.x của Lặp qua danh sách (phần tử từ Tìm tất cả, cột CSV)
	root, _, _ := strings.Cut(key, ".")
	if !slices.Contains(outs, key) && !((root == "json" || root == "item") && slices.Contains(outs, root)) {
		if len(outs) == 0 {
			return fmt.Errorf("biến %s: node %s không có output nào", m, src.Ref)
		}
		return fmt.Errorf("biến %s: node %s không có output %q – có: %s", m, src.Ref, key, strings.Join(outs, ", "))
	}
	return nil
}

// withoutVars thay mọi biến (node, input) bằng 0 – kiểm tra dạng "số + / − px" trước khi chạy.
func withoutVars(t string) string {
	t = NodeVarRe.ReplaceAllString(t, "0")
	return varRe.ReplaceAllStringFunc(t, func(m string) string {
		if m == `\{{` {
			return m
		}
		return "0"
	})
}

// SecretRefs – tên các bí mật {{secret.<tên>}} kịch bản dùng (kho bí mật, bước 43 S10), sắp theo chữ cái, không trùng.
func SecretRefs(sc model.Script) []string {
	seen := map[string]bool{}
	var out []string
	for i := range sc.Steps {
		s := CloneStep(sc.Steps[i])
		for _, f := range VarFields(&s) {
			for _, m := range NodeVarRe.FindAllStringSubmatch(*f.Ptr, -1) {
				if m[1] == "secret" && !seen[m[2]] {
					seen[m[2]] = true
					out = append(out, m[2])
				}
			}
		}
	}
	slices.Sort(out)
	return out
}
