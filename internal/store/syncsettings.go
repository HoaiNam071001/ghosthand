package store

import (
	"encoding/json"
	"fmt"
)

// Cài đặt mang đi được giữa các máy (đồng bộ cloud, bước 54 C6). Danh sách trắng: chỉ trường nằm trong
// PortableSettings mới rời máy. Thêm trường cài đặt mới → TestSyncPolicyCoversEveryField bắt buộc ghi nó vào
// syncPolicy là "mang đi" hay "riêng máy" – quên là test đỏ, không rò rỉ lặng lẽ.
//
// Riêng máy: file gần đây, thư mục lưu, cổng + token API (bí mật), máy chủ MCP ngoài (lệnh chạy trên máy), và mọi thứ
// quyết định AI được làm gì trên máy này (bật MCP, mức chạy, tool bị tắt) – cloud bị chiếm không được nới quyền AI.
type PortableSettings struct {
	Theme   string          `json:"theme"`
	Overlay OverlaySettings `json:"overlay"`
	AI      PortableAI      `json:"ai"`
	MCP     PortableMCP     `json:"mcp"`
}

// PortableAI – nhà cung cấp AI mang đi. KHÔNG mang BaseURL: địa chỉ do cloud đặt có thể đưa khoá AI (qua {{secret.*}})
// tới máy chủ lạ; Key chỉ là tham chiếu tên bí mật, không phải giá trị.
type PortableAI struct {
	Kind  string `json:"kind,omitempty"`
	Model string `json:"model,omitempty"`
	Key   string `json:"key,omitempty"`
}

// PortableMCP – phần cài đặt MCP không ảnh hưởng quyền của AI.
type PortableMCP struct {
	HideCaptureDot bool   `json:"hideCaptureDot,omitempty"`
	NodePref       string `json:"nodePref,omitempty"`
	TouchResumeS   int    `json:"touchResumeS,omitempty"`
	TrialDays      int    `json:"trialDays,omitempty"`
	NoImages       bool   `json:"noImages,omitempty"`
}

// syncPolicy – mọi trường (Kiểu.Trường) của các struct cài đặt: true = mang đi, false = riêng máy.
// Trường cha có con mang đi một phần (MCP) ghi true ở cha và liệt kê từng con.
var syncPolicy = map[string]bool{
	"Settings.Theme": true, "Settings.Recent": false, "Settings.API": false, "Settings.MCP": true,
	"Settings.Storage": false, "Settings.Overlay": true, "Settings.AI": true, "Settings.MCPServers": false,

	"OverlaySettings.Toolbar": true, "OverlaySettings.Border": true,
	"AISettings.Kind": true, "AISettings.BaseURL": false, "AISettings.Model": true, "AISettings.Key": true,

	"MCPSettings.Enabled": false, "MCPSettings.Run": false, "MCPSettings.MaxMinutes": false,
	"MCPSettings.OffTools": false, "MCPSettings.Clients": false,
	"MCPSettings.HideCaptureDot": true, "MCPSettings.NodePref": true, "MCPSettings.TouchResumeS": true,
	"MCPSettings.TrialDays": true, "MCPSettings.NoImages": true,
}

// Portable – phần mang đi được của cài đặt.
func (s Settings) Portable() PortableSettings {
	return PortableSettings{
		Theme: s.Theme, Overlay: s.Overlay, AI: PortableAI{s.AI.Kind, s.AI.Model, s.AI.Key},
		MCP: PortableMCP{s.MCP.HideCaptureDot, s.MCP.NodePref, s.MCP.TouchResumeS, s.MCP.TrialDays, s.MCP.NoImages},
	}
}

// EncodePortable – bản cài đặt mang đi dạng JSON ổn định (cùng nội dung → cùng byte → cùng hash).
func (s Settings) EncodePortable() ([]byte, error) {
	return json.MarshalIndent(s.Portable(), "", "  ")
}

// ApplyPortable ghi đè phần mang đi của s bằng dữ liệu từ cloud; phần riêng máy giữ nguyên. Dữ liệu cloud là nguồn
// không tin cậy: theme lạ bị từ chối, AI.Key phải là tham chiếu bí mật (Check) – không nhận khoá thật từ cloud.
func (s Settings) ApplyPortable(data []byte) (Settings, error) {
	var p PortableSettings
	if err := json.Unmarshal(data, &p); err != nil {
		return s, fmt.Errorf("cài đặt trên cloud hỏng: %w", err)
	}
	if !validTheme(p.Theme) {
		return s, fmt.Errorf("cài đặt trên cloud có giao diện lạ: %q", p.Theme)
	}
	newAI := AISettings{Kind: p.AI.Kind, BaseURL: s.AI.BaseURL, Model: p.AI.Model, Key: p.AI.Key}
	if err := newAI.Check(); err != nil {
		return s, fmt.Errorf("cài đặt AI trên cloud không hợp lệ: %w", err)
	}
	s.Theme, s.Overlay, s.AI = p.Theme, p.Overlay, newAI
	s.MCP.HideCaptureDot, s.MCP.NodePref, s.MCP.TouchResumeS = p.MCP.HideCaptureDot, p.MCP.NodePref, p.MCP.TouchResumeS
	s.MCP.TrialDays, s.MCP.NoImages = p.MCP.TrialDays, p.MCP.NoImages
	return s, nil
}
