# 57. AI chạy ổn định trên máy thật

- [ ] **57. AI chạy ổn định** *(người dùng yêu cầu 2026-11-01, sau lần AI qua MCP mở Messenger nhắn "hi" cho chính mình: 3 lần chạy mới gửi được)* – sửa chỗ làm AI fail vô lý hoặc tốn lượt khi chạy trên máy thật.
  - **Thứ tự:** đợt 1 (lỗi rõ gốc) → đợt 2 (vòng chạy của AI) → đợt 3 (tinh chỉnh). Dấu hiệu "đang điều khiển" ở [58](58-dau-hieu-dang-dieu-khien.md) – làm cùng đợt 2 (A3 thu cửa sổ chính, B dùng chung trạng thái).
  - **Đợt 1 – lỗi**
    - [ ] A1. Nhận đúng cửa sổ đang ở trước: `engine/outputs.go` `foreground()` lấy cửa sổ đầu danh sách (bỏ thu nhỏ + của app) – VS Code đứng đầu trong khi Chrome đang active → `onlyInWindow` chặn sai (`window_mismatch`), output `window` / `windowApp` của type / key ghi sai. Thêm `device.Front()`: PID app active (macOS `frontmostApplication` – như `selfguard_darwin.go`, Windows `GetForegroundWindow`) → cửa sổ trên cùng của PID đó; `foreground()`, `guardWindow`, `error.detail.context.foreground`, `describe_screen` dùng chung. Test bằng thiết bị giả: app active không đứng đầu danh sách
    - [ ] A2. `winOp: "focus"` hợp lệ (= để trống); sửa câu lỗi *"trống = focus | …"* cho rõ
    - [ ] A3. `keys` nhận chuỗi trong dạng gọn: `"enter"`, `"cmd+c"` (tách theo `+`); `Shrink` ghi chuỗi khi một tổ hợp – test vòng `shrink_test.go`, giữ `budget_test.go`
  - **Đợt 2 – vòng chạy của AI**
    - [ ] B1. `resume_run` focus lại cửa sổ đích trước khi chạy node: cửa sổ trước lúc lỗi (`error.detail.context.foreground`, đã đúng nhờ A1) hoặc cửa sổ của node Cửa sổ / Mở gần nhất trong lần chạy cũ; không còn → lỗi rõ "cửa sổ X đã đóng" (hiện tại: Ghosthand lên trước → chặn gõ vào chính app)
    - [ ] B2. Lần chạy nguồn `ai` / hẹn giờ / CLI: cửa sổ chính đang mở thì thu về thanh mini như bấm Chạy trong app (hiện cửa sổ chính đè lên Chrome); chạy xong giữ thanh mini + nút mở lại
    - [ ] B3. Node Mở (URL / app) đưa cửa sổ mở ra lên trước: chờ cửa sổ mới / cửa sổ của app (≤ 3 s) → focus → output `window` theo cửa sổ đó; trường `focus` (mặc định bật). Sửa `tips` (*open … cách mở đầu bền nhất*) cho khớp
    - [ ] B4. Đụng chuột → tạm dừng → **tự chạy tiếp sau 5 s chuột đứng yên** (người dùng chốt 2026-11-01): thanh mini đếm ngược, Dừng để huỷ; Cài đặt chỉnh số giây / tắt (tắt = chờ bấm Tiếp tục như cũ). `wait_run` trả `paused: {by, forS, resumeInS}` + `next` rõ
  - **Đợt 3 – tinh chỉnh**
    - [ ] C1. Lỗi không thấy phần tử gọn + đúng hơn: `near` ưu tiên cùng role selector, trong vùng document, đang hiện (tên chỉ phụ) – lần thử `textbox[name=Message]` gợi ý thanh địa chỉ thay vì ô soạn `textbox "Write to"`; `dump` ≤ 30 dòng (cùng role trước, rồi phần tử tương tác) thay vì ~200; thêm vào `budget_test.go`
    - [ ] C2. Chọn trên màn / `suggest_selector` trả thêm selector dự phòng không phụ thuộc chữ (`role=textbox` + `occurrence` trong vùng) cạnh selector theo tên (nhãn "Write to" đổi theo ngôn ngữ / bản FB)
    - [ ] C3. Mẹo cho AI (`tips` / `topic=debug`): dùng `changes` của `run_script` (`shots: each`) để biết thao tác có tác dụng; sau node gửi đặt node chờ kết quả (chữ "Sent" / "Đã gửi"); ưu tiên `elementAction` khi trang có cây phần tử. Mẫu `nhan-tin-messenger` (input người nhận + nội dung, chờ "Sent")
  - Chuẩn bị cho MCP: A2, A3, B3 đổi trường / cách viết → `get_step_types`, `script.Compact` + `Shrink`, `budget_test.go`; B4 đổi kết quả `wait_run`.
  - Kiểm tra tay: VS Code đứng trên Chrome ở danh sách nhưng Chrome active → node gõ `onlyInWindow` Chrome chạy được, output `windowApp` = Google Chrome; AI chạy khi cửa sổ chính đang mở → thu về thanh mini; đụng chuột giữa lần chạy → thanh mini đếm 5 s rồi chạy tiếp; AI lặp lại việc nhắn "hi" cho chính mình qua MCP chạy một lần là xong.
  - Xong khi: đợt 1 + 2 xong code; đợt 3 làm theo nhu cầu.
