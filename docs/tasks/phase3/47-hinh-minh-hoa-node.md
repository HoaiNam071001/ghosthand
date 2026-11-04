# 47. Hình minh hoạ động cho từng node trong bảng Thêm node

- [x] **47. Hình minh hoạ động cho từng node** *(người dùng yêu cầu 2026-10-21)* – Ở bảng Thêm node (Ctrl/Cmd+K và canvas mẫu), chọn / rê chuột vào một loại node thì hiện **hoạt hoạ ngắn lặp lại** diễn tả node làm gì (kiểu GIF, nhìn là hiểu); chữ mô tả chỉ là phụ.
  - **Chốt 2026-10-21:** hoạt hoạ **vẽ bằng code** (SVG / CSS, theo theme sáng / tối – không file GIF / video); hiện ở **khung chi tiết phía dưới** lưới 3 cột (hình lớn bên trái, chữ ngắn bên phải; mỗi lúc chỉ chạy một hoạt hoạ); phạm vi **tất cả loại node một lượt** (~51 loại + node điều khiển).
  - [x] M1. **Khung**: `PaletteDetail` (trong `PaletteView`) đổi bố cục hình trái / chữ phải, cao cố định; ô hình nhận `illustration` theo loại node; loại chưa có hình → icon lớn (dự phòng); tôn trọng `prefers-reduced-motion` (đứng yên ở khung đẹp nhất)
  - [x] M2. **Bộ phần tử vẽ dùng chung** `components/palette/illus/`: màn hình giả, con trỏ + gợn click, bàn phím + phím sáng, ô chữ, khung ảnh được khoanh, đồng hồ, mũi tên nhánh – mỗi hoạt hoạ chỉ ghép + đặt thời gian; chuỗi chạy lặp ~2–3 s
  - [x] M3. Hình theo nhóm node (mỗi nhóm một file `illus/<nhóm>.tsx`, không dồn một file): chuột · phím · chờ · tìm ảnh / chữ / phần tử · rẽ nhánh / lặp · cửa sổ / ứng dụng · trình duyệt / web · dữ liệu / xử lý chữ · hệ thống (clipboard, HTTP, tệp, âm lượng…)
  - [x] M4. Bảng đăng ký `illus/index.ts` loại node → hình; **test**: mọi loại node trong `flow/nodeInfo.ts` đều có hình (thêm loại node mới mà thiếu thì test đỏ) – cập nhật skill `add-node-type` thêm mục "hình minh hoạ"
  - [x] M5. Màn mẫu `#demo-flow` dùng chung `PaletteView` nên thấy ngay hình; chạy thử trên trình duyệt không cần Go
  - [x] M6. *(người dùng yêu cầu 2026-10-21)* Inspector: bấm loại node (dưới tên) mở **modal bảng node** (`palette/ChangeTypePalette`) thay dropdown – cùng bảng + hoạt hoạ, chỉ loại node thuần (biến thể Click theo chữ… chưa đổi qua đây được); `GROUPS` chuyển sang `palette/groups.ts` dùng chung
  - Màn `#demo-illus` (lưới mọi hoạt hoạ) đã có; rà tay từng hình trên app thật – việc kiểm tra tay ở checks.md mục 47
  - Chuẩn bị cho MCP (31): không đụng
  - Kiểm tra tay: [checks.md](../checks.md) mục 47
  - Xong khi: mở bảng Thêm node, rê qua từng loại → hình động tự giải thích node làm gì (không cần đọc chữ), theme tối / sáng đều đẹp, bảng không giật khi đổi mục.
