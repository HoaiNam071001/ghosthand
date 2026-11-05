---
name: test-after-change
description: Cài bản vừa sửa vào app thật rồi tự thử qua MCP (vd "test thử trên app", "cài rồi thử", "kiểm tra bằng MCP", sau khi sửa engine / node / MCP / thiết bị). macOS – make dev-install → app_info đúng commit → chạy mẫu / kịch bản tạm liên quan → báo kết quả + ảnh lỗi, lỗi thì sửa và lặp.
---

# Cài bản vừa sửa rồi thử qua MCP (bước 59)

Dùng khi thay đổi cần chạy trên máy thật mới biết (chuột / phím, cửa sổ, OCR, phần tử, web, MCP). Test Go / vitest vẫn chạy trước – skill này không thay chúng.

## 1. Cài

1. `go vet ./... && go test ./...` (và `cd frontend && npm run build` nếu đụng TS) phải xanh trước.
2. `make dev-install` – build + ký "Ghosthand Dev" + thoát app (`ghosthand quit`) + cài đè `/Applications/Ghosthand.app` + mở lại nền, chờ `/health` đúng commit.
   - App từ chối thoát (đang chạy kịch bản / kịch bản chưa lưu) → **dừng, báo người dùng**, không tự kill app.
3. Kiểm đúng bản: tool MCP `app_info` (phiên MCP mở trước khi có tool này: gọi thẳng `/mcp` hoặc đọc `/health` – cổng trong `~/Library/Application Support/ghosthand/api.json`). `commit` phải khớp `git rev-parse --short HEAD` (+ `-dirty` khi chưa commit).

## 2. Thử

- Chọn đúng phần vừa sửa: mẫu trong `internal/samples/scripts/` dùng tính năng đó (`run_script` với `path` = tên mẫu, xem `list_scripts`) hoặc kịch bản tạm (`run_script script=…`) nhỏ nhất tái hiện được việc cần kiểm. Lỗi người dùng báo → chạy lại đúng kịch bản / bước đã lỗi.
- `shots: "each"` khi cần xem từng bước; đọc `error.detail`, `changes`, output `window` / `windowApp`.
- Sửa → lặp lại từ mục 1 (mỗi lần cài là một bản mới; không thử trên bản cũ đang chạy).

## 3. Giới hạn

- Không chạy kịch bản đụng tài khoản / dữ liệu thật (gửi tin, đăng bài, thanh toán, xoá file) khi người dùng chưa bảo rõ; ưu tiên trang sân thử `internal/samples/pages/`.
- Người dùng đụng chuột → lần chạy tạm dừng: chờ / hỏi, không chạy lại liên tục.
- Windows: chưa có `dev-install` – build + chép tay theo `docs/windows-dev.md`.

## 4. Dọn sau khi thử

Test mở gì thì đóng đúng cái đó khi xong, kể cả khi test lỗi giữa chừng:

- **Tab trình duyệt:** kịch bản tạm có node `browserTab` mở tab (`new`, hoặc `open` / `web` mở URL) thì cuối kịch bản thêm node `browserTab` `tabOp: close` với `tabFrom` = node đã mở tab. Không đóng theo tiêu đề / URL (dễ đóng nhầm tab của người dùng), không dùng `closeOthers`. Chạy lỗi giữa chừng → chạy thêm một lần node đóng tab (`run_step`) trước khi báo.
- **Cửa sổ / app:** app mở bằng node `open` mà người dùng chưa mở sẵn thì đóng lại; app đã mở sẵn từ trước thì để nguyên.
- **Kịch bản tạm:** ưu tiên `script=…` (không tạo file) để khỏi để lại file thử.
- Báo trong mục 5 những gì đã dọn, hoặc gì còn sót nếu không dọn được.

## 5. Báo

Bản đã cài (commit), kịch bản đã chạy, kết quả từng cái (qua / lỗi + mã + ảnh). Việc vẫn cần người thử tay → `checks.md` như thường.
