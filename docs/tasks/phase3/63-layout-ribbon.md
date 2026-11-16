# 63. Layout chính kiểu ribbon (Word)

- [ ] **63. Layout chính kiểu ribbon** *(người dùng yêu cầu 2026-11-16, đã duyệt design `design/mockup-ribbon.html`)* – trên cùng là thanh tiêu đề + ribbon theo tab gom mọi nút; phần dưới chỉ còn canvas để kéo thả; viền resize quanh cửa sổ (hiện ở màn soạn không nắm kéo được).
  - Đã chốt theo mockup (2026-11-16): thư viện kịch bản, Mở gần đây, Mẫu thử, Lịch sử chạy, Thùng rác, Cài đặt chuyển vào **trang Tệp** (backstage toàn cửa sổ) – bỏ thanh bên trái; inspector **nổi** trên canvas, chỉ hiện khi chọn node, ghim được vào cạnh phải; tab *Chèn node* có nút từng loại node theo nhóm; nút Chạy + số vòng cố định bên phải hàng tab; zoom chuyển xuống status bar.
  - [ ] R1. Viền resize: tìm nguyên nhân không kéo được (frameless – nội dung phủ mép cửa sổ?) trên Windows + macOS, viền ~6px luôn nằm trên mọi lớp, tắt khi phóng to.
  - [ ] R2. Thanh tiêu đề mới: truy cập nhanh (Lưu / Hoàn tác / Làm lại), tên kịch bản giữa + chip Chưa lưu, Hướng dẫn, ⚙ Cài đặt (`Ctrl+,`), nút cửa sổ.
  - [ ] R3. Khung ribbon: hàng tab (Tệp, Soạn, Chèn node, Chạy, Xem, Công cụ) + thân theo nhóm (nút lớn / nhỏ, nhãn nhóm), nút giãn theo chữ (tối đa 2 dòng, không tràn), thu gọn `Ctrl+F1` / bấm đúp tab, cuộn ngang khi hẹp. Component chỉ hiển thị trong `components/ribbon/`, danh sách lệnh là dữ liệu thuần có test.
  - [ ] R4. Nối lệnh các tab vào store hiện có (chép / dán / nhóm / bật-tắt node / chạy / xem trước / kiểu thẻ / zoom / theme…); tab Chèn node lấy loại node từ `PaletteView` / danh mục node, không chép danh sách.
  - [ ] R5. Trang Tệp: Trang đầu (Mới + mẫu, kịch bản của tôi, lịch sử gần đây), Mở, Mẫu thử, Lưu / Lưu thành / Nhúng / Gói báo lỗi, Lịch sử chạy, Thùng rác – dùng lại component thư viện / lịch sử hiện có.
  - [ ] R6. Cài đặt thành trang trong Tệp (menu dọc 6 mục + tab con như `SettingsNav`), mở nhanh từ ⚙ / `Ctrl+,` / ribbon Công cụ.
  - [ ] R7. Main chỉ canvas: inspector nổi (Esc / ✕ ẩn, ghim cạnh phải, kéo mép đổi bề rộng), minimap nổi, status bar thêm thanh zoom + số node.
  - [ ] R8. Màn mẫu `#demo` / `#demo-flow` dùng layout mới; `design/DESIGN.md` + `ARCHITECTURE.md` cập nhật; Hướng dẫn (`internal/guide/`) sửa chỗ nói tới thanh bên / nút cũ.
  - *Chuẩn bị cho MCP:* không đổi định dạng kịch bản; chỉ sửa chữ Hướng dẫn nếu nhắc vị trí nút.
  - Kiểm tra tay: [checks.md](../checks.md) mục 63 (thêm khi xong code).
  - Xong khi: mở app chỉ thấy ribbon + canvas, mọi chức năng cũ tìm thấy trên ribbon / trang Tệp, kéo được mọi cạnh để resize trên Windows và macOS.
