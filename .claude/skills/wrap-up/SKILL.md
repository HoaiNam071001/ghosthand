---
name: wrap-up
description: Chốt việc trước khi commit / kết thúc session (vd "commit", "chốt", "xong rồi", "kết thúc"): đồng bộ docs/tasks, ARCHITECTURE, chạy kiểm tra, commit theo quy ước.
---

# Chốt việc

## 1. Kiểm tra code

```bash
go vet ./... && go test ./...
cd frontend && npm run build && npm test
```

Không xanh thì dừng, báo người dùng (kèm output) – không commit đỏ trừ khi người dùng bảo.

## 2. Đồng bộ tài liệu

Quy ước chung: mục con làm xong là tick ngay (không đợi tới đây); việc phát sinh (người dùng báo sửa, việc để sau) thành mục con `[ ]` / `[x]` trong file bước, không chỉ ghi ở chat.

- [ ] File bước: mục con xong đã `[x]`; mục cha tick khi **mọi mục con code** đã `[x]` (kiểm tra tay không chặn tick). Rà cả mục cha của bước khác bị sót.
- [ ] Việc cần thử tay → `checks.md` (mới nhất ở trên, nhóm `## <số bước> – <tên> · [link]`), file bước chỉ để dòng link. Người dùng báo đã thử xong → tick ở `checks.md` + ghi `log.md`.
- [ ] File bước dài (> ~150 dòng hoặc > ~15 KB): chuyển các mục con đã `[x]` sang `<số>-<tên>-xong.md` (giữ *Nguyên tắc* + mục còn làm ở file chính, dòng link sang file xong). `tasks-index.py` vẫn đếm mục con trong file `-xong` vào bước.
- [ ] `README.md`: *Trạng thái hiện tại* (đang làm / tiếp theo / cập nhật lần cuối – ngày tuyệt đối); bảng *Tính năng của hệ thống* nếu tính năng đổi trạng thái (⬜ → 🧪 → ✅, 🟡). Bước mới → file mới + dòng trong bảng thứ tự.
- [ ] `log.md`: **thêm bằng `>>`, không Read / Edit cả file** – một dòng `- **YYYY-MM-DD** – <việc>. <kết quả kiểm tra: lệnh nào OK / chưa thử tay>.`
- [ ] `docs/ARCHITECTURE.md`: đổi luồng, thêm method `App` / event / file lõi / cổng → sửa.
- [ ] `docs/ARCHITECTURE.md` §8 *Bản đồ file*: thêm / xoá / đổi tên file → sửa dòng tương ứng.
- [ ] **Hướng dẫn** (bước 51): tính năng / thiết lập / hành vi đổi → sửa chương liên quan trong `internal/guide/chapters.json` (hoặc mục node trong `nodes.json`); `check-docs.py` cảnh báo trường node mới chưa được nhắc.
- [ ] `decisions.md`: người dùng vừa chốt điều gì mới → ghi (ngày, lý do).
- [ ] `python3 scripts/tasks-index.py` rồi `python3 scripts/check-docs.py` (phải 0 lỗi).

## 3. Commit (khi người dùng yêu cầu commit / đã cho phép)

- `git status` + `git diff --stat` xem đúng file; không add file rác (`build/bin`, log, ảnh tạm).
- Message tiếng Việt, theo lịch sử: `feat: <tính năng> (bước <số>)`, `fix: <triệu chứng> – <nguyên nhân>`, `docs: …`, `refactor: …`. Thân message (nếu cần) liệt kê ý chính.
- Đang ở `main` và thay đổi lớn → hỏi có muốn tạo nhánh không.

## 4. Báo người dùng

Ngắn: đã xong gì, kiểm tra nào đã chạy (kết quả thật), việc chờ họ thử tay (link `checks.md`), bước tiếp theo.
