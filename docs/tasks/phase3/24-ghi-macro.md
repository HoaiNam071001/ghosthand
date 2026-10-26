# 24. Ghi macro

- [x] **24. Ghi macro** – Ghi click / kéo / gõ phím bằng gohook, gộp thành bước, tự tính delay; nút Ghi trên toolbar, F9 dừng. *Chốt 2026-10-24:* dùng lại vòng hook của `hotkey.go` (không mở hook thứ hai); ghi ra node click (gộp click đôi) / kéo / cuộn / gõ chữ (gom phím in được) / phím (tổ hợp có ctrl · alt · cmd, phím đặc biệt); toạ độ tính từ góc màn hình chính rồi `script.Embed` quy sang vùng kịch bản; khoảng nghỉ thật → `DelayAfter` (làm tròn 50 ms, 100 ms – 60 s); kết quả là khung nhóm chưa nối vào flow; app thu nhỏ lúc ghi
  - [x] R1. `internal/record` (`Build`, có test) · R2. `recordapi.go` (`StartRecording` / `StopRecording` / `FinishRecording`, event `record:done`) · R3. `store/record.ts` + mục *Ghi thao tác* trong menu Chạy (`MainScreen`)
  - **Xong 2026-10-26:** thanh mini khi ghi (`RecordBar`, app không còn thu nhỏ; nút *Dừng ghi* + F9, cú bấm nút Dừng bị cắt khỏi kết quả); `#demo` đã có mục Ghi; shift + số / dấu ghi thành node Phím kèm shift (có test)
  - Chưa làm: chiều cuộn (`Rotation`) chưa kiểm trên máy thật
