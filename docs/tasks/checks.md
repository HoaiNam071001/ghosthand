# Cần kiểm tra tay

Những việc **đã xong code** nhưng cần người dùng thử trong app thật (`wails dev`). Mới nhất ở trên.
Thử xong: tick `[x]` ở đây, ghi kết quả vào [log.md](log.md); lỗi thì báo để sửa (thêm mục con trong file của bước).

## Thêm – thanh mini thường, overlay chọn app
- [ ] macOS: chạy kịch bản → thanh mini không đè lên app đang điều khiển / app toàn màn hình; ảnh chụp có cả cửa sổ app
- [ ] macOS: mở overlay → nút *Ứng dụng* → chọn app đang toàn màn hình → overlay phủ lên app đó, chọn vùng được

## Thêm – kéo node thả lên node khác để nối nhanh
- [ ] Giữ Ctrl / Cmd, kéo node A thả lên node B → nối cổng thành công A → B, A về chỗ cũ; Option thay Ctrl → cổng thất bại; node switch giữ Ctrl + F2 → nối case thứ 2; kéo không giữ phím → chỉ dời node như cũ

## 52 – MCP ít token · [52](phase3/52-mcp-it-token.md)
- [ ] Claude Desktop / Code nối MCP, nhờ tạo kịch bản có rẽ nhánh (vd chờ chữ, không thấy thì cuộn thử lại 5 lần): AI gọi `get_step_types compact=true` rồi `type=a,b,c` (không gọi bản đầy đủ), gửi cạnh bằng `flow`, `validate_script` ok, mở trên app đúng nhánh
- [ ] Nhờ AI sửa kịch bản đó (vd đổi số lần thử, thêm node): AI `read_script` (dạng gọn) → `update_script` chỉ gửi phần đổi; kịch bản trên app giữ nguyên vị trí thẻ node

## Thêm – nút Xoá nhóm trên khung nhóm node
- [ ] Khung nhóm (mở và thu gọn) có nút thùng rác cạnh nút Bỏ nhóm → bấm: khung + mọi node trong đó + cạnh nối biến mất; Ctrl+Z một lần khôi phục đủ

## Sửa – đặt nhiều điểm trên overlay không tự nối thành chuỗi
- [ ] Flow có sẵn vài node → nút Chọn vùng (hoặc Ctrl+K khi không chọn node) → công cụ Điểm, click 3 chỗ → về flow: 3 node click mới nối tiếp nhau theo thứ tự click, nối sau node cuối của flow; flow rỗng thì node đầu thành bắt đầu

## Sửa – overlay chọn vùng lệch khi rê chuột, không phủ thanh menu, thanh công cụ nhấp nháy
- [ ] macOS: mở Chọn vùng / Xem trước → lớp mờ phủ trọn màn kể cả thanh menu + Dock; rê chuột khắp màn, dừng nhiều chỗ: khung vùng, marker, nền xem trước đứng yên (không nhích)
- [ ] Đặt điểm trên vùng thanh menu (toàn màn hình) → nhận điểm, không báo "nằm ngoài vùng"; click thử điểm đó trúng chỗ
- [ ] Kéo vùng nhỏ → chỉ khung nét đứt, lớp mờ không đổi; 2 màn hình: chọn màn kia → overlay phủ trọn màn đó, điểm đặt ở màn đó click trúng
- [ ] Thanh công cụ (thử cạnh Trên + Trái): rê sát mép → hiện, rê vào gợi ý / thanh / nút → không nhấp nháy, rời ra xa → ẩn sau ~0,35 s
- [ ] Windows 125 % (taskbar dưới và thử taskbar trên): điểm đặt click trúng; dòng *Toạ độ: tỷ lệ 1.25 · gốc …* góc trái trên

## 46 – C2 chỉ thao tác trong cửa sổ · [phase3/46-mcp-web-tinh-chinh.md](phase3/46-mcp-web-tinh-chinh.md)
- [ ] Mẫu *chi-trong-cua-so*: chạy xong báo đã gõ Tab vào “Bảng click – Sân thử”; đổi tiêu đề trong node phím thành tên không có → lỗi `window_mismatch` “không thấy cửa sổ…”, không có phím nào được gõ
- [ ] Che cửa sổ Bảng click bằng app khác (bấm sang app khác ngay sau node Mở) → node phím báo “không ở trước (đang ở trước: …)”; thêm node Cửa sổ focus trước node phím thì chạy qua
- [ ] Inspector node Click / Gõ / Phím có công tắc *Chỉ trong cửa sổ*, bật thì hiện App / Tiêu đề / So khớp; bật mà để trống → Chạy báo lỗi “chưa chọn cửa sổ”

## 46 – C1 đánh dấu node ghi / xoá · [phase3/46-mcp-web-tinh-chinh.md](phase3/46-mcp-web-tinh-chinh.md)
- [ ] Inspector mọi node (trừ Chờ): công tắc *Ghi / xoá dữ liệu*; bật trên một node Click rồi Chạy → hộp xác nhận liệt kê “Node nX (Click) – bạn đã đánh dấu…”; Đồng ý thì chạy, lần sau không hỏi; đổi tên node không hỏi lại, bật thêm node khác thì hỏi lại
- [ ] AI (`run_script`) hoặc hẹn giờ chạy kịch bản có node đánh dấu khi chưa đồng ý → báo cần xác nhận trong app, không click

## 51 – Hướng dẫn sử dụng · đợt H1 (khung modal + chương chung) · [phase3/51-huong-dan.md](phase3/51-huong-dan.md)
- [ ] Nút **?** trên thanh tiêu đề và phím **F1** mở modal Hướng dẫn; Esc / ✕ / bấm ra ngoài đóng; mở lại vẫn ở trang vừa xem
- [ ] Ô tìm không dấu: gõ `quyen`, `dung khan cap`, `ocr` ra đúng chương / node; link trong bài (tên node, tên chương) chuyển trang, nút ← quay lại trang trước
- [ ] Ctrl/Cmd+K → rê một mục → *Xem hướng dẫn →* mở đúng trang node; inspector → ⓘ → *Xem hướng dẫn →* (thử cả Click theo chữ / phần tử)
- [ ] *Mở mẫu thử* trong chương (vd Bắt đầu nhanh → click-theo-chu): kịch bản đang có thay đổi thì hỏi lưu, rồi mẫu hiện trên canvas, modal đóng
- [ ] Đọc nội dung các chương *Bắt đầu nhanh*, *Quyền*, *Chọn cách tìm* – chỗ nào sai với app thật / khó hiểu thì báo; xem cả theme sáng + tối
- [ ] (H3) AI qua MCP: resource `ghosthand://manual` đọc được; tool `get_node_guide type=clickText` trả công nghệ / độ chính xác / mẹo; type lạ báo lỗi rõ

## 43 – Node chuyên sâu · Trình duyệt trên Windows (B1w–B3w) · [phase3/43-node-chuyen-sau.md](phase3/43-node-chuyen-sau.md)
- [ ] Windows + Chrome mở sẵn vài tab: node *Tab trình duyệt* `list` ra đủ tab đúng thứ tự, tiêu đề không còn đuôi "– Mức sử dụng bộ nhớ"; chỉ tab đang hiện có URL; *Chuyển tới tab* theo tiêu đề đưa đúng tab + cửa sổ lên trước
- [ ] Mẫu *tab-trinh-duyet*: node Mở mở trang → *Đóng tab do node Mở tạo* đóng đúng tab đó (không đóng tab khác), *Đi tới URL* sang trang Gõ chữ và chờ tải xong (đo thời gian output `ms`)
- [ ] Mẫu *chuan-hoa-trinh-duyet*: bấm F11 trước → chạy: thoát toàn màn hình, cửa sổ về đúng cỡ đặt, Ctrl+0 đưa zoom về 100 %
- [ ] Thử thêm Edge / Brave / Cốc Cốc (nếu có): chọn trình duyệt trong node, mở / liệt kê / đóng tab như Chrome
- [ ] Cửa sổ Chrome ẩn danh / nhiều cửa sổ / 2 màn hình: tab liệt kê đủ, cửa sổ ở trước nhất đứng đầu

## 50 – Góp ý khi dùng node: nút chọn file, bảng output, cửa sổ macOS, vẽ đường… · [phase3/50-gop-y-dung-node.md](phase3/50-gop-y-dung-node.md)
- [ ] Node *Số & ngày* và *Làm sạch chữ*: hẹp inspector → nút *Lấy số / Định dạng số / Ngày giờ* và *Hoa / thường* xuống hàng, không tràn; *Định dạng số* / *Ngày giờ* không bị nhãn đè lên ô
- [ ] Node *Thao tác phần tử* (app / Chrome thường) tìm phần tử không có → Nhật ký → bấm dòng lỗi: hộp *App đã đọc N phần tử* liệt kê tên + vai trò; đối chiếu với Accessibility Inspector xem phần tử bạn thấy có trong danh sách không; nút chép dán ra được
- [ ] Nút *Chọn…* có ở: Tệp / thư mục, Nén / giải nén (nén: *File…* + *Thư mục…*), Chạy lệnh (thư mục chạy), Lưu PDF, Chờ tải xong, Chụp màn hình (thư mục), Clipboard (file ảnh), Đọc bảng (ghi ra file); chọn xong ô điền đường dẫn, gõ tay / chèn `{{biến}}` vẫn được; mở hộp thoại ở đúng thư mục đang nhập
- [ ] Inspector → *Lần chạy gần nhất*, Nhật ký, tab *Tất cả output*: output hiện bảng Nhãn · Biến · Giá trị; nút chép JSON dán ra đúng
- [ ] Thêm node (Ctrl+K): *Lưu trang PDF / Shortcuts* có nhãn *Chỉ macOS* (Tab trình duyệt / Đi tới URL / Chuẩn hoá trình duyệt đã chạy được trên Windows – 43 B1w); trên Windows các mục này mờ + dòng cảnh báo ở khung mô tả. Chỉ còn một mục *Click theo ảnh / chữ / phần tử*, đổi cách tìm bằng ô *Tìm theo*
- [ ] **macOS – node Cửa sổ / Ứng dụng**: mở Chrome + Notes; node Cửa sổ chọn app → Focus đưa lên trước; Đặt khung (Trái / Giữa / Đầy) đúng chỗ; Thu nhỏ rồi Khôi phục; Đóng (app hỏi lưu thì không tự bấm); node Ứng dụng: Đang chạy / Chờ thoát / Thoát. Cần quyền Accessibility; Chrome có cửa sổ thu nhỏ vẫn liệt kê
- [ ] Vẽ đường → *Vẽ trên màn hình…*: overlay mở, kéo một nét cong dài, thả chuột → về app, node có các điểm theo nét (≤ 80), chạy node vẽ lại đúng nét; kéo nét quá ngắn → ở lại overlay báo; Esc huỷ
- [ ] HTTP → *Dán lệnh curl…*: dán lệnh *Copy as cURL* của Chrome (có `-H`, `-b`, `--data-raw`) → method, URL (query tách vào bảng Tham số), header, body JSON điền đủ; dán `curl -u user:pass` có header Authorization Basic
- [ ] Tiến trình → *Chọn…*: danh sách tiến trình (CPU / RAM), lọc không dấu; chọn → tên điền, *So khớp* = Đúng
- [ ] Shortcuts → khung giải thích ở đầu form dễ hiểu (đọc thử với người chưa biết app Phím tắt); danh sách Shortcut trong máy hiện ở ô chọn

## 49 – Cài đặt rộng, thanh overlay đặt cạnh + co giãn, Lịch sử xem mọi output · [phase3/49-cai-dat-overlay-lich-su.md](phase3/49-cai-dat-overlay-lich-su.md)
- [ ] Mở Cài đặt: hộp thoại rộng (~760px), cao cố định, đổi qua lại các tab không nhảy cỡ; tab MCP / Quyền không tràn
- [ ] Cài đặt → Chọn vùng: chọn Trái → mở Chọn vùng: thanh xếp dọc giữa cạnh trái, hiện khi chuột sát cạnh trái, ẩn khi rời; thử Phải / Dưới / Trên (Dưới có thể bị Dock che)
- [ ] Có 2 màn hình: mở overlay ở màn to rồi bấm chọn màn nhỏ hơn → thanh tự gọn (ẩn nhãn, chỉ icon, có tooltip), không bị che / tràn; quay lại màn to → hiện lại nhãn. Thử cả Xem trước, Sửa điểm, xem riêng một node
- [ ] Chạy một kịch bản có node đọc chữ / HTTP… → Thư viện → Lịch sử chạy (hoặc Nhật ký dưới canvas) → tab *Tất cả output*: thấy output mọi node, nhiều vòng có "vòng N"; nút chép từng node / tất cả dán ra JSON đúng; biến bí mật vẫn bị che

## 24 – Ghi macro · [phase3/24-ghi-macro.md](phase3/24-ghi-macro.md)
- [ ] Menu Chạy ▾ → *Ghi thao tác*: app thành thanh mini *Đang ghi thao tác* (chấm đỏ nhấp nháy, giờ chạy); click vài chỗ, kéo một đoạn, cuộn, gõ chữ, bấm Enter, Ctrl/⌘+C rồi bấm *Dừng ghi* trên thanh mini (hoặc F9, macOS: fn+F9) → app hiện lại, có khung *Ghi hh:mm:ss* với đúng các node; nối vào flow rồi Chạy lại → thao tác lặp lại đúng chỗ, nhịp nghỉ gần như lúc ghi
- [ ] Dừng bằng nút *Dừng ghi*: khung ghi không có node click thừa ở chỗ nút Dừng; ghi Shift+1 ra node Phím `1` kèm shift
- [ ] Cuộn lăn xuống ra node hướng *down* (không ngược); click đôi nhanh ra một node *Số lần = 2*; ghi trên kịch bản có vùng riêng → click vẫn đúng chỗ; macOS: cấp quyền Accessibility / Input Monitoring nếu không ghi được

## 39 – Gom kịch bản: khung nhóm node (G1) + nhúng kịch bản (G2) · [phase3/39-gom-kich-ban.md](phase3/39-gom-kich-ban.md)
- [ ] Mở mẫu *Nhóm node*: thấy khung “Chuẩn bị” bao 3 node giữa; kéo thanh tên khung → cả 3 node dời theo, thả ra vẫn đúng chỗ (⌘Z hoàn tác được)
- [ ] Nút thu gọn trên khung → thành một thẻ, cạnh vào / ra nối vào thẻ; mở rộng lại về như cũ; kéo thẻ thu gọn → các node dời theo
- [ ] Bấm đúp tên đổi tên (Enter lưu, Esc huỷ); Shift + click 2 node → nút *Nhóm lại* (Ctrl/⌘+G) tạo khung mới; *Bỏ nhóm* → node giữ chỗ
- [ ] Xoá một node trong nhóm → khung co lại; xoá hết node → khung biến mất; lưu rồi mở lại kịch bản vẫn còn khung; Chạy kịch bản như cũ (nhóm không ảnh hưởng)
- [ ] Nút *Nhúng kịch bản* (dòng đầu canvas) → *Từ file…* chọn một kịch bản đã lưu, hoặc một mẫu trong danh sách: xuất hiện khung mới tên theo kịch bản, nằm dưới các node cũ; chưa nối vào flow nên nối cổng của node cũ vào node đầu khung rồi Chạy
- [ ] Nhúng kịch bản có vùng khác (hoặc toàn màn) vào kịch bản có vùng khác: click rơi đúng chỗ như khi chạy kịch bản gốc; biến `{{n2.output…}}` trong đoạn nhúng vẫn chạy đúng dù mã node bị đổi; input trùng tên khác kiểu → hiện thông báo đổi tên (key_2), form Chạy hỏi cả hai

## 48 – Kiểm tra quyền trước khi chạy (P1–P5) · [phase3/48-kiem-tra-quyen.md](phase3/48-kiem-tra-quyen.md)

- [ ] Cài đặt → tab Quyền (macOS): Trợ năng / Ghi màn hình / Tự động hoá Chrome · Finder · System Events hiện đúng trạng thái so với System Settings; mở tab không bật hộp thoại nào của hệ điều hành
- [ ] Bấm *Cấp quyền* ở Tự động hoá Chrome (Chrome đang mở) → macOS hỏi → Cho phép → dòng đổi sang ✓; bấm *Mở System Settings* mở đúng mục Privacy; bật/tắt ở đó rồi quay lại app → tự cập nhật không cần bấm
- [ ] Mở kịch bản có node Chụp màn hình / Tab trình duyệt: quyền tương ứng nằm đầu danh sách kèm nhãn “kịch bản này dùng”
- [ ] Tắt quyền Ghi màn hình (System Settings) rồi mở kịch bản có node Chụp màn hình: thẻ node có dấu ! (tooltip “Thiếu quyền…”), inspector có dòng cảnh báo + nút *Mở Cài đặt → Quyền* nhảy đúng tab; bấm Chạy / F8 → hộp thoại liệt kê quyền thiếu, *Vẫn chạy* chạy tiếp, *Mở Cài đặt* mở tab Quyền, Esc huỷ
- [ ] Tắt quyền Ghi màn hình rồi chạy node Chụp màn hình: nhật ký lỗi `permission` có nút *Mở Cài đặt → Quyền*, bấm vào thì tab Quyền mở với mục Ghi màn hình nằm đầu, có viền nổi
- [ ] Cấp lại quyền, quay về app → dấu ! và dòng cảnh báo tự biến mất, Chạy không hỏi nữa

## 31c – MCP: ảnh mẫu AI tự khoanh · [phase3/31-mcp-ai.md](phase3/31-mcp-ai.md)

- [ ] Trên Claude Code: `screenshot` một trang → `capture_template` khoanh một nút → `find_image` báo `found` + `center` đúng nút → `create_script` với `clickImage` có `"template": "tpl:1"`; mở kịch bản thấy node có ảnh mẫu thật (không còn chữ `tpl:`) và chạy click đúng nút (thử cả Retina)
- [ ] Ghim output: chạy kịch bản có node Đọc chữ / HTTP, chuột phải node → *Ghim output* → thẻ hiện icon ghim; chạy lại: node đó không chạy (nhật ký ghi “node đã ghim”), node sau vẫn nhận biến `{{nX.output…}}` đã ghim; *Bỏ ghim* thì chạy thật; đóng / mở lại app ghim vẫn còn, file kịch bản (.json) không có dữ liệu ghim
- [ ] Chuột phải node: *Chạy đến n3* dừng sau n3; Shift + click chọn 3 node → *Chạy cụm đã chọn* chỉ chạy 3 node đó; sau một lần chạy lỗi ở n3, sửa rồi *Chạy tiếp từ n3* không chạy lại n1–n2
- [ ] `run_step` trên Claude Code (mức Hỏi hoặc Tự chạy): nhờ AI “mở Notepad, gõ chào bạn” bằng từng run_step → mỗi node chạy thật đúng một lần (Notepad không mở lại ở node 2), ảnh sau từng node; `draft save` tạo kịch bản + thư mục ảnh các bước, chạy lại kịch bản không cần AI
- [ ] Chấm đỏ: AI gọi screenshot / describe_screen lúc thanh mini đang hiện → chấm đỏ nhấp nháy ~3 s cạnh tiêu đề; Cài đặt → AI chạy kịch bản → tắt “Chấm đỏ…” thì không hiện
- [ ] `simulate_script` trên Claude Code với một kịch bản có Nếu + click: không có chuột / phím nào chạy thật; `outcomes` đổi nhánh Nếu / click thất bại; node không tới nằm trong `unvisited`
- [ ] `get_mouse_position` trả đúng chỗ chuột đang đứng; `list_windows` khớp cửa sổ đang mở

## 43 – Node chuyên sâu (S7 Màn hình / âm thanh, S3 Nguồn, S6b Bật / tắt tiếng Việt, S10 Kho bí mật, S9 Thông báo, S8 Nén / giải nén, S6 Bộ gõ, S5 Tiến trình, S4 Thông tin máy, S2 Shortcuts, S1 Chạy lệnh, E3 Đọc tài liệu, E2 Chờ sự kiện giao diện, E1 Thao tác phần tử, B1 Tab trình duyệt, B2 Đi tới URL, B3 Chuẩn hoá – macOS, B4 Đọc chữ trang, B5 Đọc bảng, B6 Chờ tải xong, B7 Lưu PDF) · [phase3/43-node-chuyen-sau.md](phase3/43-node-chuyen-sau.md)

- [ ] (S7) Mẫu thử *Màn hình / âm thanh*: giao diện macOS đổi sáng ↔ tối rồi về như cũ, nghe tiếng Glass, lời kết đúng loa / micro / độ sáng. Thử thêm node *Đổi loa mặc định* sang tai nghe / loa khác thật (Cài đặt hệ thống → Âm thanh đổi theo) và *Độ sáng màn hình* 50 trên laptop; màn ngoài báo lỗi rõ. Windows: đổi sáng / tối, độ sáng laptop, đổi loa / micro (IPolicyConfig), phát .wav – chưa thử
- [ ] (S3) Mẫu thử *Nguồn*: màn hình tắt sau 5 s (chạm chuột bật lại); thanh mini hiện đếm ngược, bấm Dừng trước 5 s thì màn hình không tắt. Trong lúc chạy `pmset -g assertions` thấy caffeinate (*Giữ máy thức*). Thử riêng *Khoá màn hình* (macOS cần quyền Accessibility), *Cho máy ngủ* với đếm ngược 5 s (hộp xác nhận hiện đúng hành động; chưa đồng ý thì Chạy từ hẹn giờ / AI bị chặn). Đừng thử shutdown / restart khi còn việc chưa lưu. Windows: tất cả chưa thử
- [ ] (S6b) Node Bộ gõ *Bật / tắt tiếng Việt* với Unikey / EVKey / OpenKey thật: bấm một lần thì chế độ gõ đảo (biểu tượng V ↔ E đổi); sai phím tắt thì nhập đúng phím tắt đã đặt trong phần mềm; không mở phần mềm gõ thì báo không thấy. Ghi lại phím tắt mặc định thật của từng phần mềm
- [ ] (S10) Cài đặt → Bí mật: thêm `mat_khau_thu` = `Ghost-1234` (macOS có thể hỏi quyền Keychain lần đầu → Luôn cho phép; mở Keychain Access tìm “Ghosthand” thấy mục), chạy mẫu *Bí mật*: lời kết và nhật ký node chỉ hiện ••••, lịch sử chạy không có `Ghost-1234`; xoá bí mật rồi chạy → báo ngay “thiếu bí mật: mat_khau_thu”. Gõ `{{` trong ô nhập thấy gợi ý `secret.mat_khau_thu`. Gõ thử bí mật vào ô mật khẩu của trang thật; khởi động lại app vẫn còn. Windows: Credential Manager (Windows Credentials → Generic) có mục `Ghosthand/…`, chưa thử
- [ ] (S9) Mẫu thử *Thông báo hệ thống*: chạy – góc màn hình hiện thông báo “Ghosthand: Xin chào Lan…” (macOS: cấp quyền Thông báo cho terminal / Ghosthand, tắt Không làm phiền; thông báo hiện dưới tên *Script Editor* là bình thường). Windows: toast hiện dưới tên PowerShell, chưa thử – kiểm tra cả khi Focus assist bật
- [ ] (S8) Mẫu thử *Nén / giải nén zip*: chạy – lời kết ghi nén 2 file, giải nén 2 file; `~/Documents/ghosthand-mau-zip/bao-cao.zip` mở được bằng Finder / Explorer, thư mục `giai-nen/bao-cao` có a.txt + sub/b.txt, không có ghi-chu.log. Thử thêm zip thật nhiều file / tiếng Việt có dấu trong tên (zip tạo trên Windows mở trên Mac và ngược lại)
- [ ] (S6) Mẫu thử *Bộ gõ*: chạy – lời kết ghi bộ gõ trước đó, sau đổi là ABC, và bộ gõ máy trở về như cũ (xem menu bộ gõ trên thanh menu / khay hệ thống). macOS: bấm Chạy từ app thật (không từ `go test`) vì API bộ gõ cần main thread; thử thêm khi Unikey / EVKey đang chạy → imeApp có tên. Windows chưa chạy thử
- [ ] (S5) Mẫu thử *Tiến trình*: chạy – lời kết ghi số tiến trình / CPU / RAM của “ghosthand” khớp Activity Monitor / Task Manager (đổi tên nếu bản wails dev mang tên khác). Thử thêm *Chờ hết bận* với một app đang render / xuất file, và *Chờ thoát* với app bạn tự đóng; Windows chưa chạy thử
- [ ] (S4) Mẫu thử *Thông tin máy*: chạy – lời kết ghi tên máy, pin %, CPU, RAM, ổ trống, số màn + độ phân giải, mạng khớp máy bạn (macOS: Wi-Fi có thể trống; Windows: pin / Wi-Fi / scale chưa thử – kiểm tra cả laptop lẫn máy bàn)
- [ ] (S2) Mẫu thử *Shortcuts hệ điều hành* (macOS): tạo Shortcut “Ghosthand thử” (Đầu vào → CHỮ HOA → Dừng và xuất) rồi chạy: lời kết “XIN CHÀO GHOSTHAND”; inspector có ô *Chọn từ danh sách…* liệt kê Shortcut; đổi tên sai → fail not_found; lần đầu macOS có thể hỏi quyền
- [ ] (S1) Mẫu thử *Chạy lệnh – shell với biến môi trường* (macOS): bấm Chạy → hộp xác nhận hiện nguyên văn lệnh; Cho phép → lời kết ghi “Xin chao Ghosthand” + số file trong Downloads; chạy lại không hỏi; sửa một ký tự trong lệnh → hỏi lại. Thử lệnh `sleep 60` với chờ 3000 ms → fail timeout, `ps` không còn tiến trình `sleep`; bấm Dừng giữa chừng cũng giết hết; lệnh `exit 3` → cổng Thất bại, `exitCode` = 3; thử AppleScript `display notification "xin chào"` / JXA
- [ ] (E3) Mẫu thử *Đọc tài liệu* (Chrome / Safari, cấp Accessibility): lời kết ghi 3 dòng, có “Biên bản họp”, “1.250.000 đ”, “hẹn thứ Sáu”. Bôi đen 1 dòng trong ô rồi chạy với *Chỉ phần đang chọn* → chỉ dòng đó; thử thêm với TextEdit đang mở một văn bản.
- [ ] (E2) Mẫu thử *Chờ sự kiện giao diện* (Chrome / Safari, cấp Accessibility): bấm BẮT ĐẦU, ~2 s sau hộp thoại “Hoàn tất” hiện và kịch bản kết thúc thành công (không chụp màn hình); thử đổi `uiEvent` sang *Cửa sổ mới mở* rồi mở một cửa sổ app khác → bắt được; không có gì xảy ra → Thất bại sau hết giờ.
- [ ] (E1) Mẫu thử *Phần tử – thao tác không cần chuột* (Chrome / Safari, cấp Accessibility): chuột đứng yên, ô Họ tên được điền “Nguyễn Văn An”, tick Nhớ tôi, bấm GỬI → trang hiện “Nguyễn Văn An · NHỚ”; thử che một nửa cửa sổ bằng cửa sổ khác vẫn chạy; thử `uncheck` khi chưa tick (đi tiếp, không bấm); thử `setValue` lên ô web React thật để xem có báo “giá trị vẫn là …”.
- [ ] (B7) Mẫu thử *Lưu trang ra PDF* (Chrome macOS, cấp Accessibility + Automation; trước đó in tay một lần chọn đích *Lưu dưới dạng PDF*): hộp in hiện rồi tự đóng, `~/Downloads/ghosthand-bang-gia.pdf` có và mở ra thấy bảng giá; chạy lại → ghi đè không hỏi; đổi đích hộp in sang máy in → node Thất bại “đang chọn máy in thật”; thử thêm Edge / Cốc Cốc (giao diện hộp in có thể khác – xem `error.detail.stage`).
- [ ] (B6) Mẫu thử *Chờ file tải xong* (Chrome tải thẳng vào Downloads, không hỏi chỗ lưu): sau ~2 s file `ghosthand-bao-cao-….txt` về, lời kết ghi tên + cỡ ~2 KB; chạy lại → vẫn lấy file MỚI, không nhặt file lần trước; thử `Mẫu tên file` không khớp → hết giờ báo Thất bại.
- [ ] (B5) Mẫu thử *Phần tử – đọc bảng* (Chrome thường, cấp Accessibility): lời kết ghi “3 đơn · khách đầu: Nguyễn Văn An · 1.250.000 ₫”; thử điền *Ghi ra file* `~/Documents/don-hang.xlsx` / `.csv` → mở bằng Excel đúng 4 dòng × 3 cột, tiếng Việt không lỗi; thử bảng thật (Google Sheets / bảng trên web đã đăng nhập, bảng role=grid) và trên Windows (UIA)

- [ ] (B4) Mẫu thử *Phần tử – đọc toàn bộ chữ trang* (Chrome thường, cấp Accessibility): lời kết ghi số dòng + tên món / giá theo đúng thứ tự trên trang, không lặp chữ nút; thử selectors `role=table` hoặc một khung → chỉ chữ trong khung đó; trang dài: tắt / bật *Gồm phần ngoài khung nhìn* → bật lấy thêm phần cuộn xuống; trang trống / đang tải → chờ rồi mới đi tiếp
- [ ] (B3) Mẫu thử *Chuẩn hoá trình duyệt – zoom 100 %, đặt cỡ giữa màn* trên macOS: trước khi chạy bật toàn màn hình Chrome + phóng to trang (Cmd +); chạy xong Chrome thoát toàn màn hình, cửa sổ 1000×700 giữa màn, chữ trang về cỡ thường; lời kết thúc ghi đúng khung + “trước đó toàn màn hình: true”. Lần đầu macOS có thể hỏi quyền Automation / Accessibility (System Events gửi phím) → OK. Thử thêm: Edge / Cốc Cốc; preset Trái / Phải / Đầy; popup dịch trang đang mở bị đóng; Cmd+0 không làm hỏng ô đang gõ trên trang
- [ ] (B2) Node *Đi tới URL*: Chrome đang bị cửa sổ khác che vẫn đổi trang trong tab đang hiện (không mở tab mới), node chờ tới khi trang tải xong mới đi tiếp; URL có biến tiếng Việt / dấu cách mở đúng; URL lỗi (vd `http://localhost:1`) vẫn không treo quá *Chờ tối đa*
- [ ] (B1) Mẫu thử *Tab trình duyệt – mở, chuyển, đi tới URL, đóng đúng tab* trên macOS với Chrome đang mở vài tab khác: lần đầu macOS hỏi cho phép Ghosthand điều khiển Google Chrome → OK; Chrome mở danh sách sân thử, mở thêm Bảng click ở tab mới, quay lại tab danh sách + tải lại, rồi đóng đúng 2 tab đó (tab khác giữ nguyên); lời kết thúc ghi tiêu đề tab + số tab mở từ file ≥ 2
- [ ] (B1) Từ chối quyền Automation (System Settings → Privacy & Security → Automation) → node báo lỗi *permission* có hướng dẫn bật lại; đóng hết Chrome rồi chạy node *Mở tab mới* với trình duyệt *Đang ở trước* → lỗi *browser* “chưa mở trình duyệt”
- [ ] (B1) Edge / Cốc Cốc: chọn Trình duyệt = Edge hoặc Cốc Cốc, *Liệt kê tab* ra đúng tab của trình duyệt đó (Cốc Cốc: bundle id `com.coccoc.Coccoc` đúng không, AppleScript có `windows / tabs` như Chrome không)
- [ ] (B1) Inspector: *Làm gì* đổi giữa các thao tác hiện đúng ô (URL cho Mở tab mới, *Tab node Mở* chỉ khi kịch bản có node Mở, *So khớp* khi đã nhập tab); thẻ node hiện “Đóng tab · tab của n1”; cả theme sáng + tối

## 42 – Dữ liệu & luồng (G1–G5) · [phase3/42-du-lieu-luong.md](phase3/42-du-lieu-luong.md)

- [ ] (G5) Mẫu thử *Bảng giá – chọn món rẻ* chạy thành công (macOS + Windows): thanh trên hiện “ĐÃ CHỌN: 4 MÓN” (TÁO · CAM · XOÀI · CHUỐI), “TỔNG: 65.000 Đ”; ô *Bấm lúc đang tải* và *Bấm lặp một món* = 0; Thử tìm ở node Tìm tất cả thấy đúng 6 nút THÊM (không dính chữ khác trên trang)

- [ ] (G4b) Mẫu thử *Xử lý chữ – lọc, lấy số, ngày, làm sạch, tách* chạy thành công: ô gõ chữ hiện “A123 | 1234000 | true | 25/10 14:30 | nguyen van an | Táo;Cam;Xoài;”
- [ ] (G4b) Nhóm Dữ liệu có 4 node mới (Số & ngày, Lọc mẫu, Tách chữ, Làm sạch chữ), tìm được bằng từ không dấu (“lay so”, “regex”, “bo dau”); icon + thẻ node hiện dòng chi tiết đúng, cả theme sáng + tối
- [ ] (G4b) Inspector: gõ chữ không có biến → bấm *Chạy thử* hiện output (vd Số & ngày “Giá: 1.234.000 đ” → value 1234000; Lọc mẫu `\d+` trên “Hết hàng” → báo lỗi đỏ không có chỗ khớp); chữ có biến → hiện *Có biến – kết quả biết khi chạy*; Số & ngày đổi Việc → hiện ô Kiểu viết / Số lẻ / Mẫu ngày
- [ ] (G4b) Số kiểu Việt đọc từ trang thật (Đọc phần tử OCR → Số & ngày): “1.329.000đ”, “12,5 kg”, giá có chữ O thay số 0 (OCR Windows)

- [ ] (G4a) Mẫu thử *Tính toán – giá kèm thuế* chạy thành công: ô gõ chữ hiện “120000 → 129600 (true); 45000 → 48600 (false); 9900 → 10692 (false); ”
- [ ] (G4a) Thêm node *Tính toán* (nhóm Dữ liệu): gõ `2 * (3 + 1)` → inspector hiện *Kết quả: 8*; gõ `1 +` → báo lỗi đỏ + thẻ node cảnh báo *Biểu thức sai*; chèn biến → *Kết quả biết khi chạy*; bảng cú pháp đọc được ở cả theme sáng + tối

- [ ] (G3) Mẫu thử *Tìm tất cả – bấm mọi nút MUA* (trang Shop) chạy thành công: thanh giỏ hiện “GIỎ: 6 MÓN”, mỗi món ×1; thanh mini ghi *lượt … / 6*
- [ ] (G3) Thêm node *Tìm tất cả* (nhóm Chờ): đổi Tìm bằng ảnh mẫu / chữ / phần tử, ô *Số chỗ* (ít nhất / nhiều nhất), *Chỗ thứ* không hiện; bấm Thử tìm → overlay vẽ mọi khung kèm số thứ tự, inspector ghi số chỗ; xem cả theme sáng + tối
- [ ] (G3) Tìm ảnh mẫu lặp lại (icon giống nhau) trên màn Retina + Windows 125 %: đủ chỗ, không trùng khung; phần tử (Chrome thường / app) chỉ lấy chỗ đang hiện

- [ ] (G2) Mẫu thử *Lặp qua danh sách* chạy thành công: ô gõ chữ hiện “1. Táo; 2. Cam; 3. Xoài; ”, lời nhắn *Đã gõ 3 phần tử*; thanh mini ghi *lượt n4 1 / 3…* trong lúc lặp
- [ ] (G2) Thêm node *Lặp qua danh sách* (nhóm Luồng): thẻ có cổng *Mỗi phần tử* / *Hết danh sách*; đổi sang *File CSV / Excel*, chọn file CSV tiếng Việt có BOM (lưu từ Excel, dấu ; ) → *Đọc thử* hiện đúng số dòng + cột → `n?.output.item.<khoá>`; file .xlsx nhiều sheet; xem cả theme sáng + tối
- [ ] (G2) Xem trước (nút Xem trước + menu Nhánh): chọn *Mỗi phần tử* đi 1 lượt rồi hết, chọn *Hết danh sách* ra luôn

- [ ] (G1) Mẫu thử *Chờ màn hình đứng yên* (trang Tải chậm) chạy thành công: node Chờ màn hình đi tiếp ngay khi khung xương ngừng nhấp nháy, sau LÀM MỚI chờ được tới khi trang phản hồi; ô *Bấm lúc đang tải* = 0 (chạy thật tự động 2026-10-21 hỏng ở bước click theo chữ – trang mở không nằm trên cùng, OCR đọc chữ cửa sổ khác; mẫu cũ `cho-chu` hỏng y hệt → do môi trường)
- [ ] (G1) Thêm node *Chờ màn hình* từ bảng thêm node (nhóm Chờ): inspector có Chờ tới khi (Đứng yên / Thay đổi), Vùng theo dõi (Vùng cố định → Khoanh trên màn hình… ghi đúng vùng), Đứng yên, Ngưỡng đổi; thanh mini ghi *đang chờ màn hình*; xem cả theme sáng + tối
- [ ] (G1) Trang thật tải chậm (YouTube, Shopee): Chờ màn hình đứng yên thay Chờ 3 s – không đi sớm khi còn spinner (spinner nhỏ: thu hẹp vùng hoặc ngưỡng 0)

## 47 – Hình minh hoạ động cho node · [phase3/47-hinh-minh-hoa-node.md](phase3/47-hinh-minh-hoa-node.md)

- [ ] Ctrl/Cmd+K → rê / mũi tên qua từng loại node: khung dưới hiện hoạt hoạ lặp + chữ mô tả, bảng không giật khi đổi mục; thử cả theme sáng và tối
- [ ] Chọn một node → bấm tên loại dưới tên node ở inspector → hiện bảng (không còn dropdown) → chọn loại khác thì node đổi loại, cổng / thời gian giữ nguyên
- [ ] Mở `#demo-illus`: lướt qua mọi hình, báo hình nào khó hiểu / lệch chữ để chỉnh

## 46 – MCP web tinh chỉnh (A0–A3, A2) · [phase3/46-mcp-web-tinh-chinh.md](phase3/46-mcp-web-tinh-chinh.md)

- [ ] (B1) Nhờ Claude “thử bấm nút X trên trang đang mở” → AI dùng run_script với script tạm: hộp hỏi ghi *Kịch bản tạm*, không có nút *Cho phép đến khi đóng app*; không có file kịch bản mới, không thêm lịch sử chạy
- [ ] (B2) Nhờ Claude đổi một node Click thành Double click / node Nếu thành Chờ → node giữ tên + vị trí trên canvas, cạnh true / false bị bỏ và AI báo lại
- [ ] (B3) Mẫu thử *Web: phím trên trang* chạy thành công khi Chrome của app bị cửa sổ khác che; bàn phím thật không gõ gì; thêm node *Phím trên trang web* từ bảng thêm node, inspector có phím + Tab
- [ ] (B4) Claude gọi `screenshot` với `webTab` khi Chrome của app bị che → vẫn ra ảnh đúng trang; chạy `shots: each` → ảnh trả theo thứ tự node, có chú thích
- [ ] (A4) Hai tab cùng trang trên Chrome của app: Claude gọi `probe_page` / `read_web_outline` → có `tab` + `tabs` kèm id; node web đặt `tab` = id chạy đúng tab đó; Chrome của app mở lại thì id cũ báo “không thấy tab” kèm gợi ý ghi chuỗi URL
- [ ] (A3) Mẫu thử *Web: form trong hộp thoại* chạy thành công; trên inspector node web thấy *Tìm trong* (Cả trang / Hộp thoại đang mở), *Chỗ thứ*, webType có *Bỏ kiểm tra focus*; *Thử tìm* với `label="Ngày sinh"` khoanh đúng ô ngày; chọn *Hộp thoại đang mở* trên trang không có hộp thoại → báo rõ
- [ ] (A1) Kịch bản có vùng: nhờ Claude chụp `screenshot` rồi tạo node click theo toạ độ trên ảnh với `coordSpace: "absolute"` → chạy click đúng chỗ; marker trên overlay đúng chỗ, inspector ghi *Màn hình*; đổi vùng không dời điểm đó; node thường ngoài vùng → lỗi nêu "gốc vùng X,Y" + gợi ý coordSpace

- [ ] Mở sân thử *Form kiểu antd* (Mẫu thử → trang): để Claude gọi `read_web_outline` với `dialog: true` → thấy ô Mã nhân viên / Ngày sinh / nút Lưu của hộp thoại, không lẫn ô lọc lưới
- [ ] `webType` vào ô Mã nhân viên (selector role=textbox[name="Mã nhân viên"]) → gõ vào ô trong hộp thoại; `text="Ngày sinh"` và ô Thành phố (focus chậm) gõ được, không báo "không nhận focus"
- [ ] Trang tự mở popup (window.open) → `probe_page` không url / `read_web_outline` đọc đúng tab popup; truyền `tab` = id tab đọc được tab cũ

## 45 – đổi tên thành Ghosthand · [phase3/45-doi-ten-ghosthand.md](phase3/45-doi-ten-ghosthand.md)

- [ ] `wails build` → ra `build/bin/ghosthand.exe`; mở lần đầu trên máy đã dùng bản cũ → Cài đặt (theme, thư mục Lưu trữ, API / AI), *Mở gần đây*, lịch sử chạy của kịch bản còn nguyên; `%APPDATA%\autoclicker` đã thành `%APPDATA%\ghosthand`
- [ ] Kịch bản / ảnh cũ nằm trong `Documents\Ghosthand`, `Pictures\Ghosthand`; mở kịch bản từ *Mở gần đây* được, Lịch sử của nó còn các lần chạy cũ
- [ ] Thanh tiêu đề, tiêu đề cửa sổ (thanh tác vụ), Cài đặt, hộp lưu ghi *Ghosthand*
- [ ] Cài đặt → AI → *Thêm vào Claude Desktop* → file cấu hình Claude Desktop chỉ còn mục `ghosthand` (mục `autoclicker` đã bỏ); khởi động lại Claude Desktop → gọi tool được
- [ ] `ghosthand run <file.json>` khi app đang mở → chạy được
- [ ] Đọc chữ (OCR) lần đầu sau đổi tên vẫn chạy (giải nén lại Tesseract)

## 44 – thử trang + ưu tiên node cho AI · [phase3/44-thu-trang-uu-tien-node.md](phase3/44-thu-trang-uu-tien-node.md)

- [ ] Nút quả địa cầu trên thanh tiêu đề → hộp *Thử trang*: gõ `vi.wikipedia.org` → Thử → Chrome của app mở trang, app lên lại trước, báo ✓ *Dùng được node web* + số phần tử. Xem theme sáng + tối
- [ ] Sân thử *Captcha giả* (`captcha.html`) → ⚠ *Có captcha*; *Game canvas* (`canvas-game.html`) → ⚠ *Nội dung vẽ trong canvas* (mở Sân thử, chép URL `file:///…` của trang trên thanh địa chỉ dán vào ô)
- [ ] Trang thật có Cloudflare / reCAPTCHA (vd trang game hay bị chặn) → báo *Có captcha* kèm dấu hiệu; trang không mở được (sai tên miền) → báo lỗi rõ, không treo
- [ ] Cài đặt → AI (MCP): *AI ưu tiên node* mặc định *Ảnh / chữ*; đổi sang *Trình duyệt app* → đóng mở lại vẫn giữ
- [ ] Trên Claude Code: “ưu tiên dùng node trình duyệt” → AI gọi `set_node_preference` → app hiện “AI đổi ưu tiên node sang “Trình duyệt app”” (Cài đặt đang mở thì cập nhật ngay); “tạo kịch bản bấm nút … trên trang X” → AI gọi `probe_page` trước, trang ok thì dùng node web (node Mở có *Chrome của app*), captcha thì dùng tìm chữ / ảnh và nói lý do
- [ ] Mức AI *Chỉ soạn* → `probe_page` bị từ chối (không mở Chrome); đổi mức trên chip thanh mini lúc AI đã đổi ưu tiên → ưu tiên node không bị trả về cũ
- [ ] T6 trang tải lâu: thử một trang nặng (báo / thương mại điện tử nhiều quảng cáo) → có kết quả sau vài giây, không phải chờ hết giờ; trang quá chậm → ⚠ *Trang chưa tải xong* → chờ trang hiện trên Chrome rồi bấm **Dò lại** (trang không tải lại) → ra kết luận. Trên Claude Code: AI gặp `loading` tự gọi lại `probe_page` không url
- [ ] Sửa lỗi: mở *Cài đặt* / *Thử trang* / menu theme / popup *N vòng* rồi double click hoặc kéo trong hộp (chữ, khoảng trống, nền mờ) → cửa sổ **không** phóng to / không bị kéo; double click khoảng trống trên thanh tiêu đề vẫn phóng to / thu về

## 41 – nơi lưu + xoá lịch sử · [phase3/41-noi-luu-lich-su.md](phase3/41-noi-luu-lich-su.md)

- [x] Cài đặt (bánh răng) → tab **Lưu trữ**: 3 ô hiện *Mặc định: …/Documents/Auto Clicker* và *…/Pictures/Auto Clicker*; *Chọn…* đổi thư mục → ô chữ đậm, có *Về mặc định*; *Mở* mở đúng thư mục trong Finder / Explorer. Tab API / AI (MCP) vẫn như cũ. Xem theme sáng + tối
- [x] Kịch bản mới → Lưu: hộp thoại mở sẵn thư mục *Kịch bản* đã chọn; *Mở kịch bản* cũng mở ở đó. Kịch bản đã có file → Lưu ghi tại chỗ cũ
- [x] AI (Claude) tạo kịch bản mới → file vào thư mục *Kịch bản AI tạo* (để trống thì theo *Kịch bản*)
- [x] Node Chụp màn hình để trống *Thư mục lưu* → ảnh vào thư mục ảnh trong Cài đặt (mặc định giờ là `Pictures/Auto Clicker`); node đã đặt thư mục riêng thì giữ
- [x] Chọn thư mục rồi xoá / đổi tên thư mục đó trong Finder → Lưu kịch bản mới báo lỗi *không thấy thư mục … Về mặc định*, không lưu lặng lẽ chỗ khác; node Chụp màn hình báo lỗi tương tự
- [x] Windows có OneDrive chuyển Documents / Pictures → mặc định trỏ vào thư mục trong OneDrive
- [x] Lịch sử chạy → *Xem tất cả*: *Xoá lần này* xoá lần đang chọn (chọn sang lần cũ hơn kế đó); *Xoá hết…* hỏi lại rồi xoá cả, thanh bên hết lịch sử; đang xem lần đó trên bảng Nhật ký thì bảng đóng
- [x] Thư viện → Mở gần đây: rê chuột hiện ✕ bỏ một mục; *Xoá danh sách* bỏ hết – file kịch bản vẫn còn trên đĩa

## 40 – đọc chữ tiếng Việt bằng Tesseract (Windows) · [phase3/40-nhan-dang.md](phase3/40-nhan-dang.md)

- [x] Mẫu thử *Click theo chữ tiếng Việt có dấu* (Windows, 100 % và 125 %) → Bấm đúng “Bản” = 5, Bấm nhầm = 0
- [x] App thật / web tiếng Việt: Chờ chữ / Click theo chữ có dấu (vd “Đăng nhập”, “Lưu thay đổi”) – tìm đúng, khung click trúng chữ; chữ trắng trên nút màu cũng thấy
- [x] Node Chờ / Click theo chữ mới: công tắc *Bỏ qua dấu* bật sẵn – tìm “he thong” thấy “hệ thống”; tắt đi thì “hê thông” không khớp “hệ thống”. Kịch bản cũ mở lên vẫn chạy (node trước đây không bật bỏ dấu giờ cũng bỏ dấu)
- [x] Exe tải từ GitHub Actions chạy trên máy Windows sạch (chưa cài Tesseract): đọc chữ có dấu được ngay, thư mục `%LOCALAPPDATA%\autoclicker\tesseract-…` tự tạo
- [x] Node Chờ chữ vùng cả màn: không thấy giật chuột / UI chậm rõ khi chờ lâu (mỗi lần đọc cả màn ~0,8 s)
- [x] AI `describe_screen` trên Windows trả chữ có dấu đúng

## 40 – tìm ảnh: so viền, mặt nạ, kiểm tra màu · [phase3/40-nhan-dang.md](phase3/40-nhan-dang.md)

- [x] Mẫu thử *Tìm ảnh nâng cao: so viền, màu, mặt nạ* (macOS Retina, zoom 100 %) → chạy qua: Icon theme tối = 2, Nút xanh = 2, Huy hiệu = 2, các ô Nhầm / Bấm trượt = 0. Đổi node 2 về *So theo: Độ sáng* → hết giờ không thấy; tắt *Kiểm tra màu* ở node 4 → có lúc bấm nhầm nút xám
- [x] App thật: khoanh ảnh mẫu một nút / icon ở theme sáng (vd app có theme hệ thống), *So theo: Đường viền* → đổi hệ điều hành sang theme tối → Thử tìm vẫn thấy, độ khớp ≥ ~80 %
- [x] Inspector Chờ ảnh: *So theo* + *Kiểm tra màu* (bật → *Lệch màu tối đa* 15 %); Thử tìm trên nút cùng hình khác màu → báo “Thấy hình giống … nhưng màu lệch X %”; thẻ node ghi “· so viền · màu ±15%”; điều kiện Nếu *thấy ảnh* có cùng hai ô – xem theme sáng + tối
- [x] (Windows 125 %) chạy lại mẫu trên → vẫn qua (ảnh mẫu 2x thu về đúng tỷ lệ cùng mặt nạ)

## Sửa – cửa sổ mất sau khi chạy (Windows 2 màn) / chọn Space (macOS)

- [ ] Windows, 2 màn (màn chính không ở góc 0,0 – vd màn chính bên phải màn phụ): đặt cửa sổ app trên màn chính → Chạy → xong thì màn chính hiện lại đúng chỗ cũ; thử thêm cửa sổ đang phóng to, cửa sổ trên màn phụ, mở / đóng overlay
- [ ] macOS nhiều Space: app mở ở Space 1 → sang Space 2 bấm icon Dock → cửa sổ dời sang Space 2 (không nhảy về Space 1); chạy xong thanh mini → về màn chính vẫn ở Space đang đứng; overlay / thanh mini vẫn nổi trên app toàn màn hình

## Sửa – mở notepad.exe / gõ chữ khi bật bộ gõ tiếng Việt · [phase3/23-cuon-mo-url.md](phase3/23-cuon-mo-url.md)

- [ ] Node Mở target `notepad.exe` (không đường dẫn) → mở Notepad, không mở Chrome; `youtube.com/…`, `parroto.app` vẫn mở trình duyệt
- [ ] Bật UniKey (Telex) → node Gõ chữ *Cách nhập: Tự chọn* gõ đoạn tiếng Việt + tiếng Anh ("too", "dd") vào Notepad / Chrome → đúng nguyên văn; clipboard trước đó (chữ) được trả lại sau khi dán
- [ ] *Gõ phím* + UniKey bật → nhật ký node có cảnh báo bộ gõ; bật giống người → vẫn gõ từng phím; Gõ vào ô web chạy nền không hiện *Cách nhập* – xem inspector theme sáng + tối

## 31b2 – chọn tool MCP cho từng loại AI · [phase3/31-mcp-ai.md](phase3/31-mcp-ai.md)

- [ ] Bánh răng → MCP: có bảng *Tool AI được dùng* (mỗi tool một công tắc, nhãn nhóm); tắt `screenshot` ở *Mặc định* → AI nào chưa có danh sách riêng (kết nối lại) không thấy / không gọi được `screenshot`, bị báo `tool_disabled`
- [ ] Kết nối Claude Code và Cursor (hoặc 2 client khác): sau lần đầu tên từng AI hiện trong ô chọn; tắt `screenshot` riêng cho Cursor, để Claude Code bật → Claude Code vẫn chụp được, Cursor không; *Dùng mặc định* xoá danh sách riêng
- [ ] Khởi động lại app: các lựa chọn còn nguyên

## 31b – AI tự chạy, xem lỗi, sửa, chạy tiếp · [phase3/31-mcp-ai.md](phase3/31-mcp-ai.md)

- [ ] Node Click phần tử web với selector sai nhẹ (vd `text=Xem lich su` khi trang ghi “Xem lịch sử đơn”) → hết giờ, `error.detail` có `perSelector` (0 hiện) + `outline` liệt kê phần tử đúng kèm `sel`; AI sửa selector theo `sel` rồi `resume_run` qua
- [ ] AI chạy kịch bản dài (vd 5 node click có `delayAfter` 1 s) → giữa chừng rê chuột → app tạm dừng trước node kế, thanh mini “Bạn vừa đụng chuột – đã tạm dừng”, AI gọi `wait_run` thấy `pausedBy: touch`; bấm ▶ chạy tiếp được. Khi AI đang tự di chuột (giống người, đường cong) thì không báo nhầm; lượt bạn tự chạy thì rê chuột không tạm dừng
- [ ] AI chạy kịch bản → thanh mini có chip “● AI · Tự chạy / Hỏi” (chấm nhấp nháy); bấm chip → 4 nút mức; chọn *Chỉ soạn* → lượt AI dừng ngay, Cài đặt → MCP cũng đổi theo; chạy tay (nút Chạy) thì không có chip – xem cả theme sáng + tối
- [ ] Bảo AI chạy kịch bản 4–5 node với `shots: "each"` → mỗi node có `shot`, kết quả gửi kèm 3 ảnh mới nhất (đúng cảnh sau khi node chạy xong + chờ `delayAfter`), AI xin ảnh node đầu bằng `wait_run shots: [...]` được; thời gian chạy không bị nhân đôi `delayAfter`; Lịch sử chạy có các ảnh đó
- [ ] (Windows) Node Mở Notepad, `delayAfter` 2 s → output có `window` “Untitled - Notepad” (hoặc tiếng Việt), `newWindow` true, node vẫn chờ đúng ~2 s; mở URL khi Chrome đang mở sẵn → `newWindow` false, `window` = Chrome. Click / gõ / phím sau đó → output `window` / `windowApp` là cửa sổ đang ở trước
- [ ] Chi tiết lỗi gần đúng: bảo AI chạy kịch bản có node sai nhẹ – chờ chữ “Gưi” (thật là “Gửi”), phần tử `text=Mua ngey`, cửa sổ / app gõ sai tên (vd `chromium`) → `wait_run` trả `error.detail` có `closest` / `near` chỉ đúng chữ / phần tử / cửa sổ / app thật (kèm khung), AI tự sửa node rồi `resume_run` qua
- [ ] Bánh răng → *Cho AI điều khiển (MCP)*: có *AI được chạy kịch bản* (Chỉ soạn / Hỏi trước khi chạy / Tự chạy) + *Tối đa mỗi lượt* – xem cả theme sáng + tối
- [ ] Thoát hẳn app → trên Claude Code / Desktop bảo AI làm việc cần chạy (vd "mở Notepad, gõ chào bạn, lưu ra Desktop/test.txt") → app tự mở **không hiện màn chính**; mức *Hỏi*: hiện hộp "AI muốn chạy …" (Enter = cho phép lần này, Esc = từ chối); khi chạy chỉ thấy thanh mini, chạy xong vẫn giữ thanh mini; bấm Dừng trên thanh mini → mở màn chính
- [ ] *Từ chối* → AI báo bị từ chối, không gọi lại liên tục; *Cho phép đến khi đóng app* → lần sau cùng kịch bản không hỏi; mức *Chỉ soạn* → AI báo chỉ được soạn
- [ ] Cố ý cho một node lỗi (vd chờ chữ không có trên màn) → AI nhận ảnh màn hình lúc lỗi + `error.detail` (các dòng chữ đọc được, cửa sổ đang trước), tự sửa node, `resume_run` chạy tiếp từ node đó – các node trước **không** chạy lại (Notepad không mở lần nữa)
- [ ] AI chạy `stopAt` từng đoạn rồi chạy tiếp; `describe_screen` trả chữ đúng chỗ (toạ độ khớp khi click thử), `screenshot` thấy đúng màn – thử thêm màn 125 % / màn phụ
- [ ] Đang AI chạy mà chuyển công tắc MCP sang tắt / *Chỉ soạn* → lượt chạy dừng ngay; F8 / chuột chạm góc vẫn dừng; Lịch sử chạy ghi nguồn **AI**

## 31a – AI tạo / sửa kịch bản qua MCP · [phase3/31-mcp-ai.md](phase3/31-mcp-ai.md)

- [ ] Bánh răng → *Cho AI điều khiển (MCP)* đang bật → *Thêm vào Claude Desktop…* → hỏi đường dẫn → Ghi → thoát hẳn + mở lại Claude Desktop: thấy server `ghosthand` (14 tool). Claude Desktop bản Microsoft Store có thể dùng file cấu hình khác – báo lại nếu không thấy
- [ ] Trên Claude: "tạo kịch bản mở bài Tinh Hà Say 2 trên YouTube, tên bài là input" → file mới trong Documents/Ghosthand, *Mở gần đây* có chip **AI**; AI gọi `open_in_app` → app hiện lên, mở kịch bản; Xem trước đúng thứ tự; bấm Chạy phát nhạc
- [ ] "đổi thành bài khác / thêm bước…" → AI sửa đúng kịch bản (app nạp lại, Ctrl+Z lấy lại bản trước); đang sửa dở kịch bản đó (chưa lưu) → AI ghi ra bản sao `… (AI).json`, bản của bạn không đổi
- [ ] Đang có thay đổi chưa lưu ở kịch bản khác → AI gọi mở thì app không đổi kịch bản, AI báo lại
- [ ] Claude Code: chép lệnh `claude mcp add …` trong Cài đặt → `/mcp` thấy ghosthand; app chưa mở → tự mở khi Claude gọi
- [ ] Tắt công tắc MCP → AI gọi tool bị từ chối (báo bật trong Cài đặt); bật lại dùng được ngay. Cài đặt hiện 5 lệnh AI gần nhất (✓ / ✗)
- [ ] Bật *API cho chương trình khác* → cấu hình *HTTP (client nối URL)* dùng được với client nối thẳng `http://127.0.0.1:<cổng>/mcp`

## 22 – Hẹn giờ / CLI / API local · [phase3/22-hen-gio-cli-api.md](phase3/22-hen-gio-cli-api.md)

- [ ] Chạy tay như cũ (nút Chạy, F8 dừng, chạy từng node / chạy riêng node, xác nhận thao tác nguy hiểm, lịch sử chạy) – phần chạy đã chuyển sang `internal/session`
- [ ] CLI (PowerShell, app đang mở): `build\bin\ghosthand.exe run <file.json>` → app thu thành thanh mini, terminal in từng node ✓ / ✗ + *Xong sau … s*, `$LASTEXITCODE` = 0; Ctrl+C trong terminal → kịch bản dừng; `--preset "Tên bộ"` / `--set M1=Lan` dùng đúng giá trị; preset sai tên → báo các tên có, mã 1
- [ ] CLI khi app chưa mở: tự mở app rồi chạy; `run` không có file / cờ lạ → in cách dùng, mã 2; `help` in cách dùng
- [ ] Bánh răng trên thanh tiêu đề → bật *API cho chương trình khác*: `curl -X POST http://127.0.0.1:47800/run -H "Authorization: Bearer <token>" -d "{\"path\":\"C:/…/a.json\"}"` chạy được; sai token → 401; tắt công tắc → không nối được; đổi cổng / tạo token mới có tác dụng ngay
- [ ] Hẹn giờ: lưu kịch bản thành file → *N vòng* → Hẹn giờ chạy → Đặt giờ… (chưa lưu file thì nút mờ, có gợi ý); đặt giờ sau 1–2 phút, *Thu nhỏ cửa sổ* bật → app thu nhỏ, tới giờ tự hiện thanh mini và chạy, xong thu nhỏ lại; thư viện hiện chip giờ cạnh tên; *Một lần* chạy xong thì chip mất
- [ ] Thông báo hẹn giờ: Telegram (`botToken@chatId`), Discord webhook, webhook (vd webhook.site) nhận chữ + ảnh màn hình; *Gửi khi: Lỗi* thì lần chạy xong không gửi; tới giờ mà đang chạy kịch bản khác → thông báo lỗi + dòng báo trong app
- [ ] Kịch bản đang mở bị ghi qua API `PUT /script` (kèm `revision` lấy từ `GET /script`) → app nạp lại, có thông báo, Ctrl+Z lấy lại bản trước; gửi revision cũ → 409 conflict

## 26 W3b – Overlay vẽ khung đích node Cửa sổ · [phase3/26-cua-so-ung-dung.md](phase3/26-cua-so-ung-dung.md)

- [ ] Mở mẫu **Cửa sổ – đặt 1280 × 800 bên trái rồi chụp** → mở overlay: thấy khung nét đứt 1280 × 800 ở góc trái trên, nhãn `n… · chrome → 1280 × 800 tại 0, 0 · màn chứa cửa sổ lúc chạy`; chọn node đó → viền liền. Đổi Đặt ở Phải / Giữa / Đầy / Toạ độ → khung đổi theo, Đầy không đè taskbar
- [ ] Xem trước mẫu đó: khung chỉ hiện lúc tới node Cửa sổ (kèm bong bóng *không đổi cửa sổ thật*), cửa sổ thật không bị dời
- [ ] 2 màn hình / màn 125 %: chọn Màn hình 2 → khung vẽ trên màn 2 (mở overlay sang màn 2), khớp chỗ cửa sổ nằm sau khi Chạy

## 26 A1–A3 – Node Ứng dụng + xác nhận thao tác nguy hiểm · [phase3/26-cua-so-ung-dung.md](phase3/26-cua-so-ung-dung.md)

- [ ] Mẫu thử **Ứng dụng – mở Notepad, gõ chữ rồi thoát** (đóng Notepad trước): lần đầu hiện hộp *Kịch bản này sẽ thoát app / đóng cửa sổ* liệt kê n6; Cho phép → Notepad mở, có dòng chữ rồi tự tắt; chạy lại không hỏi nữa. Notepad đang mở sẵn → đi nhánh Đang chạy, dừng báo lỗi, không đụng Notepad
- [ ] Thêm node Ứng dụng (Ctrl+K → Ứng dụng): thẻ có cổng *Đang chạy* / *Không chạy*; đổi sang Thoát → cổng Thành công / Thất bại (cạnh cũ bỏ); ô App hiện ● Đang chạy · n cửa sổ / ○ Không chạy; *Chọn từ app đang chạy…* liệt kê app (Chrome một dòng), gõ lọc không dấu
- [ ] Thoát app đang hỏi lưu (Notepad cũ / Word có chữ chưa lưu) không bật *Quá giờ thì buộc thoát* → hết giờ cổng Thất bại, app vẫn mở hộp hỏi lưu; bật → app bị tắt
- [ ] Kịch bản có node Tệp xoá file (đã đồng ý trước đây): hỏi lại một lần (file đồng ý đổi tên `danger-consent.json`)
- [ ] App ghi `explorer.exe` + Thoát → báo lỗi ngay khi bấm Chạy, không chạy

## 26 W1–W3a – Node Cửa sổ (Windows) · [phase3/26-cua-so-ung-dung.md](phase3/26-cua-so-ung-dung.md)

- [ ] Mẫu thử **Cửa sổ – đặt 1280 × 800 bên trái rồi chụp**: cửa sổ trình duyệt nhảy về góc trái 1280 × 800; thu nhỏ / kéo sang chỗ khác / phóng to rồi chạy lại vẫn ra như vậy; lời kết thúc ghi khung + cỡ ảnh khớp
- [ ] Thêm node Cửa sổ (Ctrl+K → Cửa sổ): *Chọn từ cửa sổ đang mở…* liệt kê đúng cửa sổ (không có cửa sổ ghosthand), gõ lọc không dấu, chọn → điền App + Tiêu đề; *Lấy khung hiện tại* điền đúng X, Y, W, H
- [ ] Thao tác Đưa lên trước (cửa sổ đang thu nhỏ / bị che), Thu nhỏ, Phóng to, Đóng (Notepad có chữ chưa lưu → Notepad hỏi lưu, node không tự bấm), Chờ cửa sổ đóng; App / tiêu đề không khớp → hết giờ đi cổng Thất bại
- [ ] Màn 125 % / 150 % và 2 màn hình: Đặt ở Trái / Đầy trên màn 2 – khung đúng vùng làm việc (không đè taskbar)

## 20 F6 / F7 – Xem trước theo nhánh, thanh mini, chạy riêng node · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] Chọn một node (vd Click n3) → ▾ cạnh nút Chạy → **Chạy riêng n3**: chỉ node đó chạy một lần (click thật), thẻ node tô kết quả, Lịch sử chạy có lần chạy chỉ một node; node thất bại (vd Chờ chữ không thấy) → báo lỗi dù có nối nhánh Thất bại; F8 dừng được

- [ ] Mẫu có rẽ nhánh (vd ví dụ Facebook: Chờ chữ → Thất bại → Đếm → Cuộn): overlay → Xem trước → **Nhánh** chọn Thất bại cho node Chờ → Chạy thử: con trỏ đi vòng cuộn 1 lần rồi theo Hết lượt; dòng gợi ý ghi đường đã đi; *Về nhánh chính* đi lại nhánh Thành công; đóng / mở lại overlay vẫn nhớ lựa chọn; Esc khi menu mở chỉ đóng menu
- [ ] Chạy thật kịch bản có Đếm + nhánh Thất bại: thanh mini ghi "n2 · … · Thất bại → n4 · Đếm", dòng "lượt n4 2 / 10" tăng dần, hết lượt thì mất

## 37 E5 – Phần tử màn hình Windows · [phase3/37-phan-tu-man-hinh.md](phase3/37-phan-tu-man-hinh.md)

- [ ] Windows, Chrome thường đã đăng nhập (Gmail / Facebook): node Đọc phần tử / Click theo phần tử đọc đúng chữ, bấm đúng nút; App ghi `chrome` hoặc `Google Chrome` đều được; Chọn trên màn sinh dòng tìm đúng phần tử
- [ ] Windows: app khác (Notepad, File Explorer, VS Code) – Thử tìm thấy nút / ô; Chrome thu nhỏ → báo “không có cửa sổ đang hiện”; app chạy quyền admin (vd Task Manager) → báo không đọc được
- [ ] Windows: Đọc phần tử *Lấy số* trên giá có chữ ₫ đọc bằng OCR (số 0 bị đọc thành chữ O vẫn ra số đúng)

## 25e – OCR Windows · [phase3/25e-ocr.md](phase3/25e-ocr.md)

- [ ] Windows: node Chờ chữ / Click theo chữ trên trang tiếng Việt (vd Mẫu thử → **Click theo chữ**, **Bảng dữ liệu**): thấy đúng chữ dù OCR đọc sai dấu; *Thử tìm* không thấy thì danh sách “đọc được” hiện chữ không dấu / sai dấu (bình thường trên Windows). Chữ ngắn < 5 ký tự (vd “HUẾ”) có thể không thấy – dùng chữ dài hơn hoặc ảnh mẫu
- [ ] Windows: Đọc phần tử → đọc chữ cạnh nhãn bằng OCR (37 E4) với nhãn tiếng Việt

## 17 – DPI Windows · [phase1-mvp.md](phase1-mvp.md)

- [ ] Windows 125 % (sửa 2026-10-19 – ảnh mẫu co giãn theo DPI màn): chụp lại ảnh mẫu đã chụp trên Windows trước bản này; chụp ảnh mẫu một nút ở 125 % → đổi scale sang 100 % (Settings → Display) → Thử tìm / chạy vẫn thấy; ảnh mẫu trong inspector hiện đúng cỡ nhìn trên màn. Có 2 màn khác scale: chụp ở màn này, tìm ở màn kia
- [ ] Windows 150 % / 100 %: `GHOSTHAND_REAL=1 go test ./internal/device/ -run Real -v` qua (chuột đọc lại đúng, DPI in ra đúng scale)

## 18a – Build exe · [phase1-mvp.md](phase1-mvp.md)

- [ ] Windows cửa sổ trong suốt (sửa 2026-10-19): mở overlay → nhìn xuyên thấy màn hình thật (nền tối mờ); Xem trước với *Nền: Không* và *Nền: Trang web* đều thấy màn hình phía sau; màn chính vẫn nền đặc, kéo / đổi cỡ / phóng to cửa sổ như cũ; thanh mini trong suốt quanh viền

- [ ] Windows scale 125 % (sửa 2026-10-19 – chuột qua Win32, pixel thật): tải exe mới nhất ở Actions, xoá điểm cũ rồi ghi lại điểm (F6 / chọn trên overlay) → chạy: click trúng đúng chỗ, cả khi cửa sổ đích là app khác (Chrome, Notepad, Explorer); khung vùng / marker trên overlay nằm đúng chỗ; chờ ảnh / Thử tìm thấy đúng; thử thêm 150 % và 2 màn khác scale nếu có. Kịch bản ghi trên bản cũ ở 125 % có thể lệch – ghi lại điểm
- [ ] GitHub → tab **Actions** → *Build Windows* → lần chạy mới nhất xanh → tải artifact `ghosthand-windows-…` (zip), giải nén, mở `ghosthand.exe` trên Windows (SmartScreen: More info → Run anyway): app mở, tạo kịch bản click 2 điểm chạy đúng, Lưu / mở lại được. Ghi lại lỗi gặp (thiếu WebView2, click lệch khi scale 125 %…)

## 38 – UI v3 – gọn · [phase3/38-ui-v3.md](phase3/38-ui-v3.md)

- [ ] V4 Bảng thêm node (Ctrl+K) và hộp Mẫu thử: icon tô đúng màu nhóm, đọc rõ ở theme tối; lần chạy thất bại – canvas cuộn tới node lỗi, dòng "Flow · N node" không đè chữ lên thẻ
- [ ] V3b3 Inspector mọi loại node (`wails dev`): rê ⓘ cạnh nhãn hiện giải thích, không bị cắt mép; công tắc (Cả dòng, Bỏ qua dấu, Ghi nối tiếp, Vào clipboard, Giờ chuẩn, Khép kín…) bật / tắt đúng; báo lỗi đỏ vẫn hiện khi thiếu dữ liệu; theme tối đọc rõ
- [ ] V3b2 Vị trí (`wails dev`): node Click – ⋯ cạnh X / Y → Lấy toạ độ từ biến, *Dùng số cố định* trở lại; hàng Sơ đồ mở / đóng, bấm chấm đổi neo giữ nguyên chỗ trên màn hình, px / % đổi đúng; chữ neo ở đầu khối đổi theo
- [ ] V3b1 Ô nhập (`wails dev`): rê vào ô số hiện ⋯; Dùng biến… → ô biểu thức, ✕ trở lại số; Đặt làm input khi chạy → viền nét đứt, chip key, form Chạy hỏi giá trị; dùng chung input có sẵn; Về mặc định đúng theo loại node (Chờ 1000 ms, Mở 2000 ms…); − / + ở Số click; menu ⋯ gần đáy inspector mở lên trên
- [ ] V3a Inspector (`wails dev`): mở / đóng các khối, chọn node cùng loại khác vẫn giữ khối đang mở; tóm tắt đúng khi đóng (Thời gian, Khi thất bại, Cổng ra); đổi loại node ở chữ màu dưới tên; nút ⓘ hiện mô tả, bấm ra ngoài đóng
- [ ] V2 Khung app (`wails dev`): nút Chạy (F8 vẫn chạy / dừng), ▾ mở menu – Chạy từ node đang chọn, Chạy từng node (F10 đi tiếp), Xem trước, Sửa input trước khi chạy (kịch bản có input); menu theme đổi Sáng / Tối / Theo hệ thống, lưu sau khi mở lại app; kéo cửa sổ bằng thanh tiêu đề vẫn được (không kéo nhầm khi bấm nút theme); thư viện thu gọn Mở gần đây / Lịch sử chạy nhớ sau khi mở lại
- [ ] V1 Thẻ node mới trên canvas app thật (`wails dev`): kéo nối từ chấm cổng nhỏ (8 px) vẫn dễ trúng; rê chuột vào chấm cổng chưa nối → tooltip "chưa nối: …"; rê vào thẻ có chip ("1 input", "thử lại 2") → tooltip; mở kịch bản cũ rồi bấm *Sắp xếp lại* → dàn đều; xem cả theme sáng + tối (màu nhóm đọc rõ)

## 37 – Phần tử màn hình qua Accessibility · [phase3/37-phan-tu-man-hinh.md](phase3/37-phan-tu-man-hinh.md)

- [ ] E4 Đọc cạnh nhãn (cần thêm quyền Screen Recording): Mẫu thử **Phần tử – đọc chữ cạnh nhãn (OCR)** → lời kết thúc ghi *Số dư 5430000* (số vẽ bằng canvas) và giá cũ → giá mới (chỉ số); inspector Đọc phần tử: *Tìm theo* Chữ (OCR) bỏ được lựa chọn *Chính nó*, Thử tìm nhãn thấy đúng chỗ, gõ mẫu lọc sai `(\d+` → báo đỏ; thử trên app thật có giá trị không đọc được qua cây (game / canvas). Xem cả theme sáng + tối
- [ ] E3 Chờ / Click theo phần tử (Chrome thường mở `element.html` hoặc trang thật): bảng thêm node → Click theo phần tử; **Chọn trên màn** → bấm nút “Mua ngay” / nút chỉ có icon → ô cách tìm tự điền (text="…" / aria="…"), khung hiện đúng chỗ trên overlay; **Thử tìm** thấy đúng, đổi chữ sai → liệt kê phần tử đang có; chạy node bấm trúng. Bấm vào chỗ trống / ảnh không có chữ → báo lỗi rõ
- [ ] E2 Mẫu thử (Chrome thường làm trình duyệt mặc định, cấp quyền Accessibility cho app / terminal): **Phần tử – đọc giá đang đổi** → lời kết thúc ghi đúng giá đang hiện + nam@example.com; **Phần tử – bấm nút chỉ có icon** → trái tim tô đậm, thành công; **Phần tử – nút dưới cuối trang** → trang tự cuộn xuống, bấm trúng XÁC NHẬN ĐƠN, thành công. Lần đầu với một app có thể chậm ~0,5–2 s (app dựng cây). Thử lại khi Chrome ở desktop (Space) khác / thu nhỏ → chờ hết giờ, lỗi ghi *không có cửa sổ đang hiện*. Tắt quyền Accessibility → lỗi quyền ngay
- [ ] E2 Inspector Đọc phần tử: thêm từ bảng (nhóm Ứng dụng – đổi ở 38 V0), gõ `css=.x` → báo đỏ chỉ dùng text= / aria= / role=; ô App nhận `{{biến}}`. Xem cả theme sáng + tối

## 35 – Node nâng cao · [phase3/35-node-nang-cao.md](phase3/35-node-nang-cao.md)

- [ ] N8 mẫu: **Tìm và mở app trên máy** (Calculator mở lên; tắt bộ gõ tiếng Việt), **Mở Spotify và phát nhạc** (cần Spotify đăng nhập sẵn), **Săn sale – chờ đúng giờ mở bán** (nhập giờ ~1 phút sau: trang ghi đặt được sau giờ mở bán vài chục ms), **Chụp vùng rồi báo qua HTTP** (HTTP 200)
- [ ] N7 Vẽ đường: Mẫu thử → **Vẽ đường – sao, tròn, chữ nhật, đường gấp khúc** → Chạy: Bảng vẽ có 4 vệt đúng hình, *Số lần kéo* = 4. Overlay (👁): nét viền hiện trước đúng hình; đường gấp khúc có marker n·1, n·2… kéo được, nét đổi theo. Xem trước: con trỏ giả đi đúng nét, giữ chuột. Inspector: thêm / xoá điểm, Khép kín, đổi sang Sao giữ tâm ở giữa. Xem cả theme sáng + tối
- [ ] N6 Chờ đến giờ: Mẫu thử → **Chờ đến giờ – bấm MUA NGAY đúng giờ** → Chạy, nhập giờ ~1 phút sau (vd 20:15:00.000): thanh mini *chờ đến giờ – còn …* đếm ngược, đúng giờ trang ghi *bấm lúc 20:15:00.0xx*; lời kết thúc ghi trễ vài chục ms. Bấm Dừng / tạm dừng giữa lúc chờ ăn ngay. Inspector: xem trước *Còn … / Đã qua …* đổi theo 3 lựa chọn; giờ sai dạng báo đỏ. Xem cả theme sáng + tối
- [ ] N5 Âm lượng: Mẫu thử → **Hệ thống – giảm rồi tăng âm lượng** → Chạy: thanh âm lượng giảm rồi về mức cũ, lời kết thúc ghi 2 mức. Inspector: kéo thanh trượt = ô %; Tắt tiếng / Bật tiếng chạy được. Xem cả theme sáng + tối. Windows (khi có máy): đặt / tăng / giảm / tắt tiếng qua Core Audio
- [ ] N4 Tệp / thư mục: Mẫu thử → **Tệp / thư mục – ghi nhật ký, thêm dòng Excel, dọn file tạm** → Chạy: hiện hộp *Kịch bản này sẽ xoá file* (Huỷ thì không chạy) → Cho phép → `~/Documents/ghosthand-mau-thu` có nhat-ky.txt, don-hang.csv (mở bằng Excel đúng tiếng Việt), don-hang.xlsx (sheet *Đơn hàng*); 2 file tam-*.txt nằm trong Thùng rác. Chạy lại: không hỏi nữa, csv / xlsx thêm dòng. Đổi mẫu tên → hỏi lại. Node *Dọn Thùng rác*: macOS hỏi quyền điều khiển Finder lần đầu. Đặt thư mục `/` hoặc `~` → node báo bị chặn. Xem cả theme sáng + tối. Windows (khi có máy): Recycle Bin, dọn Thùng rác
- [ ] N3 HTTP: Mẫu thử → **HTTP – gọi API, đọc JSON trả về** → Chạy (cần mạng): lời kết thúc ghi HTTP 200, tên “Lan "Hà"”, từ khoá “cà phê & trà”. Inspector: Method + URL một hàng; đổi GET → POST mở sẵn thân JSON; thêm Header `Authorization` → hiện 🔒; JSON sai cú pháp → báo đỏ; Form hiện bảng trường. Đổi URL sang `https://httpbin.org/status/404` → node Thất bại, nhật ký ghi HTTP 404. Xem cả theme sáng + tối
- [ ] N2 Clipboard: Mẫu thử → **Clipboard – ghi, dán, copy lại** → Chạy: ô hiện “Dán từ clipboard: Xin chào Lan!”, lời kết thúc ghi lại đúng chữ. Node Clipboard *Ghi ảnh* với `{{n?.output.path}}` của node Chụp màn hình → dán vào chat ra ảnh. Windows (khi có máy): đọc / ghi tiếng Việt, ghi ảnh
- [ ] N1 Chụp màn hình: Mẫu thử → **Chụp màn hình – chụp chỗ thấy chữ + cả màn** → Chạy: 2 ảnh trong `~/Pictures/Ghosthand` (thư mục ảnh trong Cài đặt), dán (Cmd+V) vào app chat ra ảnh chữ ĐÃ XONG. Inspector: đổi *Chụp* qua 4 kiểu; *Vùng cố định* → **Khoanh trên màn hình…** → overlay ghi *Dùng vùng này* → về inspector đã có X / Y / W / H; *Cả màn* liệt kê đúng các màn đang cắm. Xem cả theme sáng + tối. Windows (khi có máy): chép ảnh vào clipboard
- [ ] N0 mô tả node: Ctrl/Cmd+K → rê chuột / phím mũi tên qua các mục, khung dưới đổi mô tả theo mục, bảng không giật; inspector có thẻ mô tả dưới tab Node, × ẩn → mở node khác vẫn ẩn, ⓘ hiện lại, tắt app mở lại vẫn nhớ – xem cả theme sáng + tối

## 25d – Ghi chú node web · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Ctrl/Cmd+K: nhóm *Web (trình duyệt)* nằm cuối, dưới tên nhóm có dòng *Chỉ dùng cho trang web cơ bản…*; inspector node web và node Mở chọn *Chrome của app* hiện cùng ghi chú; node web vẫn thêm / chạy như cũ – xem cả theme sáng + tối

## 34 – Thao tác giống người · [phase3/34-giong-nguoi.md](phase3/34-giong-nguoi.md)

- [ ] Mẫu thử → **Thao tác giống người – vệt chuột, nhịp gõ** → Chạy: vệt chuột trên trang cong, không nhảy; *Điểm chuột / lần di* hàng chục, *Giữ nút* 60–150 ms, nhịp gõ lệch. Cài đặt chạy → **Tắt** → chạy lại: 1–2 điểm mỗi lần di, cong 0 px
- [ ] Bấm Dừng / F8 / rê chuột vào góc khi chuột đang đi giữa đường → dừng ngay, không bấm thêm; chuột đi gần mép / góc màn không tự kích hoạt dừng khẩn cấp
- [ ] Kịch bản mới: Cài đặt chạy mặc định **Vừa**; inspector node Click / Gõ có ô *Thao tác giống người* (Theo kịch bản / Tắt / …), node web chạy nền thì không có; thẻ node ghi đè có chip – xem cả theme sáng + tối
- [ ] Overlay → **Xem trước** kịch bản mức Vừa / Cao: con trỏ giả đi đường cong, chậm – nhanh – chậm, đôi khi đi lố rồi khựng + chỉnh; vệt vẽ cong theo đường đã đi; kéo thả cong trong thời gian kéo; node ghi đè Tắt (hoặc kịch bản Tắt) bay thẳng như cũ; bấm Dừng giữa đường dừng ngay
- [ ] Kéo thả (kanban) và double click vẫn ăn khi bật giống người; Windows (khi có máy): click giữ nút + đường chuột đúng chỗ khi DPI 125 %

## 20 F5c – Output mọi node + ô số nhận biến · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] Mẫu thử → **Ô số từ biến – số click, nhịp, thời gian chờ** → Chạy: ô Click trái = 5; lời kết thúc ghi thời gian click + thời gian đã chờ gần bằng nhau; form Chạy hỏi *Nhịp giữa các click*
- [ ] Inspector node Click: bấm **{x}** cạnh *Số click* → ô biến chiếm cả hàng, gõ `{{` gợi ý output node trước (cả `startedAt`, `durationMs`); bấm lại {x} với ô là `4` → về ô số = 4. Ô đang ghim input thì {x} mờ – xem cả theme sáng + tối
- [ ] Gõ sai ô biến (vd `{{n1.status}}`, `abc`) → Chạy báo lỗi rõ ở node đó; biến ra 0 cho Số click → node Thất bại “số click phải ≥ 1”

## 20 F5b – Toạ độ nhận biến · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] Mẫu thử → **Kanban – kéo theo toạ độ từ biến** → Chạy: thẻ VIỆC 1 sang cột HOÀN TẤT (HOÀN TẤT = 1); thử với Chrome zoom 125% vẫn đúng
- [ ] Inspector node Click: Vị trí → **Biến** → ô X / Y điền sẵn số hiện tại; chọn *Điền chỗ thấy… → n1* ra `{{n1.output.x}}` / `{{n1.output.y}}`, sửa thành `+ 20`; marker trên overlay của node biến mất, thẻ ghi `X {{n1.output.x}} + 20`; bấm **Số** lại → về điểm cũ. Xem cả theme sáng + tối
- [ ] Gõ sai (vd `{{n1.output.text}}`, `{{n1.output.x}} +`) → Chạy báo lỗi rõ ở node đó trước khi chạy; Kéo thả B *Lệch so với A* + Biến → ô ghi ΔX / ΔY

## 20 F6 – Thanh mini nổi trên app toàn màn hình · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] Chạy từng node (F10) → sang Chrome / app khác **toàn màn hình**: thanh mini vẫn hiện, bấm được nút chạy tiếp / dừng; overlay (chọn điểm, Thử tìm) cũng hiện trên app toàn màn hình
- [ ] Trong lúc thanh mini / overlay: icon Dock của app tạm ẩn (đúng như thiết kế); về màn chính icon Dock + menu Edit (Cmd+C / V trong ô nhập) trở lại, Cmd+Tab thấy app
- [ ] Thanh mini không giành focus: đang chạy kịch bản gõ phím vào app khác vẫn gõ đúng chỗ

## 33 – Kịch bản mẫu để test · [phase3/33-mau-thu.md](phase3/33-mau-thu.md)

- [ ] `wails dev` → Thư viện → **Mẫu thử…**: lọc theo kiểu / loại bước, tìm không dấu; *Mở sân thử* mở danh sách trang trong trình duyệt
- [ ] *Dùng mẫu* khi đang có thay đổi chưa lưu → hỏi lưu; mở xong là kịch bản mới chưa có file, Lưu hỏi chỗ lưu
- [ ] Chạy vài mẫu từ app (Click nhiều lần, Kéo thả, Form đăng nhập nhập sai mật khẩu, Kanban, Quiz): trang sân thử hiện đúng kết quả (đã chạy tự động 31 / 31 bằng engine – còn thử qua nút Chạy, thanh mini, F8)
- [ ] Click / bấm theo chữ trong app thật khác (không phải sân thử) không chậm đi rõ (mỗi lần di chuột chờ thêm 40 ms)

## 32 – Tách Go thành package · [phase3/32-go-packages.md](phase3/32-go-packages.md)

- [ ] `wails dev`: app mở được, nháp lần trước khôi phục, mở / lưu kịch bản, danh sách mở gần đây, đổi theme
- [ ] Chạy một kịch bản có click + chờ ảnh / chữ + node điều khiển: thanh mini, F8 dừng, chuột chạm góc dừng; lịch sử chạy có lần mới (kèm ảnh khi node lỗi)
- [ ] Thử tìm ảnh / chữ, Thử node, Lấy màu, chụp ảnh mẫu trên overlay; form Chạy nhớ giá trị input lần trước

## 20 F5 – Lúc chạy, nhật ký, lịch sử, debug · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] Chạy ví dụ Facebook (`examples/thu-node-dieu-khien.json`): về màn chính thấy bảng Nhật ký, đường đã đi sáng, ×n trên node lặp; bấm dòng chọn node; node lỗi có ảnh màn hình
- [ ] Node Kết thúc thành công có lời nhắn → "Xong: …" ở thanh trạng thái
- [ ] Lịch sử chạy trong thư viện: chạy vài lần, mở lại lần cũ; mở kịch bản khác thì danh sách đổi theo
- [ ] Debug: đặt Điểm dừng ở một node → Chạy dừng trước node đó (thanh mini), F10 / nút chạy từng node, Tiếp tục; *Từ node này*; *Từng node*

## 20 F3 – Node điều khiển · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] ví dụ Facebook bằng Switch theo màn hình + Đếm + Kết thúc; Nếu thấy ảnh (khoanh ảnh mẫu cho điều kiện), màu (chọn điểm, Lấy màu); Thử node vẽ khung trên overlay – file thử `examples/thu-node-dieu-khien.json`
- [ ] Lời nhắn node Kết thúc thất bại hiện ở "Lỗi lần chạy trước" (thanh trạng thái), node đó được chọn trên canvas

## 20 F4b – Canvas trong app · [phase3/20-flow.md](phase3/20-flow.md)

- [ ] soạn ví dụ Facebook bằng canvas (node hành động + cạnh `fail` quay lại), thả cổng ra chỗ trống thêm node, đặt điểm liên tiếp trên overlay, hoàn tác, chạy thật
- [ ] Thay cho kiểm tra 25b cũ: chờ chữ không thấy → thử lại 2 lần → cạnh `fail` sang node cuộn rồi quay lại chờ chữ

## 25e – Tìm theo chữ · [phase3/25e-ocr.md](phase3/25e-ocr.md)

- [ ] kịch bản Facebook đổi sang Chờ chữ / Click theo chữ

## 25 – Chờ ảnh / click theo ảnh / chờ pixel · [phase3/25-cho-anh.md](phase3/25-cho-anh.md)

- [ ] khoanh nút trên trang web → Thử tìm → chạy chờ ảnh + click theo ảnh khi cửa sổ dời chỗ; chờ pixel đổi màu; thanh mini khi đang chờ

## 30 – Sửa nhiều điểm · [phase3/30-sua-nhieu-diem.md](phase3/30-sua-nhieu-diem.md)

- [ ] Chọn 5 điểm, co giãn 150%, xoay 10°, xiên, lật → overlay và lần chạy thật khớp; hoàn tác / làm lại

## 17 – Đa màn hình (macOS) · [phase1-mvp.md](phase1-mvp.md)

- [ ] macOS 2 màn: đổi màn trên overlay, đặt điểm / chọn vùng ở màn phụ, Xong → main về đúng chỗ cũ
- [ ] macOS: dừng khẩn cấp ở góc màn phụ, góc tiếp giáp 2 màn không dừng nhầm; overlay hiện "tỷ lệ 1.00"

## Chờ máy Windows

- [ ] Bước 17: scale 100% / 125% / 150% và 2 màn khác scale; 23: mở URL / app (PowerShell `Start-Process`), cuộn theo nấc – làm cùng bước 18 ([phase1-mvp.md](phase1-mvp.md))

## Tạm hoãn – node web qua Chrome của app · [phase3/36-chrome-app-sau.md](phase3/36-chrome-app-sau.md)

Người dùng chốt 2026-10-18: việc qua Chrome của app làm sau cùng – thử khi làm 36.

### 25d D4b – Node web: chạy nền · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Tắt hẳn Chrome của app (đã mở từ trước thì chưa có cờ chạy nền) → Mẫu thử → **Web: chạy nền** → Chạy, ngay sau khi trang mở thì chuyển sang app khác / thu nhỏ Chrome: chuột không động, kết thúc thành công “XIN CHÀO DEMO, lăn … lần”
- [ ] Inspector node Click / Gõ / Cuộn / Chờ phần tử web: *Điều khiển* Chuột thật / Chạy nền + dòng giải thích đổi theo; node Đọc không có lựa chọn này; thẻ node hiện “· chạy nền” – xem cả theme sáng + tối
- [ ] Chạy nền khi Chrome zoom 125% và khi tab đích không phải tab đang hiện (tab khác đang mở trên cùng cửa sổ) → vẫn bấm đúng phần tử

### 25d D4a – Node web: gõ, đọc, cuộn · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Ctrl+K nhóm *Web (trình duyệt)* có Gõ vào ô web / Đọc phần tử web / Cuộn trang web; inspector từng loại (công tắc Xoá chữ cũ / Enter, Đọc: chữ / giá trị ô / thuộc tính + ô tên, Cuộn: 3 cách + hướng / số nấc / khung) – xem cả theme sáng + tối
- [ ] Mẫu thử → **Web: đăng nhập, đọc kết quả** → Chạy: gõ vào đúng ô, lần sai hiện chữ đỏ, lần đúng ra XIN CHÀO DEMO, kết thúc thành công
- [ ] Mẫu thử → **Web: cuộn feed tới bài đặc biệt** và **Web: cuộn trong khung + tới phần tử** → Chạy: chuột lăn thật (feed tải thêm), dải ngang lăn mà trang không chạy, dừng ở MỤC 30
- [ ] Node Đọc → **Thử tìm** hiện “đọc được “…”” + số phần tử khớp; node Gõ trỏ nhầm vào nút (không phải ô) → cổng Thất bại “ô nhập không nhận focus”, không gõ bậy

### 25d D3 – Node web: Chọn phần tử, Thử tìm, trạng thái · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Inspector node Chờ / Click phần tử web: dòng trạng thái “Chrome của app: chưa mở” → bấm Mở → Chrome riêng bật, trạng thái thành “đang mở, 1 tab”; xem cả theme sáng + tối
- [ ] Mở trang sân thử web trong Chrome của app → **Chọn phần tử trên trang** → Chrome lên trước, viền cam theo chuột, bấm nút “Đồng ý” → app tự lên lại, ô cách tìm điền 2–3 dòng (`text=Đồng ý`, `role=button[name=…]`…), trang **không** nhận click đó; thử Esc / Huỷ chọn
- [ ] Chọn ô đồng ý trong iframe (mẫu Web: thanh toán trong iframe) → ra `role=checkbox…`
- [ ] **Thử tìm**: lần đầu chuột đi vào trang đo toạ độ rồi app lên lại, báo “Thấy … tại X Y · ms” + chữ; “xem trên màn hình” → khung xanh đúng chỗ phần tử; phần tử bị popup cookie che → báo bị che (khung vàng); phần tử dưới màn hình → “ngoài khung nhìn, lúc click sẽ tự cuộn tới”

### 25d D2 – Node web: trước khi bấm, iframe, role · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Mẫu thử → **Web: thanh toán trong iframe** → Chạy: tick ô đồng ý, chờ nút Thanh toán trượt xong mới bấm, hiện ĐÃ THANH TOÁN, *Click thật* = 2
- [ ] Kéo cửa sổ Chrome của app xuống để nút “Xem lịch sử” / Thanh toán rơi vào chỗ **Dock che** rồi chạy mẫu → node tự cuộn phần tử lên giữa rồi bấm trúng (không bấm vào Dock)
- [ ] Trong lúc node webClick đang chờ: đặt một cửa sổ app khác (luôn trên cùng, vd thanh mini) đè lên nút → không bấm nhầm; hết giờ báo “chưa bấm được: …” rõ lý do

### 25d D1 – Node web (chờ / click phần tử) · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] `wails dev` → Mẫu thử → **Web: mở lịch sử đơn hàng** → Chạy: lần đầu app bật Chrome riêng (profile của app), chạy hết tới LỊCH SỬ ĐƠN HÀNG, ô *Click thật* tăng; chạy lại lần 2 → mở tab mới trong Chrome đó (không bật Chrome thứ hai)
- [ ] Trong lúc chạy mẫu: dời cửa sổ Chrome / zoom 125% (Cmd +) / mở DevTools rồi chạy lại – vẫn bấm trúng (đo lại toạ độ)
- [ ] Tắt Chrome của app rồi chạy một node web (không có node Mở trước) → lỗi rõ “Chrome của app chưa mở…” (mã `browser`), không treo
- [ ] Inspector: thêm node qua Ctrl+K nhóm *Web (trình duyệt)*; nhập nhiều dòng selector, `{{biến}}` trong selector; node Mở chọn “Chrome của app”
- [ ] Trang thật đăng nhập (vd Facebook) trong Chrome của app: đăng nhập một lần, lần sau profile còn nhớ

### 25d D0 – Đo toạ độ web · [phase3/25d-web-dom.md](phase3/25d-web-dom.md)

- [ ] Cắm màn ngoài (khác DPI Retina) rồi chạy `go run -tags probe ./cmd/d0probe -scenario all` – tình huống `display2` lệch ≤ 2 px (chuột sẽ tự di chuyển + bấm ~1 phút, đừng động vào chuột)
- [ ] Khi có máy Windows: chạy lại trên màn DPI 125% (sửa `-chrome` trỏ tới chrome.exe; phím zoom là Ctrl) – dán kết quả vào file bước

### 43 A – Cho AI nhìn theo phần tử · [phase3/43-node-chuyen-sau.md](phase3/43-node-chuyen-sau.md)

- [ ] Claude gọi `screenshot marks=true` trên Chrome thường / Finder (macOS): ảnh có số đỏ / xanh đúng chỗ nút, danh sách `#N` khớp; `suggest_selector {mark}` trả selector `unique` chạy được trong node *Click theo phần tử*
- [ ] `describe_screen elements=true` trả cây gọn (không có hàng trăm dòng trang trí); `screen_changes start` → bấm mở popup → `end` báo phần tử mới + cửa sổ mới
- [ ] Inspector node Click/Chờ theo phần tử: *Chọn trên màn* một nút → hiện danh sách gợi ý (duy nhất / N chỗ, bền / dễ hỏng); bấm một dòng đổi ô *Cách tìm* + *Chỗ thứ*
- [ ] AI chạy `run_script shots: each`: node mở popup có `changes.added`; node lỗi sau đó có `error.detail.changes`
- [ ] (fix focus click, macOS) Mở Chrome thường, để cửa sổ khác (terminal) ở trước, AI chụp màn hình rồi `run_step` click vào nút trên trang → cú click đầu ăn ngay (không phải click hai lần); chạy trong app (F8) cũng vậy
- [ ] (53) Cài đặt → AI (MCP): cho AI chạy vài lệnh (đọc, chạy kịch bản có `{{secret.x}}`) → mục *Lệnh AI gần đây* hiện giờ, tool, client, thời lượng; bấm một dòng thấy tham số, mật khẩu / token hiện `••••`; Claude Desktop / ChatGPT thấy tool đọc không hỏi quyền, tool chạy thì hỏi (tuỳ client)
