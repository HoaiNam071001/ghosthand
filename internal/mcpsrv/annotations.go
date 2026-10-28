package mcpsrv

import "github.com/modelcontextprotocol/go-sdk/mcp"

// Annotations MCP (bước 53 A1): client (Claude Desktop, ChatGPT…) dựa vào đây để quyết định hỏi quyền. Mô tả tác dụng
// phụ thật của tool, không phải ý định dùng – nhóm `run` thao tác chuột / phím / lệnh trên máy thật nên là destructive
// + open-world dù mục đích là "thử".

func ptr(b bool) *bool { return &b }

// hintOverrides – tool có tác dụng phụ khác mặc định của nhóm.
var hintOverrides = map[string]mcp.ToolAnnotations{
	// chỉ chờ / đọc kết quả của lần chạy đã có
	"wait_run": {ReadOnlyHint: true},
	// dừng chạy: không phá gì thêm, gọi lại không đổi gì
	"stop_run": {DestructiveHint: ptr(false), IdempotentHint: true, OpenWorldHint: ptr(false)},
	// mở URL trong Chrome của app (có thể tải trang ngoài) nhưng không click / gõ
	"probe_page": {DestructiveHint: ptr(false), OpenWorldHint: ptr(true)},
	// ghi đè nội dung kịch bản có sẵn (có kiểm tra revision)
	"update_script": {DestructiveHint: ptr(true), OpenWorldHint: ptr(false)},
}

// annotationsFor – annotations mặc định theo nhóm, ghi đè theo tên tool.
func annotationsFor(kind, name string) *mcp.ToolAnnotations {
	if a, ok := hintOverrides[name]; ok {
		return &a
	}
	switch kind {
	case KindRead, KindScreen:
		return &mcp.ToolAnnotations{ReadOnlyHint: true}
	case KindRun:
		return &mcp.ToolAnnotations{DestructiveHint: ptr(true), OpenWorldHint: ptr(true)}
	case KindApp, KindSettings:
		return &mcp.ToolAnnotations{DestructiveHint: ptr(false), IdempotentHint: true, OpenWorldHint: ptr(false)}
	default: // KindWrite: tạo / sửa file kịch bản của app
		return &mcp.ToolAnnotations{DestructiveHint: ptr(false), OpenWorldHint: ptr(false)}
	}
}
