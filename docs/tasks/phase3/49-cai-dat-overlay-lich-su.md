# 49. Cài đặt rộng hơn, thanh overlay đặt được + co giãn, lịch sử xem mọi output

- [x] **49. Chỉnh giao diện theo yêu cầu 2026-10-25** *(người dùng yêu cầu 2026-10-25)*
  - **Chốt 2026-10-25:** (1) Cài đặt rộng ~760px, cao cố định ~80vh; (2) thanh nút overlay đặt top / left / right / bottom trong Cài đặt, left / right xếp **dọc**, mặc định top; co theo cỡ màn đang hiện: thu nhỏ rồi ẩn nhãn (chỉ icon) rồi xuống hàng, tính lại khi đổi màn; (3) Lịch sử có chế độ **Tất cả output** + Chép (thay cho nút *Mở rộng hết* – tab gom sẵn nên không cần).
  - [x] A1. **Modal Cài đặt**: `AppSettings` rộng ~760px, `h-[80vh]`, tab giữ `Segmented`; kiểm tra các tab dài (MCP, Quyền) không tràn
  - [x] A2. **Cài đặt overlay**: Go `store.Settings.Overlay{Toolbar: top|left|right|bottom}` → `wails generate module` → `types.ts`; tab Cài đặt mới **Chọn vùng** (`settings/OverlaySettings`), `App.SetOverlaySettings`; ghi chú bottom có thể bị Dock / taskbar che
  - [x] A3. **Thanh overlay theo cạnh**: hàm thuần `overlay/toolbarLayout.ts` (`barLayout` / `barPlacement` / `atBarEdge`; cạnh + cỡ màn → hướng, vị trí, mức gọn) + test; `OverlayToolbar` chỉ hiển thị (tự ẩn / hiện ở mép đã chọn); mức gọn: đầy đủ → ẩn nhãn → xuống hàng; tính lại khi `onPickDisplay` / đổi cỡ màn (lỗi gốc: chuyển từ màn lớn sang màn nhỏ nút dài bị che)
  - [x] A4. **Lịch sử – Tất cả output**: hàm thuần `flow/runOutputs.ts` gom `StepResult.output` theo node / vòng (+ test); tab *Từng bước / Tất cả output* trong `flow/RunLog` (dùng chung hộp thoại Lịch sử + bảng Nhật ký) + `flow/RunOutputs`; nút Chép tất cả / từng bước (JSON); chữ bí mật vẫn che sẵn từ engine (`engine/mask.go`)
  - Chuẩn bị cho MCP (31): không đổi tool (output đã nằm trong vết chạy `Trace`)
  - Kiểm tra tay: [checks.md](../checks.md) mục 49
  - Xong khi: Cài đặt đủ rộng; đổi cạnh thanh overlay có hiệu lực ngay; chuyển màn 2 → màn 1 thanh không bị che; Lịch sử xem được output mọi bước trong một chỗ và chép được.
