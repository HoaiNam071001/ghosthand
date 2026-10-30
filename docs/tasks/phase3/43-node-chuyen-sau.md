# 43. Node chuyên sâu: trình duyệt thường, app, hệ điều hành, cho AI

- [x] **43. Node chuyên sâu** *(người dùng yêu cầu, 2026-10-20 – sau 42; phần macOS làm trên Mac, xen kẽ với 40 O0–O3 trên máy Windows)* – Đi sâu vào trình duyệt (Chrome thường đã đăng nhập), app desktop và hệ điều hành mà không cần CDP / extension; cho AI nhìn màn hình theo phần tử thay vì đoán toạ độ.
  - **Chốt 2026-10-20:**
    - **Mỗi việc một node** (thay cách *ít node nền* của 35 cho node mới – xem `decisions.md`); node của 35 / 26 giữ nguyên
    - Trình duyệt: **họ Chromium** (Chrome, Edge, Cốc Cốc, Brave) – đọc / điều khiển qua UIA (Windows) / AX + AppleScript (macOS), **không CDP, không extension** (giữ quyết định 36); Firefox / Safari không làm
    - **Chạy lệnh**: AI soạn được, nhưng mỗi lệnh mới (theo nội dung lệnh) phải được người dùng đồng ý một lần trên app – kể cả AI ở mức *Tự chạy*, hẹn giờ, CLI (cùng chỗ hỏi quyền với xác nhận xoá)
    - Mỗi node ghi rõ hệ điều hành làm được; node chỉ một bên có thì bên kia ẩn trong bảng thêm node, file kịch bản mở bên kia báo `unsupported` lúc kiểm tra
  - Thứ tự làm: B (trình duyệt) → E (phần tử app) → S (hệ điều hành) → A (cho AI, trước 31c). Mỗi node thêm theo skill `add-node-type`, mẫu thử (33), mô tả N0
  - Mục con B (trình duyệt), E (phần tử app), S (hệ điều hành), A (cho AI) – đã xong cả macOS + Windows (trừ S2 chỉ macOS): [43-node-chuyen-sau-xong.md](43-node-chuyen-sau-xong.md)
  - Chuẩn bị cho MCP (31): mô tả + ví dụ JSON trong `steptypes.go` cho mọi node mới; `shell`, `power`, `zip` (giải nén ghi đè) đi qua chỗ hỏi quyền; bí mật không lọt vào output / detail gửi AI
  - Rủi ro: hộp in / hộp lưu của Chrome đổi theo phiên bản (B7); bộ gõ tiếng Việt mỗi bộ một kiểu (S6); macOS cần quyền Accessibility + Automation (AppleScript với Chrome / Edge hỏi riêng từng app) + Thông báo; UIA của Cốc Cốc / Brave cần thử riêng
  - Kiểm tra tay: [checks.md](../checks.md) (B1 macOS đã ghi) – ghi tiếp khi xong code – mỗi node chạy trên cả macOS và Windows (trừ node một bên), trình duyệt thử Chrome + Edge + Cốc Cốc, Chrome đã đăng nhập Gmail / Facebook không bị hỏi captcha
