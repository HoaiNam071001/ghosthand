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
