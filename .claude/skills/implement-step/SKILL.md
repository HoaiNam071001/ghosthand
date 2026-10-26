---
name: implement-step
description: Làm một bước / mục con theo plan trong docs/tasks (vd "làm tiếp", "làm bước 26", "làm F5b", "tiếp tục plan"). Đọc trạng thái, lập kế hoạch nhỏ, code theo lớp, kiểm tra, cập nhật tài liệu, commit.
---

# Làm bước theo plan

## 1. Nạp ngữ cảnh (đọc ít, đúng chỗ)

1. *Trạng thái hiện tại* (đang làm / tiếp theo) đã có sẵn đầu session nhờ hook – không mở `README.md`. Người dùng nêu bước khác thì theo người dùng.
2. Chỉ mở file của bước đó `docs/tasks/phase3/<số>-<tên>.md`. Bước lớn (vd 20) thì chỉ đọc phần mục con đang làm + *Nguyên tắc* đầu file.
3. `docs/ARCHITECTURE.md` – luồng + *muốn làm X → sửa ở đâu*. Chỉ mở code những file bảng đó chỉ tới.
4. `docs/tasks/decisions.md` khi bước đụng tới quyết định đã chốt (không bàn lại điều đã chốt).
5. Bước có mục *Chuẩn bị cho MCP* → làm luôn phần đó (mô tả trong `internal/model/steptypes.go`, lỗi có cấu trúc, không phụ thuộc UI).

## 2. Lập kế hoạch trước khi code

- Liệt kê mục con `[ ]` sẽ làm trong lượt này (mỗi mục làm xong được, kiểm tra được). Mục con trong file bước còn mơ hồ / thiếu → thêm mục con mới vào file bước trước.
- Có lựa chọn ảnh hưởng người dùng (UI, hành vi, định dạng file) mà file bước / decisions chưa nói → hỏi người dùng (AskUserQuestion, có khuyến nghị), không tự chốt. Chi tiết kỹ thuật thì tự chọn, ghi lý do ngắn trong file bước.
- Thêm loại node → dùng skill `add-node-type`.

## 3. Code theo thứ tự lớp

1. **Go model** (`internal/model/model.go`) → `~/go/bin/wails generate module` → `frontend/src/types.ts` (tsc báo lệch).
2. **Go logic** + test (`*_test.go`, thiết bị qua interface giả: `Input`, `Screen`, `TextReader`). Lỗi cho người dùng / AI: `ScriptError` / `StepError` + mã.
3. **Logic thuần TS** (`src/flow/`, `anchor.ts`…) + `*.test.ts` cạnh file. Công thức có ở cả Go và TS → cùng tên hàm, test chung dữ liệu `testdata/`.
4. **Store** (`src/store/`) – mọi sửa kịch bản qua `updateScript`.
5. **Component** – phần chỉ hiển thị (props) tách khỏi phần nối store; dùng lại `NumInput`, `Segmented`, `Switch`, `Field`, `PortField`, `StepIcon`… UI theo `design/DESIGN.md` (token, không màu cứng, không `text-white`).
6. Tính năng đang hiện *Sắp có* (bước 27b) → bỏ trạng thái tắt, chuyển kiểu từ `components/steps/model.ts` sang `types.ts` + `internal/model/model.go`, xoá dữ liệu giả không còn dùng.

Tính năng mới người dùng thử được (loại bước, trường mới, hành vi mới của bước cũ) → thêm / sửa **kịch bản mẫu** trong `internal/samples/` (bước 33) để người dùng mở từ *Mẫu thử* và thử tay ngay.

Tính năng / thiết lập / node đổi hành vi → sửa luôn chương hoặc trang node tương ứng của *Hướng dẫn* (`internal/guide/*.json`), không để lệch.

Trong lúc làm: mục con xong là tick `[x]` ngay; việc phát sinh thêm thành mục con.

## 4. Kiểm tra (bắt buộc, báo kết quả thật)

```bash
go vet ./... && go test ./...
cd frontend && npm run build && npm test
python3 scripts/check-docs.py
```

Lỗi thì sửa đến khi qua; không qua được thì nói rõ với người dùng kèm output. Thay đổi giao diện: xem được trên trình duyệt qua `#demo*` / `?theme=dark` thì xem cả 2 theme. Việc cần người dùng thử tay (chuột thật, quyền macOS, đa màn hình) → ghi vào `checks.md`.

Sau đó chạy skill `senior-review` trên diff của mình và sửa những gì nó tìm thấy.

## 5. Chốt

Dùng skill `wrap-up` (tick, README, checks, log, ARCHITECTURE, tasks-index, commit).
