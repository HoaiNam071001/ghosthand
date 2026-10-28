package model

// Giá trị hợp lệ của các trường liệt kê trong Step / Script (script/check.go kiểm tra lúc mở file).

// Nguồn vị trí của bước click theo ảnh (Step.ImageSource).
const (
	ImageFromNode   = "node"   // chỗ node ImageFrom (chờ ảnh / chữ, click theo ảnh tự tìm) tìm thấy lần chạy gần nhất
	ImageFromSearch = "search" // tự tìm ảnh mẫu riêng của bước
)

// Cách so ảnh mẫu (Step.MatchMode, Cond.MatchMode – bước 40).
const (
	MatchGray = ""     // NCC trên ảnh xám – giống từng điểm ảnh, không đổi theo độ sáng / tương phản chung
	MatchEdge = "edge" // NCC trên ảnh viền (Sobel) – ảnh mẫu khoanh ở theme sáng vẫn tìm được ở theme tối
)

var MatchModes = []string{MatchGray, MatchEdge}

// Vùng chụp của node Chụp màn hình (Step.ShotArea).
const (
	ShotRegion = ""       // vùng của kịch bản (không có vùng: màn chính)
	ShotScreen = "screen" // cả một màn: Display (0 = màn chứa vùng kịch bản / màn chính)
	ShotRect   = "rect"   // vùng cố định ShotRect (toạ độ màn hình)
	ShotNode   = "node"   // khung chỗ thấy của node ImageFrom (output x, y = tâm, w, h)
)

var ShotAreas = []string{ShotRegion, ShotScreen, ShotRect, ShotNode}

// Chờ màn hình (Step.WaitMode, bước 42 G1) – vùng theo ShotArea như Chụp màn hình.
const (
	WaitStable = ""       // hai lần chụp liền nhau lệch ≤ DiffPct liên tục StableMs (trang tải xong, hiệu ứng dừng)
	WaitChange = "change" // khác ảnh lúc bắt đầu node > DiffPct (đã có phản hồi sau click)
)

var WaitModes = []string{WaitStable, WaitChange}

// Nguồn danh sách của node Lặp qua danh sách (Step.ListFrom, bước 42 G2).
const (
	ListText = ""     // Value: mảng JSON (vd {{n3.output.json.items}}) hoặc chữ – mỗi dòng không trống một phần tử
	ListFile = "file" // FilePath .csv / .xlsx (Sheet): dòng đầu là tên cột, mỗi dòng sau một phần tử {cột: giá trị}
)

var ListFroms = []string{ListText, ListFile}

// Mức thao tác giống người (Script.Human, Step.Human – bước 34, internal/humanize). Kịch bản "" = tắt; node "" = theo
// kịch bản. Kịch bản mới (NewScript) bật sẵn mức vừa.
const (
	HumanOff    = "off"
	HumanLow    = "low"
	HumanMedium = "medium"
	HumanHigh   = "high"
)

var HumanLevels = []string{HumanOff, HumanLow, HumanMedium, HumanHigh}

// Hướng cuộn (Step.Direction).
var ScrollDirections = []string{"up", "down", "left", "right"}

// Cách bấm khi bước phím có nhiều phím chính (Step.KeyMode).
const (
	KeyChord    = "chord"    // nhấn giữ phím kèm + mọi phím chính cùng lúc rồi nhả (vd Ctrl+C+T)
	KeySequence = "sequence" // giữ phím kèm, gõ lần lượt từng phím chính rồi nhả phím kèm
)

// Phép của node Clipboard (Step.ClipOp).
const (
	ClipRead  = ""      // đọc chữ đang có vào output text
	ClipWrite = "write" // ghi Text (rỗng = xoá clipboard)
	ClipImage = "image" // ghi ảnh PNG từ FilePath
)

var ClipOps = []string{ClipRead, ClipWrite, ClipImage}

// Cách nhập chữ của node Gõ chữ / Gõ vào ô web (Step.TypeMode). Bộ gõ tiếng Việt (UniKey, EVKey…) xử lý lại phím
// app gửi (kể cả ký tự Unicode) → chữ méo; dán qua clipboard không đi qua bộ gõ.
const (
	TypeAuto  = ""      // Windows + không giống người: dán; còn lại gõ phím
	TypeKeys  = "keys"  // gõ từng phím (nhịp giống người được)
	TypePaste = "paste" // dán qua clipboard rồi khôi phục chữ cũ trong clipboard
)

var TypeModes = []string{TypeAuto, TypeKeys, TypePaste}

// Thao tác của node Tệp / thư mục (Step.FileOp). trash / emptyTrash là thao tác xoá – chạy phải được người dùng xác nhận
// trước (script.DangerOps, RunOptions.ConfirmDanger).
const (
	FileWrite      = ""           // ghi Text vào FilePath (FileAppend: thêm vào cuối)
	FileRow        = "row"        // thêm một dòng Cells vào file .csv / .xlsx (chưa có thì tạo)
	FileMkdir      = "mkdir"      // tạo thư mục FilePath (cả thư mục cha)
	FileTrash      = "trash"      // chuyển file khớp FilePattern trong thư mục FilePath vào Thùng rác
	FileEmptyTrash = "emptyTrash" // dọn Thùng rác (xoá hẳn)
)

var FileOps = []string{FileWrite, FileRow, FileMkdir, FileTrash, FileEmptyTrash}

// Thao tác của node Thao tác phần tử (Step.ElementAct, bước 43 E1) – qua cây accessibility, không dùng chuột.
const (
	ElActPress    = "press"    // bấm (AXPress / Invoke)
	ElActSetValue = "setValue" // đặt giá trị = Text
	ElActCheck    = "check"    // tick (đã tick thì thôi)
	ElActUncheck  = "uncheck"  // bỏ tick
	ElActExpand   = "expand"   // mở rộng
	ElActCollapse = "collapse" // thu gọn
	ElActSelect   = "select"   // chọn mục
	ElActScroll   = "scroll"   // cuộn phần tử vào khung nhìn
)

var ElementActs = []string{ElActPress, ElActSetValue, ElActCheck, ElActUncheck, ElActExpand, ElActCollapse, ElActSelect, ElActScroll}

// Sự kiện của node Chờ sự kiện giao diện (Step.UIEvent, bước 43 E2).
const (
	UIEventNewWindow   = "newWindow"   // cửa sổ mới mở (lọc WinApp / WinTitle)
	UIEventFocus       = "focus"       // cửa sổ trên cùng đổi sang cửa sổ khác (lọc WinApp / WinTitle)
	UIEventNewElement  = "newElement"  // phần tử khớp Selectors xuất hiện mà lúc bắt đầu chưa có (menu, hộp thoại, popup)
	UIEventValueChange = "valueChange" // giá trị / chữ của phần tử khớp Selectors khác lúc bắt đầu
)

var UIEvents = []string{UIEventNewWindow, UIEventFocus, UIEventNewElement, UIEventValueChange}

// Thao tác của node Hệ thống (Step.SysOp).
const (
	SysVolume     = "volume"     // đặt âm lượng = Volume %
	SysVolumeUp   = "volumeUp"   // tăng Volume % (0 = 10)
	SysVolumeDown = "volumeDown" // giảm Volume % (0 = 10)
	SysMute       = "mute"
	SysUnmute     = "unmute"
)

var SysOps = []string{SysVolume, SysVolumeUp, SysVolumeDown, SysMute, SysUnmute}

// Giờ hẹn đã qua lúc tới node Chờ đến giờ (Step.IfPassed).
const (
	PassedGo       = ""         // đi tiếp ngay (output lateMs > 0)
	PassedTomorrow = "tomorrow" // chờ tới giờ đó ngày mai – giờ không ghi ngày
	PassedFail     = "fail"     // node thất bại (code timeout)
)

var PassedModes = []string{PassedGo, PassedTomorrow, PassedFail}

// Hình của node Vẽ đường (Step.Shape) – đỉnh: ShapePoints (shape.go).
const (
	ShapeLine   = ""       // đi lần lượt qua Points
	ShapeCircle = "circle" // tròn / elip
	ShapeRect   = "rect"
	ShapeStar   = "star" // sao 5 cánh
)

var Shapes = []string{ShapeLine, ShapeCircle, ShapeRect, ShapeStar}

// Đọc cạnh nhãn của node Đọc phần tử (Step.ReadNear – bước 37 E4, vision.NearText).
const (
	ReadNearRight = "right"
	ReadNearBelow = "below"
)

var ReadNears = []string{"", ReadNearRight, ReadNearBelow}

// Step.FindBy
const (
	FindByText    = "text"
	FindByElement = "element" // phần tử màn hình qua Accessibility (bước 37)
)

// Step.ReadFrom (webRead)
const (
	ReadValue = "value"
	ReadAttr  = "attr"
)

// Step.ScrollMode (webScroll)
const (
	ScrollModeIn    = "in"
	ScrollModeUntil = "until"
)

// Hoa / thường của node Làm sạch chữ (Step.CaseMode, bước 42 G4b).
const (
	CaseKeep  = ""      // giữ nguyên
	CaseLower = "lower" // chữ thường
	CaseUpper = "upper" // CHỮ HOA
	CaseTitle = "title" // Hoa Đầu Mỗi Từ
)

var CaseModes = []string{CaseKeep, CaseLower, CaseUpper, CaseTitle}

// Việc của node Số & ngày (Step.NumOp, bước 42 G4b).
const (
	NumExtract = ""       // lấy số đầu tiên trong chữ: 1.234.000 đ → 1234000 (output value là số)
	NumFormat  = "format" // định dạng số theo NumStyle + Decimals
	NumDate    = "date"   // đọc ngày giờ, xuất theo DateLayout
)

var NumOps = []string{NumExtract, NumFormat, NumDate}

// Kiểu viết số của Số & ngày định dạng số (Step.NumStyle).
const (
	NumStyleVN    = ""      // 1.234.567,5
	NumStyleEN    = "en"    // 1,234,567.5
	NumStylePlain = "plain" // 1234567.5
)

var NumStyles = []string{NumStyleVN, NumStyleEN, NumStylePlain}

// Hỏi AI (bước 31d): ảnh gửi kèm (Step.AIImage) và dạng trả lời (Step.AIFormat).
const (
	AIImageNone   = ""
	AIImageScreen = "screen" // chụp màn hình theo ShotArea / Display / ShotRect như node Chụp màn hình
	AIImageFile   = "file"   // file ảnh ở FilePath

	AIFormatText = ""
	AIFormatJSON = "json" // bắt AI trả JSON; output.json là giá trị đã giải mã
)

var (
	AIImages  = []string{AIImageNone, AIImageScreen, AIImageFile}
	AIFormats = []string{AIFormatText, AIFormatJSON}
)
