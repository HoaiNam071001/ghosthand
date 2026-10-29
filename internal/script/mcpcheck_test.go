package script

import (
	"testing"

	"ghosthand/internal/model"
)

func TestValidateMCPTool(t *testing.T) {
	for _, s := range []model.Step{
		{Type: model.StepMCPTool, MCPServer: "fs", MCPTool: "read"},
		{Type: model.StepMCPTool, MCPServer: "fs", MCPTool: "read", MCPArgs: `{"path":"/tmp"}`},
		{Type: model.StepMCPTool, MCPServer: "fs", MCPTool: "read", MCPArgs: `{"n":{{n1.output.value}}}`}, // biến: chỉ biết dạng lúc chạy
	} {
		if err := validateMCPTool(0, s); err != nil {
			t.Errorf("%+v hợp lệ mà lỗi: %v", s, err)
		}
	}
	for name, s := range map[string]model.Step{
		"thiếu server": {Type: model.StepMCPTool, MCPTool: "read"},
		"thiếu tool":   {Type: model.StepMCPTool, MCPServer: "fs"},
		"args mảng":    {Type: model.StepMCPTool, MCPServer: "fs", MCPTool: "read", MCPArgs: `[1]`},
		"args hỏng":    {Type: model.StepMCPTool, MCPServer: "fs", MCPTool: "read", MCPArgs: `{path`},
	} {
		if err := validateMCPTool(0, s); err == nil {
			t.Errorf("%s: phải lỗi", name)
		}
	}
}
