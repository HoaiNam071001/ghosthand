package element

import (
	"slices"
	"testing"

	"ghosthand/internal/model"
)

func TestDocumentCandidates(t *testing.T) {
	nodes := []Node{
		{Role: "window"},
		{Role: "searchbox", Value: "tìm", Box: model.Rect{W: 100, H: 20}},
		{Role: "textbox", Value: "thân bài\ndòng hai", Box: model.Rect{W: 800, H: 600}, Selected: "dòng hai"},
		{Role: "textbox", Value: "", Box: model.Rect{W: 900, H: 900}},
		{Role: "document", Box: model.Rect{W: 1000, H: 1000}},
	}
	if got := DocumentCandidates(nodes, false); !slices.Equal(got, []int{2, 1, 4, 3}) {
		t.Errorf("có chữ trước, lớn trước: %v", got)
	}
	if got := DocumentCandidates(nodes, true); !slices.Equal(got, []int{2, 1, 3, 4}) {
		t.Errorf("phần chọn trước, thứ tự đọc: %v", got)
	}
	if got := DocumentCandidates(nil, false); len(got) != 0 {
		t.Errorf("rỗng: %v", got)
	}
}
