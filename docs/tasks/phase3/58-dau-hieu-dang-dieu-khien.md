# 58. Dấu hiệu "app đang điều khiển máy"

- [ ] **58. Dấu hiệu đang điều khiển** *(người dùng yêu cầu 2026-11-01: AI chạy mà không biết còn chạy không, app có đang cầm chuột không – màn hình đứng im, sợ chạm vào làm hỏng)* – người ngồi máy nhìn là biết: đang thao tác (đừng chạm), đang chờ gì, đang tạm dừng, đã xong.
  - **Đã chốt (2026-11-01):** viền sáng quanh mép màn hình + thanh mini ghi rõ trạng thái; không làm huy hiệu cạnh con trỏ.
  - [ ] D1. Trạng thái chạy chung (Go → event): `acting` (đang bấm / gõ / kéo – đừng chạm) | `waiting` (đang chờ ảnh / chữ / phần tử / màn hình – kèm thứ đang chờ + giây còn lại) | `paused` (người dùng đụng chuột – kèm đếm ngược tự chạy tiếp [57 B4](57-ai-chay-on-dinh.md)) | `asking` (chờ người dùng đồng ý) | `done` / `failed`; nguồn chạy (bạn / AI / hẹn giờ / CLI). Một chỗ phát cho thanh mini, viền, API SSE, `wait_run`
  - [ ] D2. Viền quanh màn hình: cửa sổ native riêng (ngoài cửa sổ Wails – Wails chỉ một cửa sổ, đang là thanh mini), trong suốt, click xuyên qua, không lấy focus, trên mọi Space / app toàn màn hình (`winfloat`); màn có thao tác (nhiều màn: màn của điểm sắp bấm). Màu theo trạng thái: `acting` sáng + chạy nhẹ, `waiting` mờ, `paused` vàng, không có khi xong. macOS NSWindow trước, Windows layered window (`WS_EX_TRANSPARENT`) sau
  - [ ] D3. Viền **không** lọt vào ảnh chụp / tìm ảnh / OCR / Chờ màn hình (loại khỏi chụp: macOS `sharingType = none`, Windows `WDA_EXCLUDEFROMCAPTURE`) – nếu không loại được thì ẩn viền trong lúc chụp; test tìm ảnh sát mép màn hình
  - [ ] D4. Thanh mini ghi chữ theo trạng thái: *Đang thao tác – đừng chạm chuột* / *Đang chờ chữ "Sent" · còn 7 s* / *Tạm dừng vì bạn đụng chuột · tự chạy tiếp sau 4 s* / *AI đang chạy "Nhắn tin"* (nguồn AI có chip AI); chữ là hàm thuần có test (như `overlay/`)
  - [ ] D5. Cài đặt: bật / tắt viền, độ dày (mảnh / vừa); mặc định bật
  - Màn mẫu: `#demo-minibar?mode=acting|waiting|paused` + `#demo-overlay` thêm khung viền
  - Chuẩn bị cho MCP: D1 → `wait_run` / `run_script` trả `state` chi tiết (`waiting: {what, leftS}`), giữ `budget_test.go`.
  - Kiểm tra tay: AI chạy kịch bản có Chờ chữ 10 s → viền mờ + thanh mini ghi đang chờ gì, đếm giây; tới node click → viền sáng; đụng chuột → viền vàng + đếm ngược; xong → viền tắt; chụp màn / tìm ảnh lúc có viền vẫn đúng; toàn màn hình (Space riêng) vẫn thấy viền.
  - Xong khi: D1–D4 xong code trên macOS; Windows D2 làm trên máy Windows.
