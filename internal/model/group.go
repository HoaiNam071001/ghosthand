package model

// Group – khung nhóm node (bước 39 G1): chỉ để soạn cho gọn, engine / biến / lỗi không biết tới nhóm.
// Node vẫn nằm phẳng trong Script.Steps; một node thuộc nhiều nhất một nhóm.
type Group struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Members   []string `json:"members"`             // id node
	Collapsed bool     `json:"collapsed,omitempty"` // thu thành một thẻ trên canvas
	Color     string   `json:"color,omitempty"`     // tên màu nhóm (UI), trống = mặc định
	From      string   `json:"from,omitempty"`      // nguồn khi nhúng từ kịch bản khác (G2) – chỉ để biết, không tự cập nhật
}
