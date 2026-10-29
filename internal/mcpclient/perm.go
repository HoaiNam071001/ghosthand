package mcpclient

// Quyết định cho một lần gọi tool (bước 55 M2).
const (
	Allow     = "allow"      // chạy luôn
	AskServer = "ask_server" // server chưa được duyệt với cấu hình này
	AskTool   = "ask_tool"   // tool có thể ghi / xoá / mở ra ngoài
)

// Decide: server chưa duyệt → hỏi server (chưa được nối, vì nối = chạy lệnh). Đã duyệt: tool chỉ đọc chạy luôn; còn lại
// hỏi từng lần trừ khi người dùng đã chọn "luôn cho tool này". Server không khai annotations thì coi là có thể ghi
// (đúng mặc định của đặc tả MCP: không khai = không phải chỉ đọc).
func Decide(serverTrusted, toolAlways bool, t Tool) string {
	switch {
	case !serverTrusted:
		return AskServer
	case t.ReadOnly || toolAlways:
		return Allow
	}
	return AskTool
}

// Risk – mô tả ngắn để hiện trong hộp hỏi.
func (t Tool) Risk() string {
	switch {
	case t.ReadOnly:
		return "chỉ đọc"
	case t.Destructive != nil && !*t.Destructive:
		return "có ghi dữ liệu (không xoá)"
	}
	return "có thể ghi / xoá dữ liệu"
}
