package element

import (
	"testing"

	"ghosthand/internal/model"
)

func TestNearMatches(t *testing.T) {
	q := Query{Selectors: []model.Selector{sel(t, "text=Them vao gio hang"), sel(t, `role=button[name="Dong lai"]`)}}
	got := NearMatches(tree(), q, 3)
	if len(got) != 3 || got[0].Role != "button" || got[0].Name != "Thêm vào giỏ" || got[0].Score < 60 {
		t.Fatalf("ứng viên = %+v", got)
	}
	for _, n := range got {
		if n.Name == "Shop" || n.Name == "Tìm sản phẩm" {
			t.Errorf("không liên quan mà vẫn có: %+v", n)
		}
	}
	if got := NearMatches(tree(), Query{Selectors: []model.Selector{sel(t, "role=checkbox")}}, 5); len(got) != 0 {
		t.Errorf("sai vai trò, không tên → không ứng viên: %+v", got)
	}
}

// 57 C1: role=textbox[name=Message] trên Messenger – ô soạn "Write to" trong trang đứng trước thanh địa chỉ của
// Chrome (cùng vai trò, tên đều không giống) và ô bị kẹp ngoài khung cuộn.
func TestNearMatchesSameRoleInDocument(t *testing.T) {
	nodes := []Node{
		{Role: "window", Title: "Messenger", Box: box(0, 0, 1200, 900)},
		{Role: "textbox", Desc: "Address and search bar", Value: "facebook.com/messages", Box: box(100, 40, 800, 30)},
		{Role: "document", Box: box(0, 80, 1200, 820)},
		{Role: "textbox", Placeholder: "Search Messenger", Box: box(10, 600, 300, 1)},
		{Role: "button", Title: "Message", Box: box(400, 100, 80, 30)},
		{Role: "textbox", Desc: "Write to Nam", Box: box(400, 820, 600, 40)},
	}
	got := NearMatches(nodes, Query{Selectors: []model.Selector{sel(t, `role=textbox[name="Message"]`)}}, 8)
	names := []string{}
	for _, n := range got {
		names = append(names, n.Name)
	}
	if len(got) != 4 || got[0].Name != "Write to Nam" || got[1].Name != "Address and search bar" || !got[2].Hidden ||
		got[3].Role != "button" {
		t.Fatalf("thứ tự = %q (%+v)", names, got)
	}
}
