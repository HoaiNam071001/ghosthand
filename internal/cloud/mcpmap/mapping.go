// Package mcpmap – cấu hình ánh xạ cloud.Provider sang tool của một MCP server do người dùng khai (bước 54 C9); nhẹ để store dùng.
// Provider thật ở package mcpcloud. Ánh xạ Get / Put / Delete sang
// tên tool + tên đối số của server đó. Kết quả tool là dữ liệu: chỉ được giải mã làm nội dung file, không diễn giải thành lệnh.
package mcpmap

import (
	"errors"
	"strings"
)

// Mapping – cách nói chuyện với server. Server nào cũng khác tên tool nên người dùng khai (hoặc chọn mẫu có sẵn).
// Nội dung file luôn gửi / nhận dạng base64 trong một đối số chữ: tool MCP chỉ có chữ, còn ảnh mẫu / bản mã là nhị phân.
type Mapping struct {
	Server     string `json:"server"`               // id server trong Cài đặt → MCP server
	Root       string `json:"root"`                 // thư mục gốc trên server, vd /Users/ban/Drive/Ghosthand
	ReadTool   string `json:"readTool"`             // đọc file → trả chữ (base64)
	WriteTool  string `json:"writeTool"`            // ghi file (tạo hoặc đè)
	DeleteTool string `json:"deleteTool,omitempty"` // xoá file; trống = server không xoá được: file mồ côi còn nằm lại nhưng không được dùng
	MkdirTool  string `json:"mkdirTool,omitempty"`  // tạo thư mục (server không tự tạo thư mục cha)
	PathArg    string `json:"pathArg"`              // tên đối số đường dẫn, dùng cho cả 4 tool
	ContentArg string `json:"contentArg"`           // tên đối số nội dung của WriteTool
}

// Check kiểm tra cấu hình người dùng nhập.
func (m Mapping) Check() error {
	switch {
	case m.Server == "":
		return errors.New("chưa chọn MCP server để đồng bộ")
	case strings.TrimSpace(m.Root) == "":
		return errors.New("chưa khai thư mục gốc trên server")
	case m.ReadTool == "" || m.WriteTool == "":
		return errors.New("cần khai tên tool đọc và tool ghi file")
	case m.PathArg == "" || m.ContentArg == "":
		return errors.New("cần khai tên đối số đường dẫn và đối số nội dung")
	}
	return nil
}

// Tools – các tool sẽ gọi (để kiểm tra server có đủ và để hỏi quyền).
func (m Mapping) Tools() []string {
	var out []string
	for _, t := range []string{m.ReadTool, m.WriteTool, m.DeleteTool, m.MkdirTool} {
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

// Preset – bộ ánh xạ dựng sẵn cho một loại server (Server, Root để người dùng điền).
type Preset struct {
	ID, Name, Desc string
	Mapping        Mapping
}

// Presets – chỉ gồm server có tên tool đã kiểm chứng. Server Drive/Dropbox/OneDrive riêng thường định danh file bằng id
// thay vì đường dẫn nên không khớp mô hình này: dùng thư mục đã đồng bộ sẵn của chúng qua Filesystem.
func Presets() []Preset {
	return []Preset{{
		ID: "filesystem", Name: "Filesystem (thư mục trên máy / ổ đồng bộ)",
		Desc: "Server Filesystem chính thức. Trỏ Thư mục gốc vào thư mục Google Drive / OneDrive / Dropbox đã cài trên máy để tận dụng đồng bộ của chúng. " +
			"Server này không có tool xoá: file đã xoá còn nằm lại trong thư mục nhưng Ghosthand không dùng.",
		Mapping: Mapping{ReadTool: "read_text_file", WriteTool: "write_file", MkdirTool: "create_directory", PathArg: "path", ContentArg: "content"},
	}}
}
