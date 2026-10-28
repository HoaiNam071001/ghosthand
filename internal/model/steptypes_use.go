package model

// Gợi ý chọn node cho AI (MCP get_step_types): nhóm + "dùng khi / đừng dùng khi → node nào". Tách khỏi bảng
// stepTypeDocs để bảng đó chỉ mô tả trường. Thêm loại node mới: thêm một dòng ở đây (test bắt buộc).

// TypeUse – nhóm theo nhu cầu + khi nào nên dùng / đừng dùng → node nào.
type TypeUse struct {
	Group string `json:"group"`
	Use   string `json:"use"`
}

// UseOf – gợi ý chọn của một loại node (trống nếu chưa có).
func UseOf(t string) TypeUse { return stepTypeUses[t] }

const (
	grpMouse   = "Chuột & bàn phím"
	grpWait    = "Chờ & tìm trên màn hình"
	grpWin     = "Cửa sổ & app"
	grpBrowser = "Trình duyệt thường (macOS)"
	grpWeb     = "Web (Chrome của app)"
	grpFlow    = "Rẽ nhánh & vòng lặp"
	grpData    = "Dữ liệu, chữ & hệ thống"
)

var stepTypeUses = map[string]TypeUse{
	StepClick:         {grpMouse, "Click tại toạ độ cố định, chỉ khi vị trí không đổi. Vị trí thay đổi theo cửa sổ / trang → waitImage rồi clickImage (findBy text)."},
	StepDouble:        {grpMouse, "Mở file / chọn từ trong ô khi app cần double click. Còn lại dùng click."},
	StepHold:          {grpMouse, "Nhấn giữ nút chuột (giữ để mở menu, nút bấm giữ). Kéo thì dùng drag."},
	StepDrag:          {grpMouse, "Kéo thả giữa hai điểm (thanh trượt, sắp xếp). Vẽ nét cong / hình → path."},
	StepWait:          {grpWait, "Chờ cố định vài giây. Chỉ làm dự phòng; có thứ để chờ thì dùng waitImage / waitScreen / window waitOpen / app waitStart."},
	StepText:          {grpMouse, "Gõ chữ vào ô đang focus của app desktop (thường sau click). Ô trên trang web của app → webType."},
	StepKey:           {grpMouse, "Phím tắt (Cmd/Ctrl+C, Enter, Esc, F5) vào cửa sổ đang ở trước. Phím vào trang web của app → webKey."},
	StepScroll:        {grpMouse, "Cuộn tại một điểm trên app desktop. Trang web → webScroll."},
	StepOpen:          {grpWin, "Mở URL (kèm tham số tìm kiếm), file hoặc app – cách mở đầu kịch bản nhanh và bền nhất. Không chờ tải xong: nối waitImage / waitScreen / app waitStart sau đó. Đổi trang trong tab đã mở → browserGo."},
	StepWaitImage:     {grpWait, "Chờ ảnh mẫu hoặc chữ (findBy text, AI nên dùng chữ) hiện trên màn hình, lấy toạ độ cho clickImage. Cần tìm MỌI chỗ → findAll; chỉ cần biết trang đã ổn định → waitScreen."},
	StepClickImage:    {grpWait, "Click vào chỗ thấy ảnh / chữ / phần tử: imageSource node (dùng chỗ node waitImage vừa tìm) hoặc search (tự tìm). Bền hơn click toạ độ."},
	StepWaitPixel:     {grpWait, "Chờ một điểm ảnh đổi sang màu nhất định (đèn báo, nút chuyển trạng thái). Cần nhìn cả vùng → waitScreen."},
	StepWaitScreen:    {grpWait, "Chờ vùng màn hình đứng yên (trang tải xong, spinner tắt) hoặc có thay đổi, thay cho wait cố định khi không có chữ rõ để chờ."},
	StepFindAll:       {grpWait, "Lấy mọi chỗ khớp ảnh / chữ / phần tử (mọi nút “Thêm”, mọi dòng giá) → items nối vào forEach. Chỉ cần một chỗ → waitImage."},
	StepScreenshot:    {grpWait, "Chụp màn hình / vùng lưu PNG để báo cáo, hoặc đưa vào clipboard image. AI muốn nhìn màn hình khi soạn kịch bản → công cụ screenshot / describe_screen, không dùng node này."},
	StepClipboard:     {grpData, "Đọc / ghi clipboard (lấy chữ vừa copy bằng key Cmd/Ctrl+C, đưa chữ dài vào app). Gõ chữ ngắn → type."},
	StepHTTP:          {grpData, "Gọi API, lấy JSON / chữ về cho node sau (forEach mảng JSON). Có API thì ưu tiên hơn thao tác giao diện."},
	StepFile:          {grpData, "Ghi text, thêm dòng vào csv / xlsx, tạo thư mục, chuyển file vào thùng rác – xuất kết quả, ghi log. Đọc danh sách từ file → forEach listFrom."},
	StepOSShortcut:    {grpData, "macOS: chạy Shortcut có sẵn trong app Phím tắt (nhận chữ, trả chữ) – dùng lại việc người dùng đã tự động hoá. Việc có node riêng → dùng node đó; lệnh dòng lệnh → shell."},
	StepSysInfo:       {grpData, "Đọc pin, CPU / RAM, ổ trống, màn hình, mạng, tên máy để rẽ nhánh (pin yếu thì dừng, ổ đầy thì báo). Không đụng chuột / phím; cần việc khác của máy → shell."},
	StepPower:         {grpData, "Khoá màn, tắt màn hình, ngủ, đăng xuất, tắt hoặc khởi động lại máy khi kịch bản xong (hành động mất phiên cần người dùng đồng ý và đếm ngược để huỷ được). Giữ máy thức trong lúc chạy → tuỳ chọn kịch bản keepAwake."},
	StepDisplay:       {grpData, "Đổi chế độ sáng / tối, độ sáng màn hình, loa / micro mặc định, phát âm báo xong việc; đọc trạng thái hiện tại để rẽ nhánh. Âm lượng → node Hệ thống."},
	StepNotify:        {grpData, "Hiện thông báo của hệ điều hành (Notification Center / toast Windows) với tiêu đề + nội dung – báo người đang ngồi máy khi kịch bản xong / cần chú ý. Không gửi ra ngoài máy (Telegram / Discord → thông báo hẹn giờ); không chờ người bấm."},
	StepAskAI:         {grpData, "Hỏi AI (OpenAI / Anthropic / AI chạy trên máy) với chữ hoặc ảnh màn hình → chữ hoặc JSON: đọc hiểu nội dung, soạn câu trả lời, phân loại. Ảnh gửi ra ngoài máy, tốn tiền mỗi lần; việc có node riêng (tìm chữ, lọc mẫu) → dùng node đó."},
	StepZip:           {grpData, "Nén file / thư mục ra .zip (lọc theo mẫu tên) hoặc giải nén .zip vào thư mục, chặn file thoát ra ngoài thư mục đích. Dùng để gói kết quả trước khi gửi / tải lên, mở gói tải về. Đọc / ghi file thường → node Tệp / thư mục."},
	StepProcess:       {grpData, "Đọc / chờ tiến trình kể cả tiến trình nền không có cửa sổ: CPU / RAM của một app, danh sách tiến trình theo tên, chờ tiến trình chạy / thoát, chờ app hết bận (render / xuất file xong). Thoát app → node Ứng dụng."},
	StepInputSource:   {grpData, "Đọc / đổi bộ gõ (ABC ↔ Telex, en-US ↔ vi-VN) trước khi gõ chữ để dấu tiếng Việt không bị méo; kiểm tra bộ gõ rồi rẽ nhánh bằng Nếu. Không bật / tắt tiếng Việt của Unikey / EVKey (chỉ báo imeApp)."},
	StepShell:         {grpData, "Chạy lệnh / script của máy (shell, PowerShell, AppleScript) lấy stdout để dùng tiếp; biến vào lệnh qua biến môi trường. Cần người dùng đồng ý nội dung lệnh. Việc có node riêng (mở app, ghi file, gọi API) → dùng node đó, đừng viết lệnh."},
	StepSystem:        {grpData, "Chỉnh âm lượng / tắt tiếng máy. Không đụng chuột / phím."},
	StepWindow:        {grpWin, "Đưa cửa sổ lên trước, đặt vị trí / cỡ (setBounds), chờ cửa sổ hiện / mất. Đặt sau open để toạ độ luôn đúng."},
	StepApp:           {grpWin, "Kiểm tra app đang chạy (cổng yes / no), chờ app khởi động, hoặc thoát app. Kiểm tra đầu kịch bản trước khi open."},
	StepBrowserTab:    {grpBrowser, "Liệt kê / chuyển / mở / đóng / tải lại tab của Chrome, Edge, Brave, Cốc Cốc người dùng đang dùng (đã đăng nhập). macOS + Windows (Windows: chỉ tab đang hiện có url)."},
	StepBrowserGo:     {grpBrowser, "Đổi URL của tab trình duyệt thường rồi chờ tải xong (khác open: không mở tab mới)."},
	StepBrowserNorm:   {grpBrowser, "Chuẩn hoá cửa sổ trình duyệt thường (thoát toàn màn hình, đặt cỡ, zoom 100 %, đóng popup) ngay sau open, trước khi click theo ảnh / chữ."},
	StepSavePdf:       {grpBrowser, "In tab trình duyệt thường ra file PDF (hộp in Chrome → Lưu dưới dạng PDF). Lưu cả trang bằng ảnh chụp thì screenshot."},
	StepWaitUntil:     {grpWait, "Chờ tới đúng giờ (đặt hẹn, canh mở bán, kịch bản chạy hằng ngày với ifPassed tomorrow)."},
	StepPath:          {grpMouse, "Vẽ nét liền qua nhiều điểm hoặc hình tròn / chữ nhật / sao (vẽ, ký, game). Kéo thẳng hai điểm → drag."},
	StepWebWait:       {grpWeb, "Chờ phần tử trang web hiện / mất theo selector. Chỉ dùng khi probe_page báo ok và nodePref là web; ngược lại dùng waitImage theo chữ."},
	StepWebClick:      {grpWeb, "Click phần tử trang web theo selector (webBackground = chạy nền không đụng chuột). Cần probe_page ok."},
	StepWebType:       {grpWeb, "Gõ vào ô nhập trên trang web (xoá cũ, Enter). Cần probe_page ok."},
	StepWebRead:       {grpWeb, "Đọc chữ / giá trị / thuộc tính phần tử web vào biến. Chrome thường đã đăng nhập → elementRead / pageText."},
	StepWebScroll:     {grpWeb, "Cuộn tới phần tử, cuộn trong khung, hoặc cuộn tới khi phần tử xuất hiện (feed tải thêm)."},
	StepWebKey:        {grpWeb, "Bấm phím vào trang web qua CDP, không cần Chrome ở trước (esc đóng hộp thoại, tab, enter)."},
	StepElementRead:   {grpWeb, "Đọc chữ chính xác của phần tử trong app / Chrome thường qua cây accessibility (không OCR). Dùng khi OCR đọc sai hoặc muốn chữ chuẩn."},
	StepElementAction: {grpWeb, "Bấm / đặt giá trị / tick / mở rộng / chọn phần tử của app hoặc Chrome thường qua accessibility, không đụng chuột – cửa sổ bị che vẫn chạy. Bấm bằng chuột thật theo ảnh / chữ → clickImage; ô web React không nhận giá trị → gõ chữ."},
	StepWaitUIEvent:   {grpWait, "Chờ giao diện thay đổi mà không chụp màn: cửa sổ mới mở, đổi cửa sổ trên cùng, menu / hộp thoại / popup bật lên, giá trị phần tử đổi. Chờ một ảnh / chữ cụ thể → waitImage; chờ vùng đứng yên → waitScreen."},
	StepWaitDownload:  {grpWait, "Chờ file tải về xong (hết .crdownload, cỡ đứng yên) rồi lấy đường dẫn để mở / đọc / đổi tên. Chờ trang hoặc màn hình xong → waitScreen / chờ chữ."},
	StepReadTable:     {grpWeb, "Đọc cả BẢNG trên trang / app thành dòng + cột (items theo tên cột) để lặp từng dòng hoặc ghi csv / xlsx. Chữ rời không phải bảng → pageText."},
	StepReadDocument:  {grpWeb, "Đọc nguyên văn nội dung ô soạn thảo / tài liệu đang mở (giữ xuống dòng) hoặc phần đang bôi đen. Chữ rời trên trang / nhiều khối → pageText; một ô nhỏ → elementRead."},
	StepPageText:      {grpWeb, "Đọc MỌI chữ trong cửa sổ app / Chrome thường (hoặc trong một khung) để lọc bằng textMatch / textSplit. Một phần tử cụ thể → elementRead."},
	StepIf:            {grpFlow, "Rẽ nhánh theo điều kiện (thấy chữ / ảnh, so biến). Nhiều trạng thái trang → switchScreen; nhiều giá trị → switch."},
	StepSwitch:        {grpFlow, "Rẽ nhiều nhánh theo giá trị biến (eq / contains / regex)."},
	StepSwitchScreen:  {grpFlow, "Trang có thể ở nhiều trạng thái (đăng nhập / đã vào / popup): chờ tới khi thấy trạng thái nào thì đi nhánh đó."},
	StepCounter:       {grpFlow, "Giới hạn số lần thử trong vòng quay lại (không thấy nút → cuộn → thử lại tối đa N lần, done → end fail)."},
	StepForEach:       {grpFlow, "Làm cùng một việc cho từng dòng danh sách / mảng JSON / CSV / xlsx / kết quả findAll. Không chép node cho từng dòng."},
	StepEnd:           {grpFlow, "Kết thúc kịch bản: success (xong) hoặc fail kèm message rõ ràng khi hết lượt thử."},
	StepSetVar:        {grpData, "Gán / cộng biến {{vars.x}} giữa các node. Không dùng để tính (→ calc) hay xử lý chữ (→ text*)."},
	StepCalc:          {grpData, "Tính / so sánh số (tổng, so ngưỡng giá) → value số hoặc true / false nối vào if."},
	StepTextMatch:     {grpData, "Lấy mã / số điện thoại / đoạn khớp regex từ chữ đọc được; không khớp → cổng fail."},
	StepTextSplit:     {grpData, "Tách chữ “a, b, c” hoặc nhiều dòng thành items để nối vào forEach."},
	StepTextClean:     {grpData, "Làm sạch chữ: bỏ dấu, hoa / thường, thay chữ, gọn khoảng trắng."},
	StepTextNumber:    {grpData, "Lấy số từ chữ kiểu Việt / Anh (1.234.000 đ), định dạng số, đọc / định dạng ngày → value dùng trong calc."},
}

// Pick – bảng “nhu cầu → node” đưa đầu bản gọn của get_step_types.
const Pick = `Mở trang / app: open (xong thì chờ bằng waitImage chữ / waitScreen / app waitStart). Biết chữ trên màn hình: waitImage findBy text → clickImage. ` +
	`Chữ cần đọc: pageText / elementRead (accessibility, chuẩn) → textMatch / textSplit / textNumber; app không đọc được thì waitImage + OCR. ` +
	`Nhập liệu: type (app desktop), webType (trang web đã probe ok), key / webKey (phím). Lặp: forEach (danh sách) hoặc counter (giới hạn số lần thử). ` +
	`Nhiều trạng thái: if / switch / switchScreen. Dữ liệu ra / vào: http, file, clipboard. Hẹn giờ: waitUntil. Trình duyệt thường đã đăng nhập: browserTab / browserGo / browserNorm (macOS).`
