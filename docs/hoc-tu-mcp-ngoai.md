# Học từ MCP / công cụ ngoài

Ghi chú từ việc đọc code các dự án cùng loại (2026-10-28). Mỗi ý: *họ làm gì* → *Ghosthand đang thế nào* → *làm ở bước nào*. Phần lớn đã thành mục của [bước 56](tasks/phase3/56-hoc-tu-mcp-ngoai.md) (mỗi mục ghi số ý ở đây) – đọc ý tương ứng trước khi làm. Ý đã làm thì xoá khỏi đây (ghi vào file bước).

Nguồn đã đọc: `ChromeDevTools/chrome-devtools-mcp` (`src/utils/WaitForHelper.ts`, `TextSnapshot.ts`, `tools/categories.ts`, `SlimMcpResponse.ts`, `utils/pagination.ts`), `microsoft/playwright-mcp` (`README.md`, `config.d.ts` – code nằm ở monorepo Playwright `packages/playwright-core/src/tools/mcp`), `visionki/computer-agent-mcp` (`prompts.py`, `runner.py`, `monitor.py`), `domdomegg/computer-use-mcp` (`src/tools/computer.ts`), `microsoft/OmniParser` (README), `openclaw/openclaw` (`docs/tools/` exec-approvals, loop-detection, ask-user, browser-login, lobster, trajectory; `extensions/` lobster, zalo, zalouser, tokenjuice, cua-computer) – bước 53 mới học từ repo cầu nối nhỏ, đây là bản chính.

## Web (node web, `read_web_outline`, `run_step`) – bước 46 đợt C / 36

1. **Chờ sau thao tác, báo điều đã xảy ra** (chrome-devtools-mcp `WaitForHelper.waitForEventsAfterAction`): trước khi click đăng ký nghe điều hướng + popup + hộp thoại JS; sau click chờ ~100 ms xem có điều hướng không → có thì chờ tải xong → chờ DOM yên bằng `MutationObserver` (100 ms không đổi, tối đa 3 s). Kết quả trả `navigatedToUrl`, `dialogHandled`, `openedPages`. Mọi mốc nhân hệ số theo mạng / CPU chậm.
   - Ghosthand: `web/pageload.go` hỏi số phần tử mỗi 300 ms, cần đứng yên 1,5 s (chỉ dùng khi thử trang); node click web xong là trả, node sau tự chờ.
   - Có thể làm: output node click / gõ web thêm `navigated` / `url` / `popup` (AI và cổng nhánh dùng được); chờ yên bằng `MutationObserver` cho nhanh hơn hỏi theo chu kỳ.
2. **Hộp thoại JS (`alert` / `confirm` / `beforeunload`) làm treo trang** – họ huỷ thao tác và báo "bị hộp thoại chặn", hoặc tự chấp nhận / bỏ theo tham số `handleDialog`; snapshot cây cũng có hạn giờ để không treo khi renderer bị hộp thoại dừng.
   - Ghosthand: chưa nghe `Page.javascriptDialogOpening` – node web gặp `alert` sẽ chờ tới hết giờ với lỗi khó hiểu. Đáng thêm: lỗi có mã riêng kèm chữ trong hộp thoại, trường tuỳ chọn *Hộp thoại JS: chấp nhận / bỏ*.
3. **Id phần tử giữ nguyên giữa các lần đọc** (`TextSnapshot`): uid gắn theo `loaderId + backendNodeId`, đọc lại cây cùng trang thì phần tử cũ giữ uid cũ → AI so được trước / sau, không phải đọc lại để lấy id mới.
   - Ghosthand: `read_web_outline` trả selector (bền hơn uid cho kịch bản lưu); nếu sau này có số `#n` cho AI bấm thử thì nên giữ ổn định theo cách này.
4. **Tìm trong cây thay vì đọc cả cây** (playwright `browser_find`): chữ / regex → các nút khớp kèm đường dẫn từ gốc + vài dòng quanh. Ghosthand: thêm tham số `find` cho `read_web_outline` / `describe_screen elements=true` khi trang lớn.
5. **Điền nhiều ô một lần** (playwright `browser_fill_form`: mảng `{ref, value}`) – một lần gọi MCP thay cho N lần, hợp với form dài; cân nhắc cho `run_step` / node gõ web.
6. **Lưu / nạp phiên đăng nhập** (playwright `browser_storage_state` / `set_storage_state`: cookie + localStorage ra file). Liên quan đồng bộ cloud (54) và kịch bản chạy ở máy khác – nhạy cảm như bí mật, phải đi qua kho bí mật nếu làm.

## MCP của app (chữ cho AI) – giữ trong `budget_test.go`

7. **Nhóm tool bật theo nhu cầu** (chrome-devtools `ToolCategory` + cờ `--category-*`, chế độ `--slim` chỉ 3 tool; playwright `--caps=vision,pdf,network…`): client chỉ thấy tool của nhóm đã bật → danh sách tool ngắn. Ghosthand có công tắc AI 4 mức theo `kind`; có thể thêm Cài đặt ẩn nhóm ít dùng (template, simulate…) nếu danh sách tool phình.
8. **Phân trang danh sách dài** (`utils/pagination.ts`: `pageSize` mặc định 20, `pageIdx`, trả `totalPages` / `hasNextPage`, trang sai thì về trang 0 kèm cờ `invalidPage`). Dùng cho `list_scripts`, lịch sử chạy, `findAll` nhiều kết quả.
9. **Tuỳ chọn trả ảnh** (playwright `imageResponses: allow | omit | only`): client không xem được ảnh thì bỏ ảnh, đỡ token. Ghosthand `screenshot` / ảnh lỗi trong `wait_run` có thể theo một cài đặt tương tự.
10. **Che bí mật trong mọi kết quả** (playwright `secrets`: thay giá trị bằng tên) – Ghosthand đã có (43 S10, 53 B1), giữ nguyên.

## Màn hình / tầm nhìn – bước 31d (tìm phần tử bằng AI)

11. **Vòng nhìn chạy trong app, AI ngoài chỉ nhận kết quả** (computer-agent-mcp): một tool nhận *việc cần làm*, bên trong lặp chụp → model vision quyết → thao tác. Đáng lấy cho *tìm phần tử bằng AI*:
    - Model trả JSON cố định: `status` `act | completed | blocked | failed`, `observation` (màn hiện tại), `expected_outcome` (màn sau phải thấy gì), `memory_update` (chỉ điều mới), `block_reason` (`requires_login`, `requires_captcha`, `needs_human_input`…) + `next_user_action`.
    - Luật "chỉ báo `completed` khi ảnh mới nhất có bằng chứng rõ" – tránh báo xong khi chỉ mới bấm.
    - **Phát hiện kẹt**: băm ảnh sau mỗi lượt; ảnh không đổi + cùng chữ ký thao tác → tăng `stalled_count`, ghi vào lịch sử để model đổi cách. Ghosthand có `screen_changes` – engine có thể dùng cách băm này để báo "click không có tác dụng" ở `error.detail`.
    - Model báo `image_width` / `image_height` nó đang dùng → đổi toạ độ ra màn thật, không đoán tỷ lệ.
12. **Vẽ con trỏ lên ảnh chụp** (computer-use-mcp): ảnh gửi AI có dấu chữ thập đỏ ở vị trí chuột; sau khi click AI so dấu với đích để chỉnh. Toạ độ AI đưa theo không gian ảnh đã thu nhỏ, server tự nhân tỷ lệ và từ chối toạ độ ngoài màn. Ghosthand `screenshot` trả `scale` để AI tự nhân – thêm dấu chuột (tuỳ chọn) rẻ mà giúp AI tự sửa lệch.
13. **Tách thao tác của engine khỏi thao tác người dùng** (computer-agent `SyntheticEventFilter`): ghi trước click / phím engine sắp gây ra (vị trí ± 8 px, hạn ~0,45 s), sự kiện khớp thì bỏ qua, còn lại là người dùng → dừng. Ghosthand `device/failsafe.go` `TrackingInput` đã làm cùng ý cho chuột (lệch ≤ 2 px); nếu sau này bắt cả phím / cuộn của người dùng thì theo mẫu này.
14. **OmniParser** (Microsoft): nhận nút / icon trên ảnh chụp (khung + có bấm được không + chú thích) cho app không có cây Accessibility (canvas, game, app vẽ tay). Ứng viên dự phòng khi ảnh mẫu / chữ / phần tử đều không thấy; nặng (Python + model, GPU) → chỉ làm dạng server / dịch vụ tuỳ chọn, không kèm app. Ghosthand đã có `marks=true` + `suggest_selector` cho phần có Accessibility.

## OpenClaw – trợ lý AI chạy trên máy (cùng loại nhất với Ghosthand)

15. **Hộp duyệt phải an toàn trước chính AI** (`exec-approvals.md` *macOS split*: chặn thao tác chuột / phím khi đang chờ duyệt) – **đã sửa 2026-10-28** ở [31](tasks/phase3/31-mcp-ai.md): `device.SelfGuardInput` – lượt AI không nhấn / gõ vào cửa sổ Ghosthand.
16. **Điểm duyệt / câu hỏi giữa flow** (Lobster: workflow trả `needs_approval` + `prompt` + `items` + `resumeToken`, chạy tiếp bằng `resume {token, approve}`; `ask_user`: 1–3 câu có lựa chọn + *Khác*, hết giờ thì ghi *hết hạn*).
    - Ghosthand chỉ hỏi input lúc bấm Chạy, chưa có node dừng giữa chừng. Có thể làm node **Hỏi người dùng** (`askUser`): câu hỏi + lựa chọn / ô nhập (nhận biến, vd "Gửi 3 email nháp này?" kèm danh sách), hiện trên thanh mini + thông báo hệ thống, cổng `approve` / `deny` / `timeout`, câu trả lời vào output; MCP: `wait_run` trả `status: needs_input` + câu hỏi để AI báo người dùng. Hợp với node ghi / gửi / xoá thay cho xác nhận một lần trước khi chạy (46 C1).
17. **Chặn vòng lặp lỗi y hệt** (`loop-detection.md`): luôn dừng lượt sau **3 lỗi liên tiếp giống hệt** (cùng tool + tham số + kết quả), báo cách gỡ; kết quả / tham số khác hay một lần thành công thì đếm lại. Ghosthand MCP: đếm `run_script` / `run_step` lỗi giống hệt (node + mã lỗi + tham số) → lần thứ 3 trả thêm gợi ý "đổi cách – xem `topic=debug`" thay vì để AI thử mãi (đi cùng ý 11 *phát hiện kẹt*).
18. **Duyệt lệnh gắn đúng thứ đã duyệt** (`exec-approvals.md` *Trust model*): duyệt gắn cwd + argv + đường dẫn thật của file chạy; lệnh chạy một file script (`sh x.sh`, `python y.py`) thì gắn **hash nội dung file** – file đổi sau khi duyệt → từ chối, không chạy nội dung đã khác. Ghosthand node `shell` duyệt theo nội dung lệnh; lệnh gọi file script thì file đổi vẫn chạy – có thể gắn thêm hash file vào dấu vân tay đồng ý.
19. **Rút gọn output lệnh dài trước khi đưa AI** (tokenjuice: nén kết quả `exec` ồn – không đổi lệnh, không đổi mã thoát). Ghosthand: output `shell` / `http` / `pageText` trả qua MCP (`wait_run`) nên cắt đầu + cuối kèm số dòng bỏ, như `budget_test` đã làm cho chữ hướng dẫn.
20. **Zalo** – không có MCP server, nhưng OpenClaw có 2 plugin đáng tham khảo khi làm node gửi tin: `zalo` (Zalo **Bot API** chính thức – an toàn, cần tạo bot) và `zalouser` (tài khoản cá nhân qua thư viện `zca-js`, đăng nhập QR – chính họ cảnh báo **có thể bị khoá tài khoản**, không chính thức). Ghosthand: dùng node HTTP với Zalo Bot API / mẫu kịch bản, không làm tài khoản cá nhân.
21. **Trình duyệt: đăng nhập tay, không tự đăng nhập** (`browser-login.md`): hồ sơ Chrome riêng của app, người dùng tự đăng nhập một lần; tự điền mật khẩu dễ bị chặn bot / khoá tài khoản; chỉ dùng hồ sơ thật của người dùng khi họ đang ngồi máy. Hợp với hướng Chrome của app (25d / 36) – đưa vào chương *Hướng dẫn* trang web + `topic=debug` khi gặp trang đăng nhập.
22. **Gói chẩn đoán xuất được** (`trajectory.md`: một lệnh đóng gói cả dòng thời gian lần chạy – prompt, tool, kết quả, lỗi, cài đặt – **đã che bí mật**, xuất cũng phải qua duyệt vì chứa đường dẫn / dữ liệu). Ghosthand: nút *Xuất gói lỗi* ở lịch sử chạy (kịch bản + trace + ảnh lúc lỗi + phiên bản app / hệ điều hành, che `{{secret.*}}`) để người dùng gửi báo lỗi.

