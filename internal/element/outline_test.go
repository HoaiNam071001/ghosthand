package element

import (
	"testing"

	"ghosthand/internal/model"
)

func rc(x, y int) model.Rect { return model.Rect{X: x, Y: y, W: 80, H: 20} }

func sampleTree() []Node {
	return []Node{
		{Role: "window", Title: "Form", Box: model.Rect{W: 500, H: 400}, Depth: 0},
		{Role: "group", Box: rc(0, 0), Depth: 1},
		{Role: "button", Title: "Lưu", Box: rc(10, 10), Depth: 2},
		{Role: RoleText, Value: "Lưu", Box: rc(12, 12), Depth: 3},
		{Role: RoleText, Value: "Họ tên", Box: rc(10, 40), Depth: 2},
		{Role: "textbox", Placeholder: "Họ tên", Value: "An", Box: rc(10, 60), Depth: 2},
		{Role: "button", Title: "Xoá", Box: rc(10, 90), Depth: 2},
		{Role: "button", Title: "Xoá", Box: rc(10, 120), Depth: 2},
		{Role: "button", Title: "Ẩn", Box: model.Rect{X: 0, Y: 5000, W: 80, H: 0}, Depth: 2},
	}
}

func TestOutlineDropsNoise(t *testing.T) {
	items, omitted := Outline(sampleTree(), OutlineOpts{})
	if omitted != 0 {
		t.Fatalf("omitted = %d", omitted)
	}
	var got []string
	for _, it := range items {
		got = append(got, it.Line())
	}
	// nhóm không tên, chữ trùng nhãn nút, phần tử chưa hiện đều bị bỏ; mark liên tục từ 1
	want := []string{
		`#1 window "Form" {0,0,500,400}`, `#2 button "Lưu" {10,10,80,20}`, `#3 text "Họ tên" {10,40,80,20}`,
		`#4 textbox "Họ tên" = "An" {10,60,80,20}`, `#5 button "Xoá" {10,90,80,20}`, `#6 button "Xoá" {10,120,80,20}`,
	}
	if len(got) != len(want) {
		t.Fatalf("got %q", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("%d: %q, want %q", i, got[i], want[i])
		}
	}
}

func TestOutlineLimitAndInteractive(t *testing.T) {
	items, omitted := Outline(sampleTree(), OutlineOpts{Max: 2, InteractiveOnly: true})
	if len(items) != 2 || omitted != 2 || items[0].Name != "Lưu" || items[1].Role != "textbox" {
		t.Fatalf("items = %+v omitted = %d", items, omitted)
	}
}

func TestSuggestRanksUniqueFirst(t *testing.T) {
	nodes := sampleTree()
	s := Suggest(nodes, 2) // nút Lưu: duy nhất
	if len(s) == 0 || !s[0].Unique || s[0].Stability != "good" || s[0].Selector != `text="Lưu"` {
		t.Fatalf("suggest = %+v", s)
	}
	dup := Suggest(nodes, 7) // nút Xoá thứ 2: hai chỗ khớp
	if len(dup) == 0 || dup[0].Unique || dup[0].Occurrence != 2 || dup[0].Stability != "poor" {
		t.Fatalf("dup = %+v", dup)
	}
}

func TestDiff(t *testing.T) {
	before := sampleTree()
	after := sampleTree()
	after[5].Value = "Bình"                                                       // ô nhập đổi giá trị
	after = append(after[:6], after[7:]...)                                       // mất một nút Xoá
	after = append(after, Node{Role: "dialog", Title: "Đã lưu", Box: rc(0, 200)}) // popup mới
	c := Diff(before, after)
	if len(c.Added) != 1 || c.Added[0].Name != "Đã lưu" || len(c.Removed) != 1 || c.Removed[0].Name != "Xoá" ||
		len(c.Changed) != 1 || c.Changed[0].Before != "An" || c.Changed[0].After != "Bình" {
		t.Fatalf("diff = %+v", c)
	}
	if !Diff(before, sampleTree()).Empty() {
		t.Fatal("cây giống nhau phải không có thay đổi")
	}
}
