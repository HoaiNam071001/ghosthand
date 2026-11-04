# Ghosthand – Plan

Desktop app tự động click theo kịch bản: chọn vùng / toàn màn hình, chọn điểm, nối theo thứ tự, cấu hình thời gian và số lần click, kéo thả giữa 2 điểm.

## Trạng thái hiện tại

> Hook đầu phiên chèn nguyên mục này cho AI – giữ ngắn (≤ ~1500 ký tự, `check-docs.py` cảnh báo): mỗi dòng một ý, chi tiết để ở file bước / `log.md`. Cập nhật mỗi khi xong / bắt đầu một bước.

- **Đang làm:** [56](phase3/56-hoc-tu-mcp-ngoai.md) học từ MCP ngoài – đợt A (A1–A3) xong code, tiếp B1, D1.
- **Xong code, chờ kiểm tra tay:** 56 A, 61, 59 (còn U5), 58, 57, 55, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 40 (còn I2b), 39, 38, 37, 36, 35, 34, 31a–d, 28, 26, 25d, 24, 22 – xem bảng *Tổng quan* + [checks.md](checks.md).
- **Tiếp theo:** 59 U5 `update_app`; 57 đợt 3 khi cần; chờ người dùng chốt: 40 I2b, 33 (`examples/` cũ), 30 UI chọn 4 điểm mốc. Chưa làm: 54, 56. Hoãn: 17 (Windows), 18b.
- **Cập nhật lần cuối:** 2026-11-04 (56 A1–A3: quyền AI theo nội dung, file script của node Chạy lệnh, chặn AI thử mãi + `screenUnchanged`).

## Tính năng của hệ thống

> ✅ có, chạy được · 🧪 xong code, chờ bạn kiểm tra tay ([checks.md](checks.md)) · 🟡 có một phần · ⬜ chưa làm. Bấm cột *Bước* để xem chi tiết.
> Cập nhật bảng này khi một tính năng đổi trạng thái (viết tay, khác bảng *Tổng quan* tự sinh ở dưới).

### Soạn kịch bản

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| 🧪 | Canvas flow kiểu n8n | Kéo node, nối cổng ra → node kế, thả cổng ở chỗ trống để thêm node, tự xếp, zoom, minimap | [20 F4b](phase3/20-flow.md) |
| ✅ | Bảng thêm node Ctrl/Cmd+K | Tìm không dấu, phím mũi tên, nối vào node đang chọn | [20](phase3/20-flow.md) |
| ✅ | Sửa node | Tên, mã node (n2), cổng ra, output, bật / tắt, node bắt đầu; copy / paste, nhân bản, chọn nhiều, xoá | [20 F4b](phase3/20-flow.md) |
| ✅ | Hoàn tác / làm lại | Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z cho mọi thay đổi | [30](phase3/30-sua-nhieu-diem.md) |
| ✅ | Chọn vùng / toàn màn hình, đặt điểm | Overlay: click hoặc F6, kéo marker, chọn lại điểm, xem riêng một node | [10–13](phase1-mvp.md), [19c](phase2.md) |
| ✅ | Neo điểm theo cạnh vùng | Điểm bám góc / cạnh / giữa / % – đổi cỡ vùng không lệch | [29](phase3/29-neo-diem.md) |
| 🟡 | Sửa nhiều điểm cùng lúc | Di chuyển, co giãn, xoay, xiên, căn, lật, ánh xạ khi đổi vùng – **còn** ánh xạ theo 4 điểm mốc | [30](phase3/30-sua-nhieu-diem.md) |
| ✅ | Input của kịch bản | Ghim trường làm input, `{{biến}}` trong ô chữ, form Chạy, preset, nhớ giá trị lần trước | [21b](phase3/21b-input.md) |
| ✅ | Lưu / mở kịch bản | File `.json`, mở gần đây, nháp tự lưu, hỏi lưu khi đóng | [21](phase3/21-luu-tai.md) |
| ✅ | Nơi lưu + xoá lịch sử | Cài đặt chọn thư mục kịch bản (tay / AI) + ảnh chụp, Documents / Pictures đúng cả khi Windows dùng OneDrive; xoá từng mục / tất cả lịch sử chạy và Mở gần đây | [41](phase3/41-noi-luu-lich-su.md) |
| 🧪 | Ghi macro | Ghi click / kéo / gõ phím thành node, F9 dừng | [24](phase3/24-ghi-macro.md) |
| ⬜ | Đồng bộ cloud | Đăng nhập Google, đồng bộ kịch bản + ảnh mẫu + cài đặt + bí mật (mã hoá phía máy) lên Drive; xung đột thì hỏi; backend MCP | [54](phase3/54-dong-bo-cloud.md) |
| 🧪 | MCP client + node tuỳ chỉnh | Kết nối MCP server khác (stdio / từ xa / thư viện gợi ý), gọi tool như node, lưu tool thành node của tôi; hỏi quyền theo server + tool | [55](phase3/55-mcp-client-node-tuy-chinh.md) |
| 🟡 | Học từ MCP ngoài | **Đợt A xong code:** quyền AI theo nội dung, file script của Chạy lệnh, chặn AI thử mãi; còn hộp thoại JS trên web, node Hỏi người dùng giữa flow, phân trang / cắt output MCP, xuất gói lỗi, mẫu Zalo / Telegram | [56](phase3/56-hoc-tu-mcp-ngoai.md) |
| 🧪 | AI chạy ổn định | Nhận đúng cửa sổ đang ở trước, chạy tiếp giữ focus app đích, AI chạy thì thu về thanh mini, Mở URL đưa trình duyệt lên, đụng chuột tự chạy tiếp sau 5 s, lỗi phần tử gọn hơn | [57](phase3/57-ai-chay-on-dinh.md) |
| 🧪 | Dấu hiệu đang điều khiển | Viền sáng quanh màn hình macOS + Windows (không lọt vào ảnh chụp) + thanh mini ghi rõ đang thao tác / đang chờ gì / tạm dừng | [58](phase3/58-dau-hieu-dang-dieu-khien.md) |
| 🟡 | AI tự cập nhật + test | Bản dev cài đè + mở lại một lệnh, `app_info`, proxy MCP sống qua lần mở lại, skill test sau khi sửa – **còn** tool `update_app` (U5) | [59](phase3/59-ai-tu-cap-nhat-va-test.md) |
| ✅ | Dữ liệu qua node | Thẻ node Gọn / Đầy đủ có VÀO / RA, kéo output sang input để nối (chỉ tới node chạy sau), thẻ gọn toả cổng khi rê; chi tiết Panel / Modal / Popover; Lịch sử chạy dạng cây node, rê thẻ xem giá trị vào / ra, đường dữ liệu + truy ngược | [60](phase3/60-du-lieu-qua-node.md) |
| 🧪 | Dùng AI gọn hơn | Trạng thái đầu phiên ngắn, `ghosthand test` chạy nhiều kịch bản ra bảng gọn, kiểm tra môi trường trước khi chạy, `browserNorm` bắt buộc chọn đích, tự dọn kịch bản thử của AI | [61](phase3/61-dung-ai-gon.md) |

### Node hành động

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Click / double click / giữ chuột / kéo thả | Nút trái / phải / giữa, số lần click, kéo từ điểm trước, B lệch so với A | [7](phase1-mvp.md), [13](phase1-mvp.md) |
| ✅ | Ngẫu nhiên hoá | ± ms thời gian chờ, ± px vị trí | [19](phase2.md) |
| ✅ | Gõ chữ, phím tắt | Tiếng Việt, tổ hợp phím, gõ lần lượt | [7](phase1-mvp.md) |
| ✅ | Chờ, cuộn, mở URL / app | Cuộn theo nấc tại điểm / tại chuột; mở bằng app chỉ định | [23](phase3/23-cuon-mo-url.md) |
| 🧪 | Chờ ảnh / click theo ảnh / chờ màu pixel | Khoanh ảnh mẫu, Thử tìm, khác tỷ lệ Retina vẫn tìm được, mọi màn hình | [25](phase3/25-cho-anh.md) |
| 🧪 | Chờ chữ / click theo chữ (OCR) | Đọc chữ trên màn hình, bỏ dấu, chỗ thứ N – macOS (Vision); Windows (Windows.Media.Ocr, không có tiếng Việt → so không dấu, chịu lệch nhẹ) | [25e](phase3/25e-ocr.md) |
| 🟡 | Đọc chữ tiếng Việt trên Windows, tìm ảnh bền hơn | Tesseract `vie` (kèm sẵn trong exe) làm mặc định trên Windows; tìm ảnh so cạnh (đổi theme vẫn thấy), mặt nạ, kiểm tra màu | [40](phase3/40-nhan-dang.md) |
| ✅ | Thử lại khi thất bại | Thử lại N lần, nghỉ giữa các lần, hết lượt đi cổng Thất bại | [25b](phase3/25b-khi-that-bai.md), [20](phase3/20-flow.md) |
| 🧪 | Thao tác giống người | Chuột đi đường cong có tăng / giảm tốc, nhịp gõ / click / cuộn tự nhiên – bật sẵn mức vừa | [34](phase3/34-giong-nguoi.md) |
| 🧪 | Chụp màn hình, clipboard, HTTP | Đợt 1 node nâng cao: chụp màn / vùng ra file, đọc / ghi clipboard, gọi API | [35](phase3/35-node-nang-cao.md) |
| 🧪 | Tệp / thư mục, âm lượng, chờ đến giờ, vẽ đường | Đợt 2 node nâng cao (xoá vào Thùng rác); Bluetooth hoãn | [35](phase3/35-node-nang-cao.md) |
| 🧪 | Cửa sổ + Ứng dụng | Node Cửa sổ (focus, chờ mở / đóng, đặt vị trí + cỡ, thu nhỏ / phóng to / đóng, đọc) + node Ứng dụng (đang chạy? cổng yes / no, chờ chạy / thoát, thoát / buộc thoát) – cố định môi trường trước khi click; macOS + Windows | [26](phase3/26-cua-so-ung-dung.md) |
| 🧪 | Web qua DOM | Trang cần đăng nhập: nút **Đăng nhập** ở node web (mở Chrome của app không chế độ điều khiển, Xong mở lại), bớt dấu vết điều khiển, lăn chuột thật tới phần tử ([36](phase3/36-chrome-app-sau.md), 2026-11-01); trang hỏi captcha khi chạy thì dùng Chrome thường. Tìm phần tử trang bằng chữ / selector (Chrome), bấm bằng chuột thật – D1: Chờ / Click phần tử web, node Mở bằng Chrome của app; D2: chờ đứng yên + thử hover trước khi bấm, iframe cùng nguồn, `role=`; D3: Chọn phần tử trên trang, Thử tìm, trạng thái kết nối; D4a: Gõ vào ô / Đọc phần tử / Cuộn trang web (tới phần tử, trong khung, tới khi thấy); D4b: chạy nền theo từng node (CDP, không đụng chuột); D4c: `PageOutline` – cây phần tử rút gọn cho AI (MCP 31) | [25d](phase3/25d-web-dom.md) |
| 🧪 | Tìm / đọc phần tử màn hình (Accessibility) | **E0–E4 xong code (macOS)**: đọc cây, Chờ / Click theo phần tử (Tìm theo: Phần tử, Chọn trên màn, Thử tìm), node Đọc phần tử (+ đọc chữ cạnh nhãn bằng OCR, lọc mẫu, lấy số, chờ giá trị đổi), mẫu thử `element.html`. Chrome thường đã đăng nhập + app khác, không CDP: Chờ / Click theo phần tử, Đọc phần tử; dự phòng OCR cạnh nhãn + lọc mẫu – macOS (AX) + **Windows (UI Automation, E5 xong 2026-10-19)** | [37](phase3/37-phan-tu-man-hinh.md) |
| 🧪 | Trình duyệt thường (không CDP) | Chrome / Edge / Cốc Cốc / Brave: tab đầy đủ (cả đóng tab node Mở tạo), đi tới URL, chuẩn hoá, đọc chữ trang, đọc bảng, chờ tải xong, lưu PDF | [43 B](phase3/43-node-chuyen-sau.md) |
| 🧪 | Phần tử app không cần chuột, hệ điều hành | Bấm / đặt giá trị / tick qua AX / UIA, chờ sự kiện giao diện, đọc tài liệu; chạy lệnh (người duyệt), Shortcuts, nguồn, thông tin máy, tiến trình, bộ gõ, màn hình / âm thanh, zip, thông báo, kho bí mật | [43 E, S](phase3/43-node-chuyen-sau.md) |
| 🧪 | Đọc chữ vùng, thống kê lần chạy, gói kịch bản | Node *Đọc chữ vùng* (OCR cả vùng → biến, rẽ nhánh theo chữ; OCR Windows đọc được chữ đậm cỡ lớn); dòng thống kê ở Lịch sử chạy (% thành công, trung bình, node hay lỗi); xuất / nhập gói .zip kèm file CSV / ảnh | [28](phase3/28-mo-rong.md) |
| 🟡 | Kịch bản mẫu để test | Nút *Mẫu thử* ở Thư viện: mẫu đơn giản cho từng loại bước + nhiều kiểu web app, chạy trên sân thử cục bộ / vài web thật – còn chốt giữ / xoá `examples/` cũ | [33](phase3/33-mau-thu.md) |

### Rẽ nhánh & luồng

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Cổng Thành công / Thất bại, vòng lặp bằng cạnh | Thất bại không nối = dừng báo lỗi; chặn lặp vô hạn 10 000 node / vòng | [20 F1–F2](phase3/20-flow.md) |
| 🧪 | Mọi node có output, ô số nhận biến | Gõ chữ / phím / cuộn / chờ / mở cũng trả output; số lần click, thời gian chờ… nhận `{{biến}}` | [20 F5c](phase3/20-flow.md) |
| 🧪 | Toạ độ lấy từ biến | Click / kéo / cuộn / chờ pixel tại `{{n2.output.x}}` (+ lệch px) – vd click cạnh chữ vừa tìm thấy | [20 F5b](phase3/20-flow.md) |
| ✅ | Biến giữa các node | `{{n2.output.x}}`, `{{n2.status}}`, `{{last…}}`, `{{vars…}}`; gợi ý khi gõ `{{` | [20](phase3/20-flow.md) |
| 🧪 | Nếu | Thấy chữ / ảnh / màu, so giá trị, và / hoặc, đảo, chờ tới khi đúng | [20 F3](phase3/20-flow.md) |
| 🧪 | Switch theo giá trị / theo màn hình | Bằng / chứa / khớp mẫu; màn nào hiện trước đi cổng đó | [20 F3](phase3/20-flow.md) |
| 🧪 | Đếm, Kết thúc, Đặt biến | Giới hạn số lần lặp; kết thúc thành công / báo lỗi; gán / cộng biến | [20 F3](phase3/20-flow.md) |
| 🧪 | Thử node | Xét Nếu / Switch trên màn hình lúc này, khung chỗ thấy trên overlay | [20 F3](phase3/20-flow.md) |
| 🧪 | Chờ màn hình đứng yên, lặp qua danh sách, tìm tất cả, tính toán / xử lý chữ | Chờ trang tải xong thay Chờ cố định; lặp theo chỗ thấy / CSV / JSON; regex, lấy số, biểu thức | [42](phase3/42-du-lieu-luong.md) |
| 🧪 | Nhóm node, nhúng kịch bản khác | Khung nhóm trên canvas, chép kịch bản khác vào thành một nhóm; group khoá (subflow) để dành | [39](phase3/39-gom-kich-ban.md) |

### Chạy

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Chạy N vòng / vô hạn / theo thời gian | Đếm ngược, F8 chạy / dừng, tạm dừng / tiếp tục, thanh mini | [8](phase1-mvp.md), [16](phase1-mvp.md) |
| ✅ | Dừng khẩn cấp | Rê chuột vào góc màn hình | [9](phase1-mvp.md) |
| 🧪 | Xem trước bằng con trỏ giả | Đi theo đồ thị, chọn nhánh ở menu Nhánh, Đếm chạy 1 lượt | [19b](phase2.md), [20 F6](phase3/20-flow.md) |
| 🧪 | Canvas khi chạy + nhật ký từng node | Đường đã đi, node xong / lỗi / ×n, bảng nhật ký (output, log, ảnh lúc lỗi), lời nhắn Kết thúc thành công | [20 F5](phase3/20-flow.md) |
| 🧪 | Lịch sử chạy, debug | Lưu 50 lần chạy gần nhất / kịch bản, mở lại từ thư viện; điểm dừng, từng node (F10), chạy từ node, chạy riêng một node | [20 F5](phase3/20-flow.md), [20 F7](phase3/20-flow.md) |
| 🧪 | Hẹn giờ, thông báo, CLI / API local | Chạy lúc HH:mm, báo Telegram / Discord / webhook, lệnh `ghosthand run`, API local cho chương trình khác (tắt mặc định). **Xong code 2026-10-20**, chưa thử tay | [22](phase3/22-hen-gio-cli-api.md) |

### AI

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Mô tả loại node + hướng dẫn flow cho AI | `StepTypes`, `FlowGuide`, kịch bản mẫu – nền cho MCP | [20 F1](phase3/20-flow.md) |
| 🧪 | AI tạo / sửa kịch bản qua MCP | Claude / Cursor / Codex… ra lệnh bằng lời; kịch bản lưu ở Documents/Ghosthand, chip AI | [31a](phase3/31-mcp-ai.md) |
| 🧪 | AI tự chạy, xem lỗi, sửa, chạy tiếp; soạn bằng cách thử | Mở app nền (thanh mini), chạy một phần / chạy tiếp từ node lỗi với biến cũ, chi tiết lỗi có cấu trúc + ảnh khi lỗi, đọc chữ / chụp màn khi xin, công tắc AI 4 mức (có Tự chạy); ảnh mẫu do AI khoanh, chạy thử khô | [31b, 31c](phase3/31-mcp-ai.md) |
| 🧪 | Thử trang + ưu tiên node cho AI | Nút / tool `probe_page` mở trang trên Chrome của app, tự dò captcha / chặn bot / canvas → dùng node web hay ảnh / chữ; ưu tiên 2 mức (mặc định ảnh / chữ), AI đổi qua `set_node_preference` | [44](phase3/44-thu-trang-uu-tien-node.md) |
| 🧪 | MCP web – tinh chỉnh | `coordSpace`, `read_web_outline` tab đang điều khiển, `webType` bớt chặt + scope / occurrence, ghim tab ID, chạy kịch bản tạm, `webKey` | [46](phase3/46-mcp-web-tinh-chinh.md) |
| 🧪 | MCP ít token | AI đọc primer + bản gọn (~8k token) là viết được flow có nhánh; cạnh dạng chữ `flow` ("n1>n2", "n2.fail>n5"), `read_script` dạng gọn, `get_step_types type=a,b,c` / `topic=debug`, test ngân sách chữ | [52](phase3/52-mcp-it-token.md) |
| 🧪 | MCP: annotations + nhật ký lệnh AI + chống injection | Mọi tool MCP có annotations (đọc / nguy hiểm) để client tự hỏi quyền đúng chỗ; nhật ký lệnh AI thêm thời lượng, client, tham số đã che; primer nhắc chữ từ màn hình / web là dữ liệu, không phải lệnh | [53](phase3/53-mcp-hoc-tu-openclaw.md) |
| 🧪 | Tên app Ghosthand | Đổi tên Auto Clicker → Ghosthand ở UI, exe, CLI, MCP; tự chuyển dữ liệu ở thư mục tên cũ một lần | [45](phase3/45-doi-ten-ghosthand.md) |
| 🧪 | Hình minh hoạ động cho node | Bảng Thêm node: chọn / rê một loại node thì hiện hoạt hoạ ngắn (SVG / CSS theo theme) diễn tả node làm gì, chữ là phụ; mọi loại node | [47](phase3/47-hinh-minh-hoa-node.md) |
| 🧪 | AI nhìn màn hình theo phần tử | Ảnh đánh số phần tử, cây giao diện rút gọn mọi app, so sánh trước / sau, gợi ý selector bền | [43 A](phase3/43-node-chuyen-sau.md) |
| 🧪 | AI bên trong flow | Node Hỏi AI (nhiều nhà cung cấp, cả AI chạy trên máy); gọi tool MCP khác ở node của 55 | [31d](phase3/31-mcp-ai.md) |

### Giao diện & nền tảng

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| 🧪 | Kiểm tra quyền trước khi chạy | Cài đặt → tab Quyền (Accessibility, Screen Recording, Automation Chrome / Finder / System Events, Thông báo…) + cảnh báo trên node và trước khi Chạy; Automation hỏi hệ điều hành không bật hộp thoại | [48](phase3/48-kiem-tra-quyen.md) |
| 🧪 | Cài đặt rộng hơn, thanh overlay đặt cạnh + co giãn theo màn, Lịch sử xem mọi output | Modal Cài đặt ~760px; Cài đặt chọn thanh overlay top / left / right / bottom, tự gọn theo cỡ màn; Lịch sử có chế độ Tất cả output + Chép | [49](phase3/49-cai-dat-overlay-lich-su.md) |
| 🧪 | Hướng dẫn sử dụng trong app (người + AI) | Modal Hướng dẫn: chương chung (cài đặt, quyền, chạy, biến, Cài đặt, chọn cách tìm) + trang từng node (ngữ cảnh, công nghệ, độ chính xác, hoạt hoạ, mẫu thử); JSON chung Go + TS, MCP `ghosthand://guide`; test bắt thiếu khi thêm node | [51](phase3/51-huong-dan.md) |
| ✅ | Giao diện v2, theme sáng / tối | Kiểu Windows 11; UI dựng sẵn cho tính năng *Sắp có* | [27](phase3/27-ui-v2.md), [27b](phase3/27b-ui-sap-co.md) |
| 🧪 | Giao diện v3 – gọn | Màu theo 7 nhóm node, thẻ node nhỏ (168), inspector thu gọn có tóm tắt, nút Chạy tách đôi + menu; theme tối giữ Slate | [38](phase3/38-ui-v3.md) |
| 🟡 | Đa màn hình / DPI | macOS xong (chờ kiểm tra tay 2 màn); Windows 125 % thử thật qua (chuột, chụp, ảnh mẫu), còn 100 % / 150 % / 2 màn | [17](phase1-mvp.md) |
| 🟡 | Bản Windows (.exe) | **18a**: GitHub Actions build exe mỗi lần push (tab Actions → Artifacts); OCR (Tesseract `vie`), phần tử màn hình (UIA), Cửa sổ đã có trên Windows; **còn** thử máy sạch (18b) | [18](phase1-mvp.md) |

## Tổng quan theo bước

> Bảng tự sinh – sau khi tick chạy `python3 scripts/tasks-index.py`. Bấm tên bước để mở file chi tiết.

<!-- index:start -->
**62 / 71 bước xong code** · 🧪 **[286 việc chờ bạn kiểm tra tay](checks.md)** · ✅ xong · 🧪 xong code, chờ kiểm tra tay · 🟡 đang làm · ⬜ chưa làm

### Phase 3 – Design v2 & tự động hoá (theo thứ tự làm)

| Trạng thái | Bước | Mục con xong | Kiểm tra tay |
|---|---|---|---|
| ✅ xong | [27. UI v2 cho các màn đang có + theme sáng / tối](phase3/27-ui-v2.md) | 18 / 18 |  |
| ✅ xong | [27b. Dựng sẵn UI cho tính năng chưa có](phase3/27b-ui-sap-co.md) | 13 / 13 |  |
| ✅ xong | [29. Neo điểm theo 4 góc vùng](phase3/29-neo-diem.md) | 10 / 10 |  |
| ✅ xong | [21. Lưu / tải kịch bản](phase3/21-luu-tai.md) | 8 / 8 |  |
| 🟡 đang làm | [30. Sửa nhiều điểm cùng lúc: di chuyển, co giãn, xoay, xiên](phase3/30-sua-nhieu-diem.md) | 9 / 10 | [1 việc](checks.md) |
| ✅ xong | [21b. Input của kịch bản](phase3/21b-input.md) | 13 / 13 |  |
| ✅ xong | [23. Cuộn + Mở URL / app](phase3/23-cuon-mo-url.md) | 8 / 8 |  |
| 🧪 chờ kiểm tra tay | [25. Chờ ảnh, click theo ảnh, chờ pixel](phase3/25-cho-anh.md) | 8 / 8 | [1 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [25e. Tìm theo chữ (OCR)](phase3/25e-ocr.md) | 7 / 7 | [3 việc](checks.md) |
| ✅ xong | [25b. Khi thất bại](phase3/25b-khi-that-bai.md) | 4 / 4 |  |
| 🧪 chờ kiểm tra tay | [20. Flow kiểu n8n – mỗi bước là một module, rẽ nhánh theo kết quả](phase3/20-flow.md) | 66 / 66 | [18 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [32. Tách `package main` ở root thành package trong `internal/`](phase3/32-go-packages.md) | 6 / 6 | [3 việc](checks.md) |
| 🟡 đang làm | [33. Danh sách kịch bản mẫu để test](phase3/33-mau-thu.md) | 8 / 10 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [25d. Web qua DOM – tìm phần tử bằng HTML, bấm bằng chuột thật](phase3/25d-web-dom.md) | 49 / 49 | [1 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [34. Thao tác giống người – di chuột, gõ, click, cuộn tự nhiên](phase3/34-giong-nguoi.md) | 7 / 7 | [5 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [35. Node nâng cao](phase3/35-node-nang-cao.md) | 9 / 9 | [9 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [38. UI v3 – gọn: màu theo nhóm node, thẻ node nhỏ, inspector thu gọn](phase3/38-ui-v3.md) | 11 / 11 | [7 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [37. Tìm / đọc phần tử màn hình qua Accessibility](phase3/37-phan-tu-man-hinh.md) | 11 / 11 | [5 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [26. Node Cửa sổ (`window`) + Ứng dụng (`app`)](phase3/26-cua-so-ung-dung.md) | 21 / 21 | [12 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [22. Hẹn giờ + thông báo + CLI / API local](phase3/22-hen-gio-cli-api.md) | 17 / 17 | [7 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [31b. MCP – vòng thử – sửa: AI tự chạy, xem lỗi, sửa, chạy tiếp](phase3/31-mcp-ai.md) | 23 / 23 | [15 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [31c. MCP – AI soạn bằng cách thử + ảnh mẫu](phase3/31-mcp-ai.md) | 5 / 5 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [31d. AI bên trong flow](phase3/31-mcp-ai.md) | 11 / 11 | [5 việc](checks.md) |
| ✅ xong | [41. Nơi lưu kịch bản / ảnh chụp + xoá lịch sử](phase3/41-noi-luu-lich-su.md) | 4 / 4 |  |
| 🧪 chờ kiểm tra tay | [44. Thử trang trên Chrome của app + ưu tiên node cho AI](phase3/44-thu-trang-uu-tien-node.md) | 9 / 9 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [45. Đổi tên app thành Ghosthand](phase3/45-doi-ten-ghosthand.md) | 5 / 5 | [5 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [46. MCP web – tinh chỉnh](phase3/46-mcp-web-tinh-chinh.md) | 11 / 11 | [13 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [47. Hình minh hoạ động cho từng node](phase3/47-hinh-minh-hoa-node.md) | 6 / 6 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [48. Kiểm tra quyền](phase3/48-kiem-tra-quyen.md) | 5 / 5 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [49. Chỉnh giao diện theo yêu cầu 2026-10-25](phase3/49-cai-dat-overlay-lich-su.md) | 4 / 4 | [4 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [50. Góp ý khi dùng node 2026-10-25](phase3/50-gop-y-dung-node.md) | 12 / 12 | [10 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [51. Hướng dẫn sử dụng](phase3/51-huong-dan.md) | 16 / 16 | [2 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [52. MCP ít token](phase3/52-mcp-it-token.md) | 6 / 6 | [2 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [53. MCP: annotations, nhật ký lệnh AI, chống prompt injection](phase3/53-mcp-hoc-tu-openclaw.md) | 6 / 6 | [2 việc](checks.md) |
| ⬜ chưa làm | [54. Đồng bộ cloud](phase3/54-dong-bo-cloud.md) | 0 / 11 |  |
| 🧪 chờ kiểm tra tay | [55. MCP client + node tuỳ chỉnh](phase3/55-mcp-client-node-tuy-chinh.md) | 10 / 10 | [6 việc](checks.md) |
| 🟡 đang làm | [56. Học từ MCP ngoài](phase3/56-hoc-tu-mcp-ngoai.md) | 3 / 13 | [2 việc](checks.md) |
| 🟡 đang làm | [57. AI chạy ổn định](phase3/57-ai-chay-on-dinh.md) | 7 / 10 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [58. Dấu hiệu đang điều khiển](phase3/58-dau-hieu-dang-dieu-khien.md) | 8 / 8 | [7 việc](checks.md) |
| 🟡 đang làm | [59. AI tự cập nhật + test](phase3/59-ai-tu-cap-nhat-va-test.md) | 6 / 7 | [1 việc](checks.md) |
| ✅ xong | [60. Dữ liệu qua node](phase3/60-du-lieu-qua-node.md) | 11 / 11 |  |
| 🧪 chờ kiểm tra tay | [61. Dùng AI gọn hơn](phase3/61-dung-ai-gon.md) | 5 / 5 | [8 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [42. Dữ liệu & luồng](phase3/42-du-lieu-luong.md) | 12 / 12 | [10 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [43. Node chuyên sâu](phase3/43-node-chuyen-sau.md) | 43 / 43 | [22 việc](checks.md) |
| 🟡 đang làm | [40. Nhận dạng chữ / ảnh tốt hơn](phase3/40-nhan-dang.md) | 11 / 12 |  |
| 🧪 chờ kiểm tra tay | [39. Gom kịch bản: nhóm node, nhúng kịch bản khác](phase3/39-gom-kich-ban.md) | 2 / 2 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [24. Ghi macro](phase3/24-ghi-macro.md) | 1 / 1 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [28. Mở rộng](phase3/28-mo-rong.md) | 5 / 5 | [3 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [36. Web qua Chrome của app – làm sau](phase3/36-chrome-app-sau.md) | 6 / 6 | [4 việc](checks.md) |

### Phase 0 – 2

| Trạng thái | Bước | Mục con xong | Kiểm tra tay |
|---|---|---|---|
| ✅ xong | [1. Cài môi trường](phase0.md) | – |  |
| ✅ xong | [2. Khởi tạo project](phase0.md) | – |  |
| ✅ xong | [3. Spike click](phase0.md) | 3 / 3 |  |
| ✅ xong | [4. Spike hotkey toàn cục](phase0.md) | 4 / 4 |  |
| ✅ xong | [5. Spike overlay](phase0.md) | 4 / 4 |  |
| ✅ xong | [6. Định nghĩa model](phase1-mvp.md) | – |  |
| ✅ xong | [7. Engine chạy bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [8. Pause / Resume / Stop](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [9. Dừng khẩn cấp](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [10. Chọn vùng](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [11. Chọn điểm](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [12. Marker & đường nối](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [13. Chọn điểm kéo thả](phase1-mvp.md) | 6 / 6 |  |
| ✅ xong | [13b. Dựng UI tĩnh từ bản thiết kế](phase1-mvp.md) | – |  |
| ✅ xong | [14. Danh sách bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [15. Form cấu hình bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [16. Cài đặt chạy](phase1-mvp.md) | 7 / 7 |  |
| 🟡 đang làm | [17. DPI & đa màn hình](phase1-mvp.md) | 9 / 10 | [4 việc](checks.md) |
| 🟡 đang làm | [18. Build & thử máy sạch](phase1-mvp.md) | 3 / 4 |  |
| ✅ xong | [19. Ngẫu nhiên hoá](phase2.md) | 5 / 5 |  |
| ✅ xong | [19b. Xem trước kịch bản](phase2.md) | 4 / 4 |  |
| ✅ xong | [19c. Xem / sửa riêng một bước trên overlay](phase2.md) | 3 / 3 |  |
<!-- index:end -->

## Các file

| File | Nội dung |
|---|---|
| [checks.md](checks.md) | **Cần kiểm tra tay** – việc đã xong code, chờ người dùng thử trong app |
| [decisions.md](decisions.md) | Quyết định đã chốt – không cần bàn lại |
| [overview.md](overview.md) | Stack, cài môi trường máy mới |
| [log.md](log.md) | Nhật ký (mỗi dòng: ngày, kết quả kiểm tra) |
| [phase0.md](phase0.md) · [phase1-mvp.md](phase1-mvp.md) · [phase2.md](phase2.md) | Bước 1–19c (còn 17 phần Windows, 18) |
| `phase3/<số>-<tên>.md` | Mỗi bước Phase 3 một file – thứ tự ở bảng dưới |

**Quy ước:** mục con xong là tick `[x]` ngay; mục cha tick khi hết phần code; việc *Kiểm tra tay* của bước đã xong code ghi ở [checks.md](checks.md) (file bước chỉ để link). Việc mới phát sinh thêm thành mục con trong file của bước. Bước mới → file mới `phase3/<số>-<tên>.md` + một dòng trong bảng dưới.

## Phase 3 – Design v2 & tự động hoá

> Thiết kế: **`design/DESIGN.md`** (token, thành phần, icon, map artboard → file), `design/theme.css` (token Tailwind v4), artboard trên canvas https://claude.ai/artifact/5WdDyFZdB3WKxEXwkticnw. Mỗi việc UI dưới đây ghi artboard tương ứng trong ngoặc vuông.
> Số bước giữ nguyên để khớp nhật ký nên không theo thứ tự số; **làm theo thứ tự từ trên xuống**. Xong 26 là chạy được ví dụ Facebook (cuối phase).

**Thứ tự làm** (từ trên xuống, giống danh sách bên dưới):

| # | Bước | Vì sao ở vị trí này |
|---|---|---|
| 1 | [27. UI v2 cho màn đang có](phase3/27-ui-v2.md) | Người dùng muốn làm giao diện trước; nền cho mọi màn sau |
| 2 | [27b. Khung UI tính năng chưa có](phase3/27b-ui-sap-co.md) | Dựng hết UI theo design một lần cho đồng bộ; bước sau chỉ nối logic |
| 3 | [29. Neo 4 góc](phase3/29-neo-diem.md) | Sửa toạ độ lệch khi đổi vùng; đổi model `Point` nên làm trước khi có file lưu (21) |
| 4 | [21. Lưu / tải](phase3/21-luu-tai.md) | App chưa lưu được gì – tắt là mất kịch bản |
| 5 | [30. Sửa nhiều điểm](phase3/30-sua-nhieu-diem.md) | Dựa vào neo (29) + UI mới (27); có kịch bản lưu được (21) mới đáng đầu tư chỉnh sửa hàng loạt; kèm hoàn tác / làm lại |
| 6 | [21b. Input](phase3/21b-input.md) | Cần 21 (preset theo từng kịch bản); mở đường cho chuỗi web / app (23, 25) |
| 7–8 | [23](phase3/23-cuon-mo-url.md) → [25](phase3/25-cho-anh.md) | Cuộn / mở URL đơn giản, rồi chờ ảnh – cốt lõi tương tác web / app |
| 9 | [25e. Tìm theo chữ (OCR)](phase3/25e-ocr.md) | Xong 2026-10-17 – tìm ảnh chưa đủ chính xác |
| 10 | [25b. Khi thất bại](phase3/25b-khi-that-bai.md) | Xong 2026-10-17; 20 thay *bỏ qua / nhảy tới* bằng cạnh `fail`, giữ phần thử lại |
| 11 | [20. Flow kiểu n8n (F0–F5, rồi F5b–F7 sau 25d)](phase3/20-flow.md) | Người dùng cần luồng thành công / thất bại, if / else, switch (2026-10-17); đổi model lớn nên làm trước các loại bước mới (26, 25d); gồm luôn debug + lịch sử chạy (thay 25c) |
| 11b | [32. Tách Go thành package](phase3/32-go-packages.md) | Người dùng chọn (2026-10-18): làm đầu tuần sau, trước F5b – 49 file `package main` ở root không có ranh giới; MCP / API (22, 31) cần dùng lại engine không qua Wails |
| 11b2 | [33. Kịch bản mẫu để test](phase3/33-mau-thu.md) | Người dùng yêu cầu (2026-10-18): làm trước 25d D1 – có mẫu cho mỗi loại bước + sân thử cục bộ để test tay nhanh; bước mới sau này đều thêm mẫu |
| 11c | [25d. Web qua DOM](phase3/25d-web-dom.md) | Người dùng ưu tiên (2026-10-18): web phải chạy chính xác – làm ngay sau 32, chia D0–D4 (đo toạ độ trước); focus bằng CDP `Page.bringToFront` nên không chờ 26. Người dùng yêu cầu (2026-10-17): web bền hơn ảnh mẫu; cần cổng `fail` (20); làm trước MCP vì AI dùng DOM tốt hơn ảnh chụp |
| 11d | [34. Thao tác giống người](phase3/34-giong-nguoi.md) | Người dùng chọn (2026-10-18): sau 20 F5b + F5c – chuột nhảy thẳng là dấu hiệu bot rõ nhất, web (25d) cần nhất |
| 11e | [35. Node nâng cao](phase3/35-node-nang-cao.md) | Người dùng yêu cầu (2026-10-18): sau 34, trước 26 – ít node nền (chụp màn hình, clipboard, HTTP trước) + kịch bản mẫu; node mới dùng output chuẩn F5c |
| 11f | [38. UI v3 – gọn](phase3/38-ui-v3.md) | Người dùng yêu cầu (2026-10-19): làm trước 37 E3 (E3 thêm UI vào inspector – dựng luôn theo kiểu mới); màu theo nhóm node, thẻ node 168, inspector thu gọn, nút Chạy tách đôi; theme tối giữ Slate |
| 11g | [37. Phần tử màn hình qua Accessibility](phase3/37-phan-tu-man-hinh.md) | Người dùng yêu cầu (2026-10-18): sau 35, trước 20 F6 – đọc giá trị web ở Chrome thường đã đăng nhập (không CDP, tránh captcha của 36) + app khác; đã thử chạy trên macOS; phần Windows UIA làm cùng 17–18 |
| 12 | [26. Cửa sổ + Ứng dụng](phase3/26-cua-so-ung-dung.md) | Xong 26 là chạy được ví dụ Facebook. Người dùng mở rộng (2026-10-19): `focusWindow` → node Cửa sổ + node Ứng dụng – cố định app / cửa sổ (vị trí, cỡ) trước khi thao tác |
| 14 | [22. Hẹn giờ / CLI / API local](phase3/22-hen-gio-cli-api.md) | Chạy không cần ngồi canh; dựng server HTTP + token mà MCP dùng lại |
| 15–17 | [31a → 31b → 31c → 31d. MCP cho AI](phase3/31-mcp-ai.md) | Người dùng chọn làm sau (2026-10-17); các bước trước đã có mục *Chuẩn bị cho MCP* nên lúc này chủ yếu là bọc hàm Go sẵn có thành tool. 31d (AI trong flow) chỉ làm khi 31a–c dùng ổn (2026-10-18) |
| 16a | [41. Nơi lưu + xoá lịch sử](phase3/41-noi-luu-lich-su.md) | Người dùng yêu cầu (2026-10-20): làm ngay, trước 40 O0–O3 (cần máy Windows) – việc nhỏ, làm trên Mac được; thư mục lưu tự chọn, xoá lịch sử |
| 16a1 | [44. Thử trang + ưu tiên node cho AI](phase3/44-thu-trang-uu-tien-node.md) | Người dùng yêu cầu (2026-10-21): làm ngay, trước 42 – việc nhỏ dùng lại Chrome của app + `PageOutline` (25d); AI biết trang nào dùng được node web. Không đổi 36: chỉ thử trang không cần đăng nhập |
| 16a1b | [45. Đổi tên thành Ghosthand](phase3/45-doi-ten-ghosthand.md) | Người dùng yêu cầu (2026-10-21): làm ngay sau 44, trước 42 – đổi tên máy móc, càng để lâu càng nhiều chỗ; xong trước khi phát hành cho người khác |
| 16a1c | [46. MCP web – tinh chỉnh](phase3/46-mcp-web-tinh-chinh.md) | Người dùng yêu cầu (2026-10-21): góp ý khi dùng MCP thật trên GoERP – đợt A (toạ độ, read_web_outline, webType bớt chặt, ghim tab ID) làm trước 42 vì đang chặn việc dùng; đợt B/C sau |
| 16a1d | [47. Hình minh hoạ động cho node](phase3/47-hinh-minh-hoa-node.md) | Người dùng yêu cầu (2026-10-21): người mới nhìn hình hiểu node ngay, không cần đọc chữ; chưa xếp trước 42 / 43 – chờ người dùng chọn lúc làm |
| 16a1e | [48. Kiểm tra quyền trước khi chạy](phase3/48-kiem-tra-quyen.md) | Người dùng yêu cầu (2026-10-24): biết thiếu quyền trước khi chạy; chưa xếp trước 42 / 43 – chờ người dùng chọn lúc làm |
| 16a1f | [49. Cài đặt, thanh overlay, lịch sử output](phase3/49-cai-dat-overlay-lich-su.md) | Người dùng yêu cầu (2026-10-25); chưa xếp thứ tự – chờ người dùng chọn lúc làm |
| 16a1g | [50. Góp ý khi dùng node](phase3/50-gop-y-dung-node.md) | Người dùng yêu cầu (2026-10-25): sửa UI tràn + log Accessibility, nút chọn file mọi nơi, output dạng bảng, cửa sổ macOS, vẽ đường trên overlay, dán curl, chọn tiến trình – làm ngay, nhóm A → E |
| 16a1h | [51. Hướng dẫn sử dụng](phase3/51-huong-dan.md) | Người dùng yêu cầu (2026-10-25): modal hướng dẫn cho người + AI, 3 đợt H1 → H3, giữ đồng bộ bằng test + check-docs |
| 16a1i | [52. MCP ít token](phase3/52-mcp-it-token.md) | Người dùng yêu cầu (2026-10-27): AI nối MCP hiểu nhanh, tạo flow chuẩn, ít token; làm ngay (chỉ Go + tài liệu, không đổi định dạng file) |
| 16a1j | [53. MCP: annotations, nhật ký lệnh AI, chống injection](phase3/53-mcp-hoc-tu-openclaw.md) | Người dùng yêu cầu (2026-10-27, sau khi đọc repo openclaw-direct-tools-for-chatgpt): việc nhỏ chỉ đụng `mcpsrv` + Cài đặt MCP, làm ngay sau 52; mục D (timeout node Đi tới URL) chờ người dùng chốt |
| 16a1k | [54. Đồng bộ cloud](phase3/54-dong-bo-cloud.md) | Người dùng yêu cầu (2026-10-28): đăng nhập Google rồi đồng bộ kịch bản + ảnh mẫu + cài đặt + bí mật lên Drive (có đường MCP); chưa xếp thứ tự – chờ người dùng chọn lúc làm |
| 16a1l | [55. MCP client + node tuỳ chỉnh](phase3/55-mcp-client-node-tuy-chinh.md) | Người dùng yêu cầu (2026-10-28): app kết nối MCP server khác (stdio, từ xa, thư viện gợi ý), tạo node tuỳ chỉnh từ tool; thay mục *Gọi tool MCP* của 31d; chưa xếp thứ tự |
| 16a1m | [56. Học từ MCP ngoài](phase3/56-hoc-tu-mcp-ngoai.md) | Người dùng yêu cầu (2026-10-28): đưa gợi ý từ `docs/hoc-tu-mcp-ngoai.md` vào plan – đợt A an toàn trước; chưa xếp thứ tự |
| 16a1n | [57. AI chạy ổn định](phase3/57-ai-chay-on-dinh.md) | Người dùng yêu cầu (2026-11-01, sau lần AI nhắn tin Messenger qua MCP): đợt 1 (lỗi nhận nhầm cửa sổ trước, `focus` / `keys` chuỗi) làm trước, đợt 2 cùng 58 |
| 16a1o | [58. Dấu hiệu đang điều khiển](phase3/58-dau-hieu-dang-dieu-khien.md) | Người dùng yêu cầu (2026-11-01): viền sáng + thanh mini rõ trạng thái; làm cùng 57 đợt 2 |
| 16a1p | [59. AI tự cập nhật + test](phase3/59-ai-tu-cap-nhat-va-test.md) | Người dùng yêu cầu (2026-11-01): vòng dev → cài bản local → test qua MCP (U1–U4, U6) trước, `update_app` qua Release sau |
| 16a1q | [60. Dữ liệu qua node](phase3/60-du-lieu-qua-node.md) | Người dùng yêu cầu (2026-11-02), đã duyệt design bản 3: V0 (lưu input lúc chạy) + V1–V2 trước, rồi thẻ / kéo nối (V3–V5), cây lần chạy (V6–V7) |
| 16a1r | [61. Dùng AI gọn hơn](phase3/61-dung-ai-gon.md) | Người dùng yêu cầu (2026-11-03, sau khi AI tự thử ~90 mẫu): M1 (trạng thái đầu phiên ngắn – rẻ, lợi ngay) trước, rồi M4, M2, M3, M5 |
| 16a2 | [42. Dữ liệu & luồng](phase3/42-du-lieu-luong.md) | Người dùng yêu cầu (2026-10-20): ngay sau 41 – chờ màn hình đứng yên thay Chờ cố định, lặp qua danh sách + tìm tất cả, tính toán / xử lý chữ; làm trên Mac được |
| 16a3 | [43. Node chuyên sâu](phase3/43-node-chuyen-sau.md) | Người dùng yêu cầu (2026-10-20): sau 42, xen kẽ 40 O0–O3 (máy Windows) – trình duyệt Chromium thường không CDP, phần tử app không cần chuột, hệ điều hành, ảnh đánh số / cây giao diện cho AI trước 31c; mỗi việc một node |
| 16b | [40. Nhận dạng chữ / ảnh tốt hơn](phase3/40-nhan-dang.md) | Người dùng yêu cầu (2026-10-20): làm sau 31b, trước 31c – Windows chưa đọc được tiếng Việt (`Windows.Media.Ocr`); 31c (AI soạn bằng cách thử, ảnh mẫu) cần đọc chữ / tìm ảnh đáng tin |
| 17b | [39. Gom kịch bản](phase3/39-gom-kich-ban.md) | Người dùng yêu cầu (2026-10-19): ưu tiên vừa – sau các bước quan trọng; gom đoạn hay vào kịch bản lớn. Khung nhóm + nhúng phẳng trước (engine không đổi), group khoá để dành |
| 18–19 | [24](phase3/24-ghi-macro.md) → [28](phase3/28-mo-rong.md) | Ghi macro, mở rộng |
| 20 | [36. Web qua Chrome của app – làm sau](phase3/36-chrome-app-sau.md) | Người dùng chốt (2026-10-18): đăng nhập Google / Facebook trong Chrome của app bị captcha, chế độ điều khiển quá rủi ro cho tài khoản thật – dời mọi việc qua Chrome của app xuống cuối, tìm cách sau |
| – | [17 (Windows), 18](phase1-mvp.md) | **18a** (build exe qua GitHub Actions) làm trước – người dùng yêu cầu 2026-10-19, không cần máy Windows; phần còn lại làm trên máy Windows (có từ 2026-10-19 – [windows-dev.md](../windows-dev.md)); riêng *Kiểm tra tay macOS* của 17 làm lúc nào cũng được |
