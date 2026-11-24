package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestCheckFindByAI(t *testing.T) {
	wait := model.Step{Type: model.StepWaitImage, FindBy: model.FindByAI, FindText: "nút Gửi", TimeoutMs: 5000, IntervalMs: 3000}
	if err := checkImageStep(0, wait); err != nil {
		t.Fatalf("hợp lệ mà lỗi: %v", err)
	}
	empty := wait
	empty.FindText = " "
	all := wait
	all.Type = model.StepFindAll
	for name, s := range map[string]model.Step{"thiếu mô tả": empty, "findAll chưa hỗ trợ": all} {
		if checkImageStep(0, s) == nil {
			t.Errorf("%s: phải lỗi", name)
		}
	}
	if checkStep(&model.Step{Type: model.StepElementRead, FindBy: model.FindByAI}) == nil {
		t.Error("Đọc phần tử không được tìm bằng AI")
	}
}

func TestCheckSearchAreaGame(t *testing.T) {
	ok := model.Step{Type: model.StepWaitImage, FindBy: model.FindByText, FindText: "Bắt đầu", SearchArea: model.SearchGame, TimeoutMs: 5000, IntervalMs: 250}
	if err := checkImageStep(0, ok); err != nil {
		t.Fatalf("chờ chữ trong khung game phải hợp lệ: %v", err)
	}
	elem := ok
	elem.FindBy = model.FindByElement
	if checkImageStep(0, elem) == nil {
		t.Error("tìm phần tử không dùng được khung game")
	}
	if checkStep(&model.Step{Type: model.StepElementRead, SearchArea: model.SearchGame}) == nil {
		t.Error("Đọc phần tử không dùng được khung game (sẽ lặng lẽ tìm sai vùng)")
	}
}
