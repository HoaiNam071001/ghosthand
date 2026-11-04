package model

// Cổng ra của node điều khiển + node Ứng dụng kiểm tra (ngoài success / fail ở flow.go).
const (
	PortTrue    = "true"
	PortFalse   = "false"
	PortDefault = "default" // switch: không case nào khớp
	PortNone    = "none"    // switchScreen: hết giờ không case nào hiện
	PortNext    = "next"    // counter: còn lượt
	PortDone    = "done"    // counter: hết lượt; forEach: hết danh sách
	PortItem    = "item"    // forEach: còn phần tử
	PortYes     = "yes"     // app kiểm tra: đang chạy
	PortNo      = "no"      // app kiểm tra: không chạy
	PortApprove = "approve" // askUser: người dùng bấm Đồng ý
	PortDeny    = "deny"    // askUser: người dùng bấm Từ chối
	PortTimeout = "timeout" // askUser: hết giờ chưa ai trả lời / lượt chạy không có người (hẹn giờ, CLI, API)
	CasePrefix  = "case:"
)

// Step.EndStatus / Step.VarOp
const (
	EndSuccess = "success"
	EndFail    = "fail"
	VarSet     = "set"
	VarAdd     = "add"
)

// casePorts – cổng case:<key> theo thứ tự case, rồi cổng cuối (default / none).
func casePorts(cases []Case, last string) []string {
	out := make([]string, 0, len(cases)+1)
	for _, c := range cases {
		out = append(out, CasePrefix+c.Key)
	}
	return append(out, last)
}
