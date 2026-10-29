package model

// Loại bước (Step.Type).
const (
	StepClick  = "click"  // click Clicks lần, cách nhau ClickInterval
	StepDouble = "double" // double click
	StepHold   = "hold"   // giữ chuột HoldMs
	StepDrag   = "drag"   // kéo Points[0] -> Points[1] trong DragMs
	StepWait   = "wait"   // chỉ chờ DelayAfter
	StepText   = "type"   // gõ chuỗi Text vào ô đang focus
	StepKey    = "key"    // bấm Keys, kèm Modifiers (tổ hợp phím) theo KeyMode
	StepScroll = "scroll" // cuộn Amount nấc theo Direction, tại Points[0] (không có điểm = chỗ chuột đang đứng)
	StepOpen   = "open"   // mở Target (URL / file / app) bằng App hoặc app mặc định của máy (open.go)

	StepWaitImage  = "waitImage"  // chờ tới khi thấy ảnh mẫu Template trên màn hình (imagestep.go)
	StepClickImage = "clickImage" // click vào chỗ thấy ảnh: output của node ImageFrom (ImageSource node) hoặc tự tìm
	StepWaitPixel  = "waitPixel"  // chờ tới khi điểm Points[0] có màu Color (± Tolerance)
	StepWaitScreen = "waitScreen" // chờ vùng ShotArea đứng yên / thay đổi theo WaitMode (engine/waitscreen.go, bước 42 G1)
	StepFindAll    = "findAll"    // như waitImage nhưng trả mọi chỗ khớp (items), số chỗ trong MinCount..MaxCount (engine/findall.go, bước 42 G3)

	// Node nâng cao (bước 35)
	StepScreenshot  = "screenshot"  // chụp vùng ShotArea, lưu PNG vào SaveDir / FileName, tuỳ chọn chép vào clipboard (engine/shot.go)
	StepClipboard   = "clipboard"   // ClipOp: đọc chữ vào output / ghi Text / ghi ảnh PNG từ FilePath (engine/clip.go)
	StepHTTP        = "http"        // gọi API: Method URL + Query / Headers / Body; 2xx → success, khác → fail (engine/http.go)
	StepSystem      = "system"      // SysOp: âm lượng đặt / tăng / giảm, tắt / bật tiếng (engine/system.go)
	StepWaitUntil   = "waitUntil"   // chờ đến giờ At (hôm nay / ngày giờ), tuỳ chọn canh giờ chuẩn NTP (engine/waituntil.go)
	StepPath        = "path"        // vẽ: giữ chuột đi qua Points (đường gấp khúc) hoặc hình Shape quanh Points[0] trong DragMs (engine/draw.go)
	StepWindow      = "window"      // WinOp: focus / chờ mở · đóng / đặt khung / thu nhỏ… cửa sổ khớp WinApp + WinTitle (engine/window.go)
	StepApp         = "app"         // AppOp: kiểm tra đang chạy (cổng yes / no) / chờ chạy · thoát / thoát app khớp AppName (engine/app.go)
	StepBrowserTab  = "browserTab"  // TabOp: đọc / liệt kê / chuyển / mở / đóng / tải lại tab của trình duyệt thường họ Chromium (engine/browsertab.go, bước 43 B1)
	StepBrowserGo   = "browserGo"   // đặt URL cho tab (như browserTab chọn tab) rồi chờ tải xong (engine/browsergo.go, bước 43 B2)
	StepBrowserNorm = "browserNorm" // đưa trình duyệt thường về trạng thái chuẩn: zoom 100 %, thoát toàn màn hình, đặt cỡ cửa sổ, đóng popup (engine/browsernorm.go, bước 43 B3)
	StepSavePdf     = "savePdf"     // in tab trình duyệt thường ra file PDF qua hộp in + hộp lưu của hệ điều hành (engine/savepdf.go, bước 43 B7)
	StepFile        = "file"        // FileOp: ghi file / thêm dòng csv · xlsx / tạo thư mục / xoá vào Thùng rác / dọn Thùng rác (engine/file.go)

	// Web qua DOM (bước 25d, engine/webstep.go): tìm phần tử bằng Selectors trên tab của Chrome của app, bấm bằng chuột thật.
	StepWebWait   = "webWait"   // chờ tới khi phần tử hiện (WebGone: mất)
	StepWebClick  = "webClick"  // chờ phần tử hiện rồi click vào tâm (+ Dx / Dy)
	StepWebType   = "webType"   // click vào ô, kiểm tra ô nhận focus rồi gõ Text bằng phím thật (WebClear: xoá chữ cũ trước)
	StepWebRead   = "webRead"   // chờ phần tử hiện rồi đọc chữ / value / thuộc tính (ReadFrom) vào output
	StepWebScroll = "webScroll" // cuộn tới phần tử / trong phần tử / tới khi thấy phần tử (ScrollMode)
	StepWebKey    = "webKey"    // bấm Keys (+ Modifiers, KeyMode) vào tab qua CDP – không cần Chrome ở trước (46 B3)

	// Phần tử màn hình qua Accessibility (bước 37, engine/elementstep.go) – Chờ / Click dùng waitImage / clickImage FindBy element
	StepPageText      = "pageText"      // đọc toàn bộ chữ trong cửa sổ app / trang trình duyệt thường (hoặc trong một phần tử) qua cây accessibility (engine/pagetext.go, bước 43 B4)
	StepElementAction = "elementAction" // thao tác phần tử qua accessibility không cần chuột: bấm / đặt giá trị / tick / mở rộng / chọn (engine/elementaction.go, bước 43 E1)
	StepReadDocument  = "readDocument"  // đọc toàn bộ chữ của ô soạn thảo / tài liệu đang mở (hoặc phần đang chọn) qua accessibility (engine/readdocument.go, bước 43 E3)
	StepWaitUIEvent   = "waitUIEvent"   // chờ sự kiện giao diện: cửa sổ mới / đổi focus / phần tử mới hiện / giá trị đổi (engine/waituievent.go, bước 43 E2)
	StepOSShortcut    = "osShortcut"    // chạy Shortcut (Phím tắt) của macOS với input chữ, lấy chữ trả về (engine/osshortcut.go, bước 43 S2)
	StepSysInfo       = "sysInfo"       // đọc pin / CPU / RAM / ổ đĩa / màn hình / mạng / tên máy (engine/sysinfo.go)
	StepPower         = "power"         // khoá màn / ngủ / đăng xuất / tắt / khởi động lại (engine/power.go, bước 43 S3)
	StepDisplay       = "display"       // chế độ sáng tối, độ sáng, loa / micro mặc định, phát âm báo (engine/display.go, bước 43 S7)
	StepNotify        = "notify"        // thông báo hệ điều hành (engine/toast.go, bước 43 S9)
	StepAskAI         = "askAI"         // hỏi AI (chữ / ảnh màn hình → chữ hoặc JSON) – engine/askai.go, bước 31d
	StepMCPTool       = "mcpTool"       // gọi một tool của MCP server ngoài (Cài đặt → MCP server) – engine/mcptool.go, bước 55 M3
	StepZip           = "zip"           // nén / giải nén .zip (engine/zip.go, bước 43 S8)
	StepProcess       = "process"       // đọc / chờ tiến trình: CPU, RAM, xuất hiện, kết thúc, hết bận (engine/process.go, bước 43 S5)
	StepInputSource   = "inputSource"   // đọc / đổi bộ gõ – bàn phím đang dùng của hệ điều hành (engine/inputsource.go, bước 43 S6)
	StepShell         = "shell"         // chạy lệnh / script (shell, PowerShell, AppleScript, JXA) – cần người dùng đồng ý nội dung lệnh (engine/shell.go, bước 43 S1)
	StepWaitDownload  = "waitDownload"  // chờ file tải xong trong thư mục tải về (engine/waitdownload.go, bước 43 B6)
	StepReadTable     = "readTable"     // đọc bảng (table / grid) trong cửa sổ app / trang trình duyệt thường → rows / items, tuỳ chọn ghi csv / xlsx (engine/readtable.go, bước 43 B5)
	StepElementRead   = "elementRead"   // chờ phần tử có trong cửa sổ app rồi đọc chữ / giá trị (không di chuột, không cuộn)

	// Node điều khiển (bước 20 F3, nodes.go) – không làm gì trên màn hình ngoài nhìn, chọn cổng ra theo kết quả.
	StepIf           = "if"           // Cond đúng → cổng true, sai → false; TimeoutMs > 0 = chờ tới khi đúng
	StepSwitch       = "switch"       // so Value với từng case (Op / Match) → case:<key>, không case nào khớp → default
	StepSwitchScreen = "switchScreen" // chờ tới TimeoutMs, case (Cond ảnh / chữ / màu) nào đúng trước → case:<key>, hết giờ → none
	StepCounter      = "counter"      // đếm số lần đi qua trong vòng: lần 1..Max → next, lần Max+1 → done (rồi đếm lại từ 0)
	StepForEach      = "forEach"      // lặp qua danh sách (ListFrom): mỗi lần đi vào lấy một phần tử → item, hết → done (engine/foreach.go, bước 42 G2)
	StepEnd          = "end"          // kết thúc vòng: EndStatus success (chạy vòng sau) / fail (dừng kịch bản, báo Message)
	StepSetVar       = "setVar"       // đặt biến {{vars.VarName}} = Value (VarOp set) hoặc cộng thêm Value (add)
	StepCalc         = "calc"         // tính biểu thức Value (số, so sánh, and / or, round…) → output value (script/calc.go, bước 42 G4a)

	// Xử lý chữ (bước 42 G4b, internal/textop) – chữ vào ở Value, mỗi việc một node
	StepTextMatch  = "textMatch"  // lọc Value theo regex Pattern (MatchAll: mọi chỗ khớp) → text, items; không khớp → fail
	StepTextSplit  = "textSplit"  // tách Value theo Separator ("" = mỗi dòng) → items
	StepTextClean  = "textClean"  // thay → bỏ dấu → hoa / thường → gọn khoảng trắng → text
	StepTextNumber = "textNumber" // NumOp: lấy số / định dạng số / định dạng ngày → text (+ value / timestamp); không đọc được → fail
)

// StepTypes – mọi loại node app hỗ trợ (steptypes.go có mô tả cho từng loại – test kiểm tra).
var StepTypes = []string{StepClick, StepDouble, StepHold, StepDrag, StepWait, StepText, StepKey, StepScroll, StepOpen,
	StepWaitImage, StepClickImage, StepWaitPixel, StepWaitScreen, StepFindAll, StepScreenshot, StepClipboard, StepHTTP, StepFile, StepSystem, StepWaitUntil, StepPath, StepWindow, StepApp, StepBrowserTab, StepBrowserGo, StepBrowserNorm, StepSavePdf, StepWebWait, StepWebClick,
	StepWebType, StepWebRead, StepWebScroll, StepWebKey, StepElementRead, StepPageText, StepReadTable, StepWaitDownload, StepElementAction, StepReadDocument, StepWaitUIEvent, StepShell, StepOSShortcut, StepSysInfo, StepProcess, StepZip, StepNotify, StepAskAI, StepMCPTool, StepPower, StepDisplay, StepInputSource, StepIf, StepSwitch, StepSwitchScreen, StepCounter, StepForEach, StepEnd, StepSetVar, StepCalc,
	StepTextMatch, StepTextSplit, StepTextClean, StepTextNumber}

// IsControl – node điều khiển: không thử lại, không chờ sau khi xong, inspector riêng.
func IsControl(t string) bool {
	switch t {
	case StepIf, StepSwitch, StepSwitchScreen, StepCounter, StepForEach, StepEnd, StepSetVar, StepCalc,
		StepTextMatch, StepTextSplit, StepTextClean, StepTextNumber:
		return true
	}
	return false
}
