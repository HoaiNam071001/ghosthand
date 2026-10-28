// Mô tả từng loại node cho người dùng (bước 35 N0) – bảng thêm node (khung dưới) + inspector (đầu form).
// Chữ cho người dùng, khác internal/model/steptypes.go (cho AI / MCP, đủ trường). Thêm loại node → thêm một dòng ở đây (test bắt thiếu).
import type { Step, StepType } from '../types';

// desc: làm gì; use: dùng khi nào / ví dụ.
export type NodeInfo = { desc: string; use: string };
// Biến thể hiện như loại riêng trên UI: Chờ chữ / Click theo chữ (findBy text), Mở trang bằng Chrome của app.
export type InfoKey = StepType | 'waitText' | 'clickText' | 'waitElement' | 'clickElement' | 'openWeb';

export const NODE_INFO: Record<InfoKey, NodeInfo> = {
  click: { desc: 'Bấm chuột tại một điểm trên màn hình, một hoặc nhiều lần.', use: 'Bấm nút, mở mục, chọn ô – khi chỗ cần bấm luôn nằm cố định.' },
  double: { desc: 'Nhấp đúp chuột tại một điểm.', use: 'Mở file / thư mục, chọn cả một từ, phóng to cửa sổ.' },
  hold: { desc: 'Nhấn giữ chuột tại một điểm trong một khoảng thời gian rồi nhả.', use: 'Nút phải giữ mới chạy (giữ để xác nhận, giữ để ghi âm).' },
  drag: { desc: 'Nhấn chuột ở điểm A, kéo tới điểm B rồi nhả.', use: 'Kéo thẻ kanban, kéo file vào thư mục, kéo thanh trượt, bôi đen chữ.' },
  wait: { desc: 'Đứng yên một khoảng thời gian rồi chạy tiếp.', use: 'Đợi trang / app tải khi không có ảnh hay chữ nào để chờ.' },
  type: { desc: 'Gõ một đoạn chữ vào ô đang được chọn, nhận {{biến}}.', use: 'Điền form, ô tìm kiếm, tin nhắn – thường đặt sau node Click vào ô.' },
  key: { desc: 'Bấm một phím hoặc tổ hợp phím (Enter, Ctrl+C, Cmd+Space…).', use: 'Gửi bằng Enter, copy / paste, chuyển tab, mở ô tìm app của máy.' },
  scroll: { desc: 'Lăn chuột lên / xuống / sang ngang một số nấc, tại chỗ chuột hoặc một điểm.', use: 'Xem thêm nội dung trong trang, danh sách dài, feed.' },
  open: { desc: 'Mở trang web, file hoặc app trên máy; URL nhận {{biến}}.', use: 'Đầu kịch bản: mở YouTube với từ khoá, bật Spotify, mở file Excel.' },
  openWeb: { desc: 'Mở trang web bằng Chrome riêng của app để các node Web tìm được phần tử trong trang.', use: 'Đặt trước các node Chờ / Click / Gõ / Đọc phần tử web.' },
  waitImage: { desc: 'Chờ tới khi ảnh mẫu (nút, biểu tượng) hiện trên màn hình, cho biết vị trí tìm thấy.', use: 'Đợi trang tải xong, đợi hộp thoại hiện, kiểm tra đã đăng nhập chưa.' },
  waitText: { desc: 'Chờ tới khi một dòng chữ hiện trên màn hình (đọc chữ bằng OCR), cho biết vị trí.', use: 'Đợi thông báo “Thành công”, đợi tên nút hiện – không cần chụp ảnh mẫu.' },
  clickImage: { desc: 'Tìm rồi bấm vào đó – chọn cách tìm ngay trong node: ảnh mẫu, dòng chữ hoặc phần tử.', use: 'Nút đổi chỗ theo cửa sổ; bấm theo tên hiện trên màn, vd “Đăng nhập”.' },
  waitElement: { desc: 'Chờ tới khi một phần tử (nút, ô, chữ) có trong cửa sổ app – đọc qua Accessibility, không chụp màn hình.', use: 'Đợi nút / giá ở Chrome thường đã đăng nhập hoặc app khác hiện ra.' },
  clickElement: { desc: 'Tìm phần tử theo chữ / nhãn / vai trò qua Accessibility rồi bấm bằng chuột thật.', use: 'Bấm nút chỉ có icon, nút ở Chrome thường đã đăng nhập.' },
  clickText: { desc: 'Tìm một dòng chữ trên màn hình rồi bấm vào đó.', use: 'Bấm nút / liên kết theo tên hiện trên màn, vd “Đăng nhập”, “Xem thêm”.' },
  waitPixel: { desc: 'Chờ tới khi một điểm trên màn hình có đúng màu cho trước.', use: 'Đèn trạng thái đổi màu, thanh tiến độ đầy, nút chuyển từ xám sang xanh.' },
  findAll: { desc: 'Tìm mọi chỗ có ảnh mẫu / chữ / phần tử trên màn hình, cho biết số chỗ và vị trí từng chỗ.', use: 'Bấm lần lượt mọi nút “Thêm”: nối vào Lặp qua danh sách rồi click theo item.x / item.y.' },
  waitScreen: { desc: 'Chờ tới khi một vùng màn hình đứng yên (trang tải xong, hiệu ứng dừng) hoặc đổi khác so với lúc bắt đầu.', use: 'Thay Chờ cố định sau khi mở trang / bấm nút: xong là đi tiếp, không chờ thừa.' },
  screenshot: { desc: 'Chụp vùng kịch bản, cả màn, vùng cố định hoặc đúng chỗ node trước thấy, lưu PNG; chép vào clipboard được.', use: 'Lưu bằng chứng sau khi đặt hàng / chuyển tiền, chụp kết quả để gửi đi.' },
  clipboard: { desc: 'Đọc chữ đang có trong clipboard vào biến, ghi chữ (nhận {{biến}}) hoặc ghi ảnh PNG từ file.', use: 'Copy / paste: ghép với Phím tắt Cmd/Ctrl+C, Cmd/Ctrl+V; chép ảnh vừa chụp để dán vào chat.' },
  http: { desc: 'Gọi API (GET / POST / PUT / PATCH / DELETE) kèm tham số, header, thân JSON / form; đọc kết quả JSON vào biến.', use: 'Lấy dữ liệu từ server, gửi đơn / tin nhắn qua API, báo kết quả chạy về Telegram / webhook.' },
  file: { desc: 'Ghi chữ vào file, thêm dòng vào bảng .csv / .xlsx, tạo thư mục, xoá file vào Thùng rác hoặc dọn Thùng rác.', use: 'Lưu nhật ký / kết quả từng vòng vào Excel, dọn ảnh chụp cũ trong thư mục.' },
  power: { desc: 'Khoá màn, tắt màn hình, ngủ, đăng xuất, tắt hoặc khởi động lại máy – hành động mất phiên cần bạn đồng ý và đếm ngược để huỷ.', use: 'Tắt máy khi chạy xong việc dài qua đêm; khoá màn sau khi làm xong.' },
  display: { desc: 'Đổi chế độ sáng / tối, độ sáng màn hình, loa / micro mặc định, phát âm báo; hoặc đọc trạng thái hiện tại.', use: 'Chuyển sang tai nghe trước cuộc gọi, phát tiếng báo khi xong, tối màn hình khi chạy ban đêm.' },
  askAI: { desc: 'Hỏi AI bằng chữ, kèm ảnh màn hình nếu cần; nhận chữ hoặc JSON.', use: 'Đọc hiểu, phân loại, soạn trả lời. Câu hỏi và ảnh gửi nhà cung cấp, tốn tiền.' },
  notify: { desc: 'Hiện thông báo của hệ điều hành (Notification Center / toast Windows) với tiêu đề và nội dung.', use: 'Báo cho người ngồi máy khi kịch bản xong hoặc cần chú ý, kể cả khi app đang thu nhỏ.' },
  zip: { desc: 'Nén file / thư mục ra .zip hoặc giải nén .zip vào thư mục.', use: 'Gói kết quả trước khi gửi / tải lên; mở gói vừa tải về để lấy file bên trong.' },
  inputSource: { desc: 'Đọc hoặc đổi bộ gõ của máy (ABC ↔ Telex, en-US ↔ vi-VN).', use: 'Đặt ABC trước khi gõ để dấu không bị méo; rẽ nhánh theo bộ gõ đang dùng.' },
  process: { desc: 'Đọc CPU / RAM của tiến trình (cả tiến trình nền), chờ nó chạy / thoát / hết bận.', use: 'Chờ render / xuất file xong, dừng khi app ngốn quá nhiều RAM.' },
  sysInfo: { desc: 'Đọc pin, CPU / RAM, ổ đĩa còn trống, màn hình, mạng và tên máy trong một lần.', use: 'Rẽ nhánh theo tình trạng máy: pin yếu thì dừng, ổ gần đầy thì báo, mất mạng thì chờ.' },
  osShortcut: { desc: 'Chạy một Shortcut trong ứng dụng Phím tắt của macOS với input chữ và lấy chữ nó trả về.', use: 'Việc bạn đã làm sẵn thành Shortcut, như gửi tin hay đổi tên ảnh hàng loạt. Chỉ macOS.' },
  shell: { desc: 'Chạy một đoạn lệnh của máy (shell, PowerShell, AppleScript), lấy chữ in ra và mã thoát.', use: 'Việc chưa có node riêng, như đổi tên hàng loạt hay gọi công cụ dòng lệnh. Cần bạn đồng ý nội dung lệnh.' },
  system: { desc: 'Chỉnh âm lượng loa của máy: đặt mức, tăng / giảm, tắt / bật tiếng.', use: 'Bật nhạc nền vừa đủ nghe, tắt tiếng trước khi họp, giảm âm lượng ban đêm.' },
  waitUntil: { desc: 'Chờ tới đúng giờ hẹn (tới ms, có thể kèm ngày) rồi chạy tiếp; canh được theo giờ chuẩn internet.', use: 'Săn sale lúc 20:00:00, gửi tin nhắn đúng giờ, chạy việc mỗi ngày lúc 9:00.' },
  path: { desc: 'Giữ chuột kéo một nét liền qua nhiều điểm, hoặc vẽ hình tròn / chữ nhật / sao quanh một tâm.', use: 'Vẽ trong app vẽ, ký tên, mở khoá bằng hình vẽ, khoanh vùng trên bản đồ.' },
  webWait: { desc: 'Chờ phần tử trong trang web (theo chữ, nhãn, CSS…) hiện ra hoặc biến mất.', use: 'Đợi trang tải xong, đợi kết quả tìm kiếm – nhanh và chắc hơn chờ ảnh.' },
  webClick: { desc: 'Tìm phần tử trong trang web theo chữ / nhãn rồi bấm vào bằng chuột.', use: 'Trang hay đổi bố cục / theme khiến ảnh mẫu không còn khớp.' },
  webType: { desc: 'Tìm ô nhập trong trang web, bấm vào rồi gõ chữ (xoá chữ cũ nếu muốn).', use: 'Điền form đăng ký, ô tìm kiếm, bình luận.' },
  elementAction: { desc: 'Bấm, điền giá trị, tick hay chọn một phần tử thẳng qua Accessibility, không dùng chuột; cửa sổ bị che vẫn chạy.', use: 'Điền form, tick ô, bấm nút khi không muốn giành chuột; ô khó nhập thì dùng Gõ chữ.' },
  waitUIEvent: { desc: 'Chờ cửa sổ mới mở, đổi cửa sổ trên cùng, menu / hộp thoại hiện hoặc giá trị phần tử đổi – không chụp màn hình.', use: 'Sau nút mở hộp thoại chậm hiện, hoặc chờ app mở cửa sổ mới.' },
  waitDownload: { desc: 'Chờ một file tải về xong trong thư mục Tải xuống (hết đuôi tạm, cỡ ngừng tăng) rồi đưa ra tên + đường dẫn.', use: 'Đặt sau nút Tải / Xuất file trên web, rồi mở hoặc đọc file đó.' },
  readTable: { desc: 'Đọc cả bảng (table / grid) trên trang Chrome thường hoặc app thành dòng + cột, không OCR; ghi ra .csv / .xlsx được.', use: 'Lấy bảng đơn hàng, bảng giá rồi lặp từng dòng hoặc lưu thành file Excel.' },
  readDocument: { desc: 'Đọc nguyên văn nội dung ô soạn thảo / tài liệu đang mở (giữ xuống dòng) hoặc đoạn đang chọn.', use: 'Lấy cả ghi chú trong Word / TextEdit để lọc hoặc tách dòng (macOS).' },
  pageText: { desc: 'Đọc mọi chữ đang hiện trong cửa sổ app / trang Chrome thường (hoặc một khung), không OCR.', use: 'Lấy cả bảng giá, danh sách trên trang đã đăng nhập rồi tách / lặp từng dòng (macOS).' },
  elementRead: { desc: 'Đọc chữ / giá trị của phần tử trong cửa sổ app đang mở (Chrome thường, app khác) – chữ chính xác, không qua OCR.', use: 'Lấy giá, số dư, nội dung ô nhập trên trang đã đăng nhập sẵn (macOS).' },
  webRead: { desc: 'Đọc chữ, giá trị hoặc thuộc tính của phần tử trong trang web vào biến.', use: 'Lấy giá, mã đơn, số dư, link để node sau dùng hoặc so sánh.' },
  webKey: { desc: 'Bấm phím vào trang trên Chrome của app – không cần Chrome ở trước, không đụng bàn phím thật.', use: 'Esc đóng hộp thoại, Tab sang ô kế, Enter gửi form – phím không rơi vào app khác.' },
  webScroll: { desc: 'Cuộn trang web tới phần tử, cuộn trong một khung, hoặc cuộn tới khi thấy phần tử.', use: 'Đưa nút cuối trang vào tầm nhìn, lăn feed tới bài cần tìm.' },
  window: { desc: 'Đưa cửa sổ lên trước, chờ mở / đóng, đặt vị trí + cỡ, thu nhỏ hay đóng.', use: 'Đầu kịch bản: cố định cửa sổ để toạ độ click, ảnh mẫu không lệch giữa các lần chạy.' },
  browserTab: { desc: 'Đọc, liệt kê, chuyển, mở, đóng, tải lại tab của Chrome / Edge / Cốc Cốc bạn đang dùng.', use: 'Đóng đúng tab node Mở vừa mở; rẽ nhánh theo URL / tiêu đề tab.' },
  savePdf: { desc: 'In tab Chrome / Edge… ra file PDF qua hộp in + hộp lưu file (chỉ macOS). Đích hộp in phải là Lưu dưới dạng PDF.', use: 'Lưu hoá đơn, báo cáo, trang đã đăng nhập thành PDF để gửi hoặc lưu trữ.' },
  browserNorm: { desc: 'Đưa cửa sổ Chrome / Edge… về trạng thái chuẩn: thoát toàn màn hình, đặt cỡ, zoom 100 %.', use: 'Ngay sau node Mở, trước click theo ảnh / chữ để toạ độ không lệch.' },
  browserGo: { desc: 'Đổi trang ngay trong tab đang dùng (không mở tab mới) rồi chờ trang tải xong.', use: 'Lần lượt mở các trang trong cùng một tab, URL ghép từ biến.' },
  app: { desc: 'Kiểm tra app đang chạy (rẽ nhánh), chờ app mở xong / thoát hẳn, thoát hay buộc thoát app.', use: 'App chưa chạy thì Mở rồi chờ có cửa sổ; cuối kịch bản tắt app.' },
  if: { desc: 'Kiểm tra điều kiện (thấy chữ / ảnh / màu, so giá trị) rồi đi nhánh Đúng hoặc Sai.', use: 'Đã đăng nhập thì bỏ qua bước đăng nhập; hết hàng thì dừng.' },
  switch: { desc: 'So một giá trị (input, kết quả node trước) với nhiều trường hợp, mỗi trường hợp một nhánh.', use: 'Rẽ theo trạng thái đơn hàng, theo lựa chọn nhập lúc Chạy.' },
  switchScreen: { desc: 'Xem màn hình đang hiện gì (theo chữ / ảnh) rồi đi nhánh tương ứng.', use: 'Trang có thể ra nhiều kiểu: màn đăng nhập, captcha, trang chính…' },
  forEach: { desc: 'Chạy đoạn phía sau một lần cho mỗi phần tử của danh sách (dòng chữ, mảng JSON, file CSV / Excel), hết thì ra cổng Hết danh sách.', use: 'Làm cùng một việc cho từng khách hàng / đơn hàng / dòng dữ liệu.' },
  counter: { desc: 'Đếm số lần đi qua: còn lượt thì ra cổng Còn lượt, đủ số lần thì ra Hết lượt.', use: 'Lặp một đoạn N lần, giới hạn số lần thử lại.' },
  end: { desc: 'Kết thúc vòng chạy, ghi thành công hoặc thất bại kèm lời nhắn.', use: 'Cuối một nhánh: báo “Đã đặt hàng”, hoặc dừng với lỗi “Hết hàng”.' },
  calc: { desc: 'Tính một biểu thức từ số đọc được: cộng trừ nhân chia, làm tròn, so sánh, và / hoặc.', use: 'Tính tổng tiền, so giá với ngưỡng rồi rẽ nhánh bằng Nếu, đổi đơn vị.' },
  textMatch: { desc: 'Lấy phần chữ khớp một mẫu (regex) trong chữ đọc được – chỗ đầu hoặc mọi chỗ; không khớp thì ra Không khớp.', use: 'Lấy mã đơn, số điện thoại, email trong đoạn chữ dài; kiểm tra chữ có đúng dạng.' },
  textSplit: { desc: 'Tách chữ thành danh sách theo dấu phẩy, dấu chấm phẩy hay mỗi dòng.', use: 'Danh sách từ khoá “a, b, c” → Lặp qua danh sách làm từng cái.' },
  textClean: { desc: 'Làm sạch chữ: thay chữ, bỏ dấu, đổi hoa / thường, bỏ khoảng trắng thừa.', use: 'Chuẩn hoá tên trước khi so sánh, đổi “Đà Nẵng” thành “da-nang” cho URL.' },
  textNumber: { desc: 'Lấy số từ chữ kiểu “1.234.000 đ”, viết số có dấu ngăn nghìn, hoặc đọc và viết lại ngày giờ.', use: 'Đọc giá → lấy số → Tính toán so ngưỡng; ghi ngày hôm nay vào tên file.' },
  setVar: { desc: 'Đặt hoặc cộng một biến để node sau đọc bằng {{vars.tên}}.', use: 'Đếm số đơn đã xử lý, ghi lại kết quả giữa các nhánh.' },
};

// Mô tả cho một node cụ thể (biến thể theo cách tìm / trình duyệt).
export function infoKey(s: Pick<Step, 'type' | 'findBy' | 'imageSource' | 'webBrowser'>): InfoKey {
  if (s.findBy === 'text' && s.type === 'waitImage') return 'waitText';
  if (s.findBy === 'text' && s.type === 'clickImage' && s.imageSource === 'search') return 'clickText';
  if (s.findBy === 'element' && s.type === 'waitImage') return 'waitElement';
  if (s.findBy === 'element' && s.type === 'clickImage' && s.imageSource === 'search') return 'clickElement';
  if (s.type === 'open' && s.webBrowser) return 'openWeb';
  return s.type;
}

export const nodeInfo = (s: Pick<Step, 'type' | 'findBy' | 'imageSource' | 'webBrowser'>): NodeInfo => NODE_INFO[infoKey(s)];
