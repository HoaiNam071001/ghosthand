# Ghosthand

Desktop app tự động click theo kịch bản (flow node + cạnh kiểu n8n: chuột, phím, chờ ảnh / chữ, rẽ nhánh, lặp N vòng). Wails v2 + Go + React/TS.

## Bắt đầu mỗi session

1. *Trạng thái hiện tại* + số việc chờ kiểm tra tay được hook SessionStart chèn sẵn (`scripts/session-status.sh`) – **không cần đọc cả `docs/tasks/README.md`**. Chỉ mở file của bước đang làm (`docs/tasks/phase3/<số>-<tên>.md`; phần đã xong của bước dài ở `<số>-<tên>-xong.md` – chỉ mở khi cần).
2. Cần hiểu hệ thống / tìm file → **`docs/ARCHITECTURE.md`** (luồng soạn / chạy, API Go ↔ frontend, event, *muốn làm X → sửa ở đâu*, bản đồ file) trước khi mở code.
3. Tài liệu khác chỉ mở khi cần: `decisions.md` (quyết định đã chốt – không bàn lại), `checks.md` (việc chờ người dùng thử tay), `README.md` (bảng tính năng, thứ tự bước), `design/DESIGN.md` (UI). **Không đọc `log.md`** – chỉ thêm dòng bằng `>>`.
4. **Skill dự án** (`.claude/skills/`): `implement-step` (làm bước theo plan), `add-node-type` (thêm loại node / trường – đủ chỗ Go + TS), `fix-bug`, `new-request` (yêu cầu mới → ghi plan, hỏi chốt trước khi code), `senior-review` (review diff trước commit), `wrap-up` (cập nhật tài liệu + kiểm tra + commit – quy ước tick / checks / log / README nằm ở đây).
5. Người dùng trao đổi bằng **tiếng Việt** – trả lời, comment, UI, tài liệu tiếng Việt; tên biến / hàm tiếng Anh.

## Lệnh

```bash
wails dev                      # chạy app (hot reload). wails nằm ở ~/go/bin
wails build                    # build ra build/bin/
scripts/mac-build.sh            # macOS: build + ký chứng chỉ tự tạo "Ghosthand Dev" + .dmg – giữ quyền Accessibility / Screen Recording qua các bản build (bundle ID cố định app.ghosthand)
make release V=1.0.1           # phát hành: build mac (.dmg) + tag + GitHub Release; tag kích hoạt workflow "Release Windows" (setup.exe + portable.zip tự đính vào Release) – cần gh
make win V=1.0.1               # Windows (Git Bash): build/bin/ghosthand.exe (không cài đặt) + portable.zip, có NSIS thì thêm bộ cài; make mac V=…: chỉ build mac
# exe Windows: GitHub Actions "Build Windows" mỗi lần push (tab Actions → Artifacts); build chéo tại máy: CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc wails build -platform windows/amd64 -skipbindings
go vet ./... && go test ./...  # Go (thiết bị giả)
cd frontend && npm run build   # type-check (tsc) + build – sau mỗi thay đổi TS
cd frontend && npm test        # vitest, *.test.ts
python3 scripts/check-docs.py  # trước commit: tài liệu khớp code (phải 0 lỗi)
python3 scripts/tasks-index.py # sau khi tick / thêm bước / sửa checks.md
```

Xem riêng từng màn (wails dev / trình duyệt): hash `#preview`, `#overlay`, `#minibar`; màn mẫu dữ liệu giả `#demo`, `#demo-overlay`, `#demo-minibar`, `#demo-flow`, `#demo-illus` (lưới hoạt hoạ minh hoạ node), `#demo-guide` (modal Hướng dẫn, `?page=c:<chương>|n:<node>`) (`?mode=running|failed`, `?sel=<id>`); `?theme=dark`. Trình duyệt không có Go → nút Chạy tắt.

## Quy tắc code

Mục tiêu: thêm tính năng sau chỉ phải đụng đúng chỗ. Code mới theo các quy tắc dưới; gặp code cũ lệch thì sửa khi đang làm phần đó.

- **Một file một việc** – mỗi file một tính năng / một nhóm việc, tên file nói đúng việc đó:
  - Màn hình (`screens/`) và component lớn chỉ giữ state + xử lý sự kiện + ghép; mỗi khối giao diện (thanh công cụ, hộp thoại, lớp vẽ…) là component chỉ hiển thị trong `components/<màn>/`, phần tính (hình học, lọc, chữ theo trạng thái) là hàm thuần có test (mẫu: `OverlayScreen` → `components/overlay/` + `overlay/`).
  - Nhắm ≤ ~300 dòng / file, component ≤ ~150 dòng JSX, hàm ≤ ~60 dòng. Thêm tính năng vào file đã gần ngưỡng → **tách trước** rồi mới thêm, không để phình rồi mới dọn. `check-docs.py` cảnh báo file > 300 dòng.
  - State + ref đi cặp (cho listener gắn một lần) → `useRefState`; hook nhỏ của một màn để trong `components/<màn>/hooks.ts`.
- **Ba lớp ở frontend**, phụ thuộc một chiều logic thuần ← store ← component:
  1. *Logic thuần* (`src/flow/`, `src/overlay/`, `anchor.ts`, `transform.ts`, phần tính trong `scriptInputs.ts`): không React, không Wails, không đọc store; có test `*.test.ts` cạnh file.
  2. *Store* (`src/store/`): ghép logic thuần với state, hoàn tác, thông báo. Chỉ module trong `store/` gọi `setEditor`; mọi sửa kịch bản đi qua `updateScript` (để có hoàn tác + cờ chưa lưu).
  3. *Component*: hiển thị + gọi hàm nghiệp vụ của store (`connectPort`, `updateStep`…), không tự dựng `script` mới. Tách thành phần **chỉ hiển thị** (nhận props: `FlowCanvas`, `NodeCard`, `PortField`) khỏi phần **nối store** (`FlowEditor`, `stepform/FlowSections`) để màn mẫu `#demo*` và app thật dùng chung một giao diện.
- **Flow:** thao tác node / cạnh qua `flow/edit.ts`; thứ tự node qua `flow/model.ts` (`flowOrder`, `orderedSteps`) – không dựa vào thứ tự mảng `script.steps`. Tham chiếu node bằng `id` (cạnh, `start`, `imageFrom`); `ref` (n2) chỉ để hiển thị và dùng trong biến. Tên / dòng chi tiết / nhãn cổng / output của node chỉ lấy từ `flow/view.ts`.
- **Go là nguồn chuẩn của model:** thêm trường → `internal/model/model.go` → `~/go/bin/wails generate module` → `types.ts` (tsc tự báo lệch). Công thức chạy ở cả hai bên (neo, `flowOrder`, cổng ra) giữ cùng tên hàm (Go viết hoa khi export: `FlowOrder`) và test chung dữ liệu trong `testdata/`.
- **Thêm loại node** → skill `add-node-type` (danh sách đủ chỗ Go + TS).
- **Dùng lại trước khi viết mới:** `NumInput`, `Segmented`, `Switch`, `Field` / `NumField` / `PickButton` (`stepform/shared`), `PaletteView`, `PortField`, `StepIcon`, `VarTextInput`. Hai chỗ cần cùng một thứ → đưa vào chỗ dùng chung, không chép.
- **Không giữ code chết / tương thích ngược** khi không cần (file kịch bản cũ đã bỏ). Cầu nối tạm thời phải ghi bước sẽ xoá trong file của bước (`docs/tasks/`). Helper chỉ cho test để trong `*_test.go` / `*.test.ts`.
- **Go:** package theo miền trong `internal/` (`model` kiểu thuần, `script` đọc / kiểm tra kịch bản, `engine` chạy, `store` lưu, `device` thiết bị, `vision`, `launch` – xem `ARCHITECTURE.md` §8), phụ thuộc một chiều, `main` chỉ giữ Wails + method `App` gọi xuống; trong package một file một nhóm (`flow.go` kiểu + thứ tự, `flowcheck.go` kiểm tra, `flowrun.go` engine, `vars.go` biến…). Helper test dùng ở nhiều package → package `<pkg>test` (vd `model/modeltest`, `vision/visiontest`, `device/devicetest`), không chép. Thiết bị (chuột, màn hình, OCR, mở app) qua interface để test bằng bản giả. Lỗi cho người dùng / AI có cấu trúc (`ScriptError`, `StepError` + mã).
- Dữ liệu giả chỉ ở `src/demo/`. Comment tiếng Việt, ngắn, nói *vì sao* / ràng buộc; không comment lại điều code đã nói.

## Quy ước UI

Theo **design v2** – chi tiết token, thành phần, icon trong `design/DESIGN.md`.

- Tailwind **v4**: token trong `style.css` (chép từ `design/theme.css` – sửa token thì sửa cả hai), không tạo `tailwind.config.js`. Body không tô nền (overlay / mini bar cần trong suốt) – mỗi màn tự tô `bg-bg` / `bg-surface`.
- Token: `bg` nền, `chrome` thanh tiêu đề / status bar, `side` thanh bên, `surface` thẻ / inspector / popup, `field` ô nhập, `soft` / `hover` nền pha nhẹ, `line` / `line-strong` viền, `ink` / `muted` chữ, `accent` / `accent-soft` / `accent-text` (chỉ cho trạng thái), `warn`, `ok`, `danger*`; `hud*` / `dim` cho overlay (luôn tối).
- Theme tối = bảng **Slate** (`design/newdarkmode.md`; lớp càng cao càng sáng: `bg` → `surface` → `field` / `soft` → `raised`). Chữ trên nền `accent` dùng `text-on-accent`, không `text-white`.
- Theme: `data-theme="light|dark"` trên `<html>` (`theme.ts`, lưu qua `internal/store/settings.go`), không đặt = theo hệ điều hành; overlay đặt `data-theme="dark"` riêng.
- Gradient chỉ ở 4 chỗ: `btn-primary`, `ring-selected`, `ring-focus`, vòng tiến độ thanh mini. Nút Dừng `btn-danger-soft`.
- Font `font-sans` (Segoe UI Variable → Plus Jakarta Sans) cho chữ, `font-mono` (Cascadia Mono → JetBrains Mono) cho số / toạ độ / thời gian. Font local qua `@fontsource`, không Google Fonts.

## Lưu ý nền tảng

- Dev trên macOS **và Windows** (từ 2026-10-19 – phần Windows làm + test ngay trên máy Windows): cài đặt, lệnh, lưu ý riêng Windows ở **`docs/windows-dev.md`** – đọc trước khi làm trên Windows. Phát hành đầu tiên cho Windows (robotgo cần cgo + MinGW-w64).
- Toạ độ chuột / màn hình chỉ qua `device.Location` / `device.Displays` / `device.Input` (Windows: pixel thật qua Win32 – không gọi thẳng `robotgo.Location` / `Move`).
- macOS: cấp quyền Accessibility (và Screen Recording cho tìm ảnh / chữ) cho terminal / app thì robotgo mới chạy được.
- Wails v2 chỉ có một cửa sổ: overlay và mini bar là chế độ của cửa sổ chính.
