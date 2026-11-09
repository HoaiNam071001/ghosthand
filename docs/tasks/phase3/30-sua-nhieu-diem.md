# 30. Sửa nhiều điểm cùng lúc: di chuyển, co giãn, xoay, xiên

- [x] **30. Sửa nhiều điểm cùng lúc: di chuyển, co giãn, xoay, xiên** *(người dùng yêu cầu, 2026-10-16)* – Chọn nhiều marker trên overlay (chế độ sửa và tab Xem trước) rồi biến đổi cả nhóm để khớp vùng mới.
  - UI khung có từ 27b – bước này nối logic, bỏ nhãn *Sắp có*
  - [x] Chọn nhiều (công cụ *Chọn nhiều* trên overlay thật): Shift / Cmd+click marker, kéo khung chọn trên chỗ trống, Cmd/Ctrl+A chọn tất cả, Esc bỏ chọn (Esc lần nữa mới thoát); danh sách bước viền accent bước có điểm đang chọn, Shift / Cmd+click thẻ thêm / bỏ (`state.multi`, khoá `id:index`)
  - [x] Khung biến đổi (`TransformTool.tsx`): kéo thân / marker đã chọn = **di chuyển** (Shift chỉ ngang / dọc; phím mũi tên 1 px, Shift 10 px); 8 núm = **co giãn** (Shift giữ tỷ lệ, Alt từ tâm); núm tròn = **xoay** (Shift bước 15°); Cmd/Ctrl + núm cạnh = **xiên**; Cmd/Ctrl + núm góc = **phối cảnh**; Esc khi đang kéo = huỷ; xem trước khi kéo, thả mới ghi; khung đỏ khi có điểm ra ngoài vùng
  - [x] Thanh ô nhập số: ΔX, ΔY, rộng / cao %, xoay, xiên X / Y – xem trước ngay, Áp dụng / Enter ghi; thanh tự né khung (dưới → trên → sát đáy), kéo tay nắm "N điểm" để dời
  - [x] Căn trái / giữa / phải / trên / giữa / dưới, chia đều ngang / dọc, lật ngang / dọc (`align` trong `transform.ts`, `moveSelectedTo`)
  - [x] **Ánh xạ khi đổi vùng** (kéo vùng mới / *Toàn màn hình* khi đã có điểm): hộp chọn *Giữ theo neo* (mặc định) / *Co giãn theo vùng* / *Giữ nguyên chỗ trên màn hình*, marker xem trước theo cách đang chọn, báo số điểm sẽ ra ngoài vùng; Enter đổi, Esc giữ vùng cũ
  - [x] Ánh xạ theo 4 điểm mốc cũ → mới: nút *4 mốc* trên thanh số → 4 núm 1–4 ở góc khung (mốc cũ), kéo từng núm tới chỗ mới, xem trước, Enter ghi / Esc thoát (`components/QuadTool.tsx`, `homography`)
  - [x] Toán `frontend/src/transform.ts`: ma trận 3×3 (affine + homography), `fromParams`, `perspectiveCorner`, `bbox`, `align`, `rectToRect`; test `transform.test.ts` (vitest, `npm test`) 14 test; sau biến đổi ghi lại offset theo neo hiện có
  - [x] Điểm đặc biệt (`mapPoints` trong `scriptStore.ts`, dùng chung cho biến đổi, xem trước và ánh xạ vùng): A "từ điểm trước" không chọn được; B "lệch so với A" đổi véc-tơ = f(A + Δ) − f(A); điểm ra ngoài vùng → báo, không áp dụng
  - [x] Hoàn tác / làm lại Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z (Ctrl+Y) cho **mọi** thay đổi kịch bản (`past` / `future` trong store, tối đa 100, gộp thay đổi sát nhau < 500 ms; trong ô nhập để trình duyệt tự hoàn tác chữ); mở / tạo kịch bản xoá lịch sử
  - [x] Tab Xem trước: nút *Sửa điểm* chuyển sang công cụ *Chọn nhiều*, xong bấm *Xem trước* chạy lại theo vị trí mới
  - Kiểm tra tay: xem [checks.md](../checks.md)
  - Xong khi: chọn 5 điểm, co giãn 150%, xoay 10°, xiên, lật → overlay và lần chạy thật khớp nhau; Ctrl+Z quay lại đúng từng bước; đổi vùng với cả 3 cách xử lý cho kết quả như mô tả
