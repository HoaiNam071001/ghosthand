# Ghosthand – Plan

Desktop app tự động click theo kịch bản: chọn vùng / toàn màn hình, chọn điểm, nối theo thứ tự, cấu hình thời gian và số lần click, kéo thả giữa 2 điểm.

## Trạng thái hiện tại

> Cập nhật mục này mỗi khi xong / bắt đầu một bước.

- **Đang làm:** **43** – node chuyên sâu ([phase3/43-node-chuyen-sau.md](phase3/43-node-chuyen-sau.md)): **S7 Màn hình / âm thanh + S3 Nguồn (kèm *Giữ máy thức*) + S6b Bật / tắt bộ gõ tiếng Việt xong code** (node `display`, `power`, op `toggleIME`; mẫu `man-hinh-am-thanh`, `nguon`), **S10 Kho bí mật xong code** (Cài đặt → Bí mật, `{{secret.<tên>}}`, che giá trị ở mọi kết quả; mẫu `bi-mat`), **S9 Thông báo hệ thống xong code** (node `notify` – toast / Notification Center, chưa có nút bấm; mẫu `thong-bao`), **S8 Nén / giải nén xong code** (node `zip` – nén file / thư mục theo mẫu tên, giải nén có chặn zip slip; mẫu `nen-giai-nen`), **S6 Bộ gõ xong code** (node `inputSource` – đọc / đổi bộ gõ hệ điều hành, báo Unikey / EVKey đang chạy; mẫu `bo-go`), **S5 Tiến trình xong code** (node `process` – đọc CPU / RAM, liệt kê, chờ chạy / thoát / hết bận; mẫu `tien-trinh`), **S4 Thông tin máy xong code** (node `sysInfo`; mẫu `thong-tin-may`), **S2 Shortcuts hệ điều hành xong code** (node `osShortcut`, macOS; mẫu `os-shortcut`), **S1 Chạy lệnh xong code** (node `shell` – lệnh phải được người dùng đồng ý theo nội dung; mẫu `chay-lenh`), **E3 Đọc tài liệu xong code** (node `readDocument` – chữ nguyên văn của ô soạn thảo hoặc phần đang chọn; mẫu `doc-tai-lieu`), **E2 Chờ sự kiện giao diện xong code** (node `waitUIEvent` – cửa sổ mới / đổi focus / phần tử mới / giá trị đổi, đọc lại 200 ms; mẫu `cho-su-kien-giao-dien`), **B1 Tab trình duyệt + B2 Đi tới URL + B3 Chuẩn hoá trình duyệt xong code phần macOS, B4 Đọc chữ trang + B5 Đọc bảng + B6 Chờ tải xong + B7 Lưu PDF + E1 Thao tác phần tử (macOS) xong code** (node `savePdf` – Cmd+P → nút Lưu của hộp in Chrome → gõ đường dẫn vào hộp lưu file → chờ file; mẫu `luu-pdf`) (node `waitDownload` – quét thư mục tải về, file mới khớp mẫu tên, hết đuôi tạm, cỡ đứng yên; output `path` / `name` / `size`; mẫu `cho-tai-xong`) (node `readTable` – bảng table / grid → `rows` / `items` / `columns`, tuỳ chọn ghi .csv / .xlsx; mẫu `phan-tu-doc-bang`) (node `pageText` – mọi chữ cửa sổ / một khung qua cây AX·UIA, output `text` / `lines` / `count`, mẫu `phan-tu-doc-chu-trang`; node `browserNorm` – thoát toàn màn hình, đặt cỡ cửa sổ, zoom 100 %, đóng popup; mẫu `chuan-hoa-trinh-duyet`; node `browserGo` – đổi trang trong tab qua AppleScript, chờ tải xong; node `browserTab` – đọc / liệt kê / chuyển / mở / đóng / tải lại / chờ tab của Chrome · Edge · Brave · Cốc Cốc thường qua JXA `osascript`, đóng đúng tab node Mở đã mở theo id tab; mẫu `tab-trinh-duyet`), B1w / B2w / B3w Windows xong code (UIA, thử thật trên Chrome), còn kiểm tra tay; B7w / E2w Windows chưa làm. **42** – dữ liệu & luồng ([phase3/42-du-lieu-luong.md](phase3/42-du-lieu-luong.md)): **G1–G5 xong code** (node *Chờ màn hình* `waitScreen` – đứng yên / thay đổi, vùng như Chụp màn hình, so ảnh xám thu nhỏ; mẫu `cho-man-hinh` + trang `loading.html`; node *Lặp qua danh sách* `forEach` – dòng chữ / mảng JSON / CSV / xlsx, cột → khoá không dấu, nút Đọc thử; mẫu `lap-danh-sach`; node *Tìm tất cả* `findAll` – mọi chỗ khớp ảnh / chữ / phần tử, `minCount` / `maxCount`, output `items` theo thứ tự đọc; mẫu `tim-tat-ca`; node *Tính toán* `calc` – bộ tính tự viết Go + TS cùng `testdata/calc.json`, biến chữ tự thành chuỗi; mẫu `tinh-toan`; 4 node xử lý chữ *Lọc mẫu* `textMatch` / *Tách chữ* `textSplit` / *Làm sạch chữ* `textClean` / *Số & ngày* `textNumber` – logic `internal/textop`, nút Chạy thử; mẫu `xu-ly-chu`; G5 trang *Bảng giá* `price-list.html` + mẫu `bang-gia` ghép cả bước), còn kiểm tra tay. **46** – MCP web tinh chỉnh ([phase3/46-mcp-web-tinh-chinh.md](phase3/46-mcp-web-tinh-chinh.md)): **đợt A + B (A0–A4, B1–B4) xong code** (sửa gốc 4 lỗi webType/selector, tool `read_web_outline`, probe_page theo tab đang hiện; `coordSpace: absolute` cho node có điểm – engine, kiểm tra, overlay, guide AI); A3 `webScope: dialog`, `occurrence`, selector `label=`, `skipFocusCheck`, mẫu `web-hop-thoai-form`); A4 `probe_page` trả `tab` + `tabs` kèm id, guide: id cho chạy thử, URL cho kịch bản lưu); B1 `run_script` nhận kịch bản tạm (không file, không lịch sử), B2 `update_script` đổi loại node, B3 node *Phím trên trang web* `webKey` qua CDP, B4 `screenshot webTab` + ảnh theo thứ tự node); còn kiểm tra tay, đợt C để sau. **45** – đổi tên thành Ghosthand ([phase3/45-doi-ten-ghosthand.md](phase3/45-doi-ten-ghosthand.md)): **xong code** (R1–R5: tên kỹ thuật `ghosthand`, UI *Ghosthand*, tự chuyển dữ liệu thư mục tên cũ – `store/migrate.go`, MCP bỏ mục `autoclicker` cũ), còn kiểm tra tay. **44** – thử trang + ưu tiên node cho AI ([phase3/44-thu-trang-uu-tien-node.md](phase3/44-thu-trang-uu-tien-node.md)): **T1–T5 xong code** (nút quả địa cầu Thử trang – mở trang trên Chrome của app, dò captcha / chặn bot / canvas / trống; Cài đặt *AI ưu tiên node* ảnh·chữ | trình duyệt app; MCP `probe_page` / `get_preferences` / `set_node_preference`, guide đổi theo mức; sân thử `captcha.html` + `canvas-game.html`), còn màn mẫu `#demo` + detail lỗi web kèm kết quả thử trang, kiểm tra tay. **40** – nhận dạng chữ / ảnh ([phase3/40-nhan-dang.md](phase3/40-nhan-dang.md)): **I1–I3 tìm ảnh xong code** (so viền, mặt nạ từ alpha, kiểm tra màu; mẫu `tim-anh-nang-cao`), **O0–O3 OCR xong code** (PaddleOCR không có tiếng Việt có thanh → Tesseract `vie` kèm trong exe, gọi DLL qua syscall, ảnh phóng ×2 + chuẩn hoá nền: trang thử đúng 60/60 chuỗi, OCR Windows 0/15; mẫu `chu-tieng-viet`), **đã kiểm tra tay 2026-10-21**, còn I2b. **41** – nơi lưu + xoá lịch sử: **xong, đã kiểm tra tay 2026-10-21**. **31b** – vòng thử – sửa cho AI ([phase3/31-mcp-ai.md](phase3/31-mcp-ai.md)): **xong code** (run_script / wait_run / stop_run / resume_run, chạy đến node / cụm / chạy tiếp với biến cũ, `error.detail` gần đúng mọi loại node + ảnh lúc lỗi, `shots: each`, output cửa sổ, describe_screen / screenshot, công tắc AI 4 mức + hộp hỏi + chip trên thanh mini, đụng chuột thì tạm dừng, app mở nền chỉ thanh mini), còn kiểm tra tay. **31a** – AI tạo / sửa kịch bản qua MCP: **xong code** (8 tool, resource guide / schema / examples, prompt, `autoclicker --mcp` stdio chuyển tiếp sang app, Cài đặt MCP + Thêm vào Claude Desktop, chip AI), còn kiểm tra tay. **22** – hẹn giờ / CLI / API local ([phase3/22-hen-gio-cli-api.md](phase3/22-hen-gio-cli-api.md)): **xong code** (phiên chạy runId, API local + SSE, CLI `autoclicker run`, revision kịch bản, hẹn giờ + thông báo, Cài đặt API), còn kiểm tra tay. **38** – UI v3 gọn ([phase3/38-ui-v3.md](phase3/38-ui-v3.md)): **xong code** (màu 7 nhóm node, thẻ node 168, khung app + nút Chạy tách đôi, inspector thu gọn + ô nhập có menu ⋯), còn kiểm tra tay. **37** – phần tử màn hình qua Accessibility ([phase3/37-phan-tu-man-hinh.md](phase3/37-phan-tu-man-hinh.md)): **E0** (đọc cây AX macOS – Chrome thường, Finder, Electron) + **E1** (tìm theo text= / aria= / role=, chỗ thứ N, lọc vùng), **E2** (Chờ / Click theo phần tử + điều kiện *thấy phần tử* ở engine; node **Đọc phần tử** có inspector; 3 mẫu thử trên `element.html`), **E3** (UI Tìm theo: Phần tử, Chọn trên màn, Thử tìm), **E4** (đọc chữ cạnh nhãn bằng OCR, lọc mẫu, lấy số, chờ giá trị đổi) xong code; **E5 Windows (UI Automation) xong 2026-10-19**, 4 mẫu phần tử chạy thật qua trên Windows; còn chuẩn bị MCP. **35** – node nâng cao ([phase3/35-node-nang-cao.md](phase3/35-node-nang-cao.md)): **xong code** (N0 mô tả node, Chụp màn hình, Clipboard, HTTP, Tệp / thư mục, Âm lượng, Chờ đến giờ, Vẽ đường, mẫu thử), còn kiểm tra tay. **34** – thao tác giống người ([phase3/34-giong-nguoi.md](phase3/34-giong-nguoi.md)): **xong code** (H1–H5, Xem trước đi theo đường cong), còn kiểm tra tay. 20 – flow kiểu n8n ([phase3/20-flow.md](phase3/20-flow.md)): F0, F4a, F1, F2, F4b, F3, F5, F5b (toạ độ nhận biến), **F5c** (output mọi node + ô số nhận biến), **F6** (Xem trước đi theo nhánh – menu Nhánh; thanh mini ghi cổng đã đi + lượt Đếm), **F7** (chuẩn bị MCP: lỗi cạnh có `edgeId`, chạy riêng một node) – **xong code cả bước 20** – 32 (tách Go) xong code. **33** (kịch bản mẫu để test) xong code – 31 mẫu chạy thật qua 31/31; **25d** (web qua DOM): D0 đo toạ độ 0–2 px trên Retina, **D0–D4 xong code** (node Chờ / Click / Gõ / Đọc / Cuộn phần tử web qua Chrome của app; chờ khung đứng yên + thử hover, iframe, `role=`; inspector có trạng thái kết nối, Chọn phần tử trên trang, Thử tìm; chạy nền theo từng node – Chrome bị che / thu nhỏ vẫn chạy; `PageOutline` cây rút gọn cho AI), còn kiểm tra tay. Việc chờ kiểm tra tay: [checks.md](checks.md). 30 còn ánh xạ theo 4 điểm mốc. **18a** build exe qua GitHub Actions xong; bước 17 (phần Windows) và 18b hoãn: chưa có máy Windows
- **Tiếp theo:** **43** S (node chuyên sâu: trình duyệt thường, phần tử app, hệ điều hành, cho AI – [phase3/43-node-chuyen-sau.md](phase3/43-node-chuyen-sau.md)) → 31c (31a xong code; nền phiên chạy `runId` + API local + revision đã có từ 22) → 39 → 24 → 28 → 36; 26 còn W0c macOS (làm trên máy Mac) (việc qua Chrome của app – cuối plan) (bảng thứ tự đầu Phase 3; 25c đã gộp vào 20 F5); MCP cho AI (31) làm sau 22, các bước trước nhớ làm mục *Chuẩn bị cho MCP*. **Đã có máy Windows (2026-10-19)**: phần Windows làm + test trên máy Windows bằng Claude Code ([docs/windows-dev.md](../windows-dev.md)) – đã làm 17 (DPI 125 %), 25e (OCR Windows), 37 E5 (UI Automation); 26 W0 (Windows) + **W1–W3a node Cửa sổ** + **A1–A3 node Ứng dụng** xong (mẫu `cua-so-dat-co`, `ung-dung-mo-dong` chạy thật qua), **W3b** overlay vẽ khung đích – còn W0c macOS, thử 100 % / 150 % / 2 màn
- **Cập nhật lần cuối:** 2026-10-26 (51 H1: modal Hướng dẫn – `internal/guide` JSON chung Go + TS, `components/guide/`, `guideNav.ts`, F1 / nút ?, link từ bảng Thêm node + inspector, chương chung + *Chọn cách tìm*, màn `#demo-guide`); trước đó 2026-10-25 (49: Cài đặt rộng, thanh overlay đặt cạnh + co giãn, Lịch sử Tất cả output); trước đó 2026-10-24 (48 P1–P4: kiểm tra quyền macOS – tab Quyền, cảnh báo node / trước Chạy, tool AI `check_permissions`; còn P5); trước đó 2026-10-24 (31c: tool ảnh mẫu `capture_template` / `find_image` / `get_mouse_position` / `list_windows`); trước đó 2026-10-22 (43 S7 / S3 / S6b – `internal/display`, `internal/power`, `engine/display.go`, `engine/power.go`, `Script.KeepAwake`; 43 S10 – `internal/secrets`, `engine/mask.go`, `settings/SecretsSettings`, mẫu `bi-mat`; 43 S9 – `StepNotify`, `internal/toast`, `engine/toast.go`, `stepform/NotifyFields`, mẫu `thong-bao`; 43 S8 – `StepZip`, `engine/zip.go`, `stepform/ZipFields`, mẫu `nen-giai-nen`; 43 S6 – `StepInputSource`, `internal/inputsource`, `engine/inputsource.go`, `stepform/InputSourceFields`, mẫu `bo-go`; 43 S5 – `StepProcess`, `internal/procinfo`, `engine/process.go`, `stepform/ProcessFields`, mẫu `tien-trinh`; 43 S4 – `StepSysInfo`, `internal/sysinfo`, `engine/sysinfo.go`, mẫu `thong-tin-may`; 43 S2 – `StepOSShortcut`, `internal/shortcuts`, `engine/osshortcut.go`, mẫu `os-shortcut`; 43 S1 – `StepShell`, `internal/shell`, `engine/shell.go`, `DangerShell`, `stepform/ShellFields`, mẫu `chay-lenh`; 43 E3 – `StepReadDocument`, `SelectionOnly`, `Node.Selected`, `element.DocumentIndex`, `engine/readdocument.go`, `stepform/ReadDocumentFields`, mẫu `doc-tai-lieu`; 43 E2 – `StepWaitUIEvent`, `UIEvent`, `engine/waituievent.go`, `stepform/WaitUIEventFields`, mẫu `cho-su-kien-giao-dien`; 43 B7 – `StepSavePdf`, `engine/savepdf.go`, `browser.BundleID`, `script/tabcheck.go` + `stepform/SavePdfFields`, mẫu `luu-pdf`; 43 E1 – `StepElementAction`, `ElementAct`, `ElementReader.Act` (cgo `ax_do`), `engine/elementaction.go`, `stepform/ElementActionFields`, trang `form-controls.html`; 43 B6 – `StepWaitDownload`, `engine/waitdownload.go`, `stepform/WaitDownloadFields`, trang `download.html`; 43 B5 – `StepReadTable`, `element/table.go`, `engine/readtable.go`, `stepform/ReadTableFields`, trang `orders.html`; 43 B4 – `StepPageText` + `PageAll`, `element/pagetext.go`, `engine/pagetext.go`, `script/element.go` `checkPageText`, `stepform/PageTextFields` + `ElementQueryFields optional`; 43 B3 – `StepBrowserNorm` + `Norm*`, `Backend.Frame` / `Normalize`, `engine/browsernorm.go`, `stepform/BrowserNormFields` + `BoundsFields` tách khỏi `WindowFields`; 43 B2 – `StepBrowserGo`, `browser.Backend.Go` + `TabInfo.Loading`, `engine/browsergo.go`, `stepform/BrowserGoFields` + `TabTargetFields`; 43 B1 – `StepBrowserTab` + `TabOp` / `Browser` / `TabMatch` / `TabFrom`, `model/browser.go`, `internal/browser` (`tabs.js` JXA, `tabs_darwin.go`, `browsertest.Fake`), `engine/browsertab.go`, node Mở ghi tab khi có `tabFrom` trỏ vào, `script/tabcheck.go`, `flow/browserTab.ts`, `stepform/BrowserTabFields`; 42 G5 – trang `price-list.html`, mẫu `bang-gia`; 42 G4b – `StepTextMatch` / `TextSplit` / `TextClean` / `TextNumber` + trường `Pattern`…`DateLayout`, hằng loại node sang `model/kinds.go`, `internal/textop`, `engine/textnodes.go` (`RunTextNode`), `script/textcheck.go`, `textapi.go` (`PreviewText`), `flow/textNodes.ts`, `nodes/TextNodeFields` + `TextPreviewButton`, `stepAdvanced.ts` `TextFields`; 42 G4a – `StepCalc`, `script/calc.go` + `calcparts.go` (`EvalCalc`, `CalcQuote`, `CheckCalc`), `VarField.Calc`, `flow/calc.ts`, `nodes/CalcFields`, `testdata/calc.json`, `scroll.ts` tách khỏi `types.ts`; 42 G3 – `StepFindAll` + `MinCount` / `MaxCount`, `engine/findall.go`, `vision/matchall.go`, `script/findcheck.go`, `flow/findAll.ts`, `stepform/FindAllFields`; 42 G2 – `StepForEach` + `ListFrom`, `PortItem`, `engine/foreach.go` (`PreviewList`, `colKey`), `listapi.go`, `nodes/ForEachFields`, xem trước forEach trong `flow/preview.ts`; hằng FindBy / ReadFrom / ScrollMode chuyển sang `model/enums.go`; 42 G1 – `StepWaitScreen` + `WaitMode` / `StableMs` / `DiffPct`, `engine/waitscreen.go`, `vision/screendiff.go`, `script/shotcheck.go`, `flow/waitScreen.ts`, `stepform/WaitScreenFields` + `ShotAreaField`; 46 B1–B4 – `session.Options.NoHistory`, `mcpsrv/tempscripts.go`, `script/patchtype.go`, `StepWebKey` + `web/keys.go` + `engine/webkey.go`, `web/screenshot.go` + `Backend.TabShot`, `stepform/WebKeyFields` / `WebTabField`; 46 A4 – `web.PageCheck.Tab` / `Tabs`, guide id tab; 46 A3 – `Step.SkipFocusCheck` / `WebScope`, `model.SelLabel` + `WebScopes`, `web.Query.Scope` / `Occurrence`, `Found.NoDialog`, `find.js` `byLabel` / phạm vi hộp thoại, `stepform/WebScopeField.tsx`; 46 A1 – `Step.CoordSpace`, `script.StepBounds` ↔ `stepBounds`, store `boundsOf(region, step)` / `isAbsolute`, lỗi ngoài vùng nêu gốc vùng; 45 – đổi tên Ghosthand: module Go, `GHOSTHAND_*`, `store.MigrateOldName` trong `main.go`, `AddToClaudeDesktop` xoá mục cũ; bỏ file chạy `./autoclicker` khỏi git; 44 T1–T5 – `web/pagecheck.go` + `pagecheck.js` `CheckPage` / `classifyPage`, `MCPSettings.NodePref` + `store.SetNodePref`, `mcpsrv/tools_web.go` + `KindSettings`, guide `nodePrefTips`, event `mcp:nodePref`, `components/pagecheck/`, `settings/NodePrefSettings`; 40 + 41 kiểm tra tay đạt hết); 2026-10-20 (41 L1–L4 – `store/storagedirs.go` + `knownfolder_windows.go`, `Settings.Storage`, `engine.Options.ShotsDir`, ảnh mặc định đổi sang `Pictures/Auto Clicker`, Cài đặt tab Lưu trữ / API / AI, `DeleteRun` / `ClearRuns`, `ForgetRecent`; 40 I1–I3 – tìm ảnh: `matchMode: edge` so viền Sobel (chịu đổi theme), ảnh mẫu PNG có alpha = mặt nạ, `colorTol` kiểm tra màu trung bình – `vision.Template` / `MatchOptions`, engine `imagematch.go`, UI `stepform/MatchFields`, trang `image-plus.html`; 31b xong code – detail web: số khớp từng selector + đoạn outline gần giống; người dùng đụng chuột lúc AI chạy → tự tạm dừng (`device.WatchTouch`); chip mức AI trên thanh mini; `shots: "each"` chụp sau mỗi node (sau delayAfter, giữ 12 ảnh, `wait_run shots` xin theo tên); output `window` / `windowApp` sau click / gõ / phím, node Mở dò cửa sổ mới (`newWindow`); `error.detail` gần đúng cho chữ (dòng OCR kèm khung) / phần tử / web / cửa sổ / ứng dụng (`vision.Similarity`, `element.NearMatches`), engine `StopAt` / `Seed` / `Carry`, `script.RunPart`, `StepError.Detail`, session `Trace` / `SeedRun`, 6 tool MCP chạy + nhìn màn hình, `mcprun.go` quyền AI + `--background`; 31a – MCP cho AI: `internal/mcpsrv`, kịch bản dạng gọn `script.Compact` + sửa theo node `script.Patch`, stdio `--mcp`, Cài đặt MCP; 22 – phiên chạy `internal/session` có runId, API local `internal/api` + CLI `autoclicker run`, revision kịch bản, hẹn giờ + thông báo Telegram / Discord / webhook, Cài đặt API; 26 W3b – overlay vẽ khung đích của node Cửa sổ *Đặt vị trí + cỡ* theo vùng làm việc từng màn, Xem trước hiện khung của node đang diễn); 2026-10-19 (26 A1–A3 – node Ứng dụng: kiểm tra đang chạy → cổng yes / no, chờ chạy / thoát, thoát / buộc thoát, chặn app hệ thống; xác nhận xoá tổng quát thành thao tác nguy hiểm (buộc thoát, đóng cửa sổ); 26 W1–W3a – node Cửa sổ: focus / chờ mở · đóng / đặt khung theo preset / thu nhỏ / đóng, inspector chọn từ cửa sổ đang mở; 20 F7 – chạy riêng một node, lỗi cạnh có edgeId; 20 F6 – Xem trước theo nhánh + thanh mini; trước đó 26 W0 Windows – liệt kê / điều khiển cửa sổ + app qua Win32; trước đó 37 E5, 25e, 17 / 18b trên Windows)

## Tính năng của hệ thống

> ✅ có, chạy được · 🧪 xong code, chờ bạn kiểm tra tay ([checks.md](checks.md)) · 🟡 có một phần · ⬜ chưa làm. Bấm cột *Bước* để xem chi tiết.
> Cập nhật bảng này khi một tính năng đổi trạng thái (viết tay, khác bảng *Tổng quan* tự sinh ở dưới).

### Soạn kịch bản

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| 🧪 | Canvas flow kiểu n8n | Kéo node, nối cổng ra → node kế, thả cổng ở chỗ trống để thêm node, tự xếp, zoom, minimap | [20 F4b](phase3/20-flow.md) |
| ✅ | Bảng thêm node Ctrl/Cmd+K | Tìm không dấu, phím mũi tên, nối vào node đang chọn | [20](phase3/20-flow.md) |
| ✅ | Sửa node | Tên, mã node (n2), cổng ra, output, bật / tắt, node bắt đầu; copy / paste, nhân bản, chọn nhiều, xoá | [20 F4b](phase3/20-flow.md) |
| ✅ | Hoàn tác / làm lại | Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z cho mọi thay đổi | [30](phase3/30-sua-nhieu-diem.md) |
| ✅ | Chọn vùng / toàn màn hình, đặt điểm | Overlay: click hoặc F6, kéo marker, chọn lại điểm, xem riêng một node | [10–13](phase1-mvp.md), [19c](phase2.md) |
| ✅ | Neo điểm theo cạnh vùng | Điểm bám góc / cạnh / giữa / % – đổi cỡ vùng không lệch | [29](phase3/29-neo-diem.md) |
| 🟡 | Sửa nhiều điểm cùng lúc | Di chuyển, co giãn, xoay, xiên, căn, lật, ánh xạ khi đổi vùng – **còn** ánh xạ theo 4 điểm mốc | [30](phase3/30-sua-nhieu-diem.md) |
| ✅ | Input của kịch bản | Ghim trường làm input, `{{biến}}` trong ô chữ, form Chạy, preset, nhớ giá trị lần trước | [21b](phase3/21b-input.md) |
| ✅ | Lưu / mở kịch bản | File `.json`, mở gần đây, nháp tự lưu, hỏi lưu khi đóng | [21](phase3/21-luu-tai.md) |
| ✅ | Nơi lưu + xoá lịch sử | Cài đặt chọn thư mục kịch bản (tay / AI) + ảnh chụp, Documents / Pictures đúng cả khi Windows dùng OneDrive; xoá từng mục / tất cả lịch sử chạy và Mở gần đây | [41](phase3/41-noi-luu-lich-su.md) |
| ⬜ | Ghi macro | Ghi click / kéo / gõ phím thành node, F9 dừng | [24](phase3/24-ghi-macro.md) |

### Node hành động

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Click / double click / giữ chuột / kéo thả | Nút trái / phải / giữa, số lần click, kéo từ điểm trước, B lệch so với A | [7](phase1-mvp.md), [13](phase1-mvp.md) |
| ✅ | Ngẫu nhiên hoá | ± ms thời gian chờ, ± px vị trí | [19](phase2.md) |
| ✅ | Gõ chữ, phím tắt | Tiếng Việt, tổ hợp phím, gõ lần lượt | [7](phase1-mvp.md) |
| ✅ | Chờ, cuộn, mở URL / app | Cuộn theo nấc tại điểm / tại chuột; mở bằng app chỉ định | [23](phase3/23-cuon-mo-url.md) |
| 🧪 | Chờ ảnh / click theo ảnh / chờ màu pixel | Khoanh ảnh mẫu, Thử tìm, khác tỷ lệ Retina vẫn tìm được, mọi màn hình | [25](phase3/25-cho-anh.md) |
| 🧪 | Chờ chữ / click theo chữ (OCR) | Đọc chữ trên màn hình, bỏ dấu, chỗ thứ N – macOS (Vision); Windows (Windows.Media.Ocr, không có tiếng Việt → so không dấu, chịu lệch nhẹ) | [25e](phase3/25e-ocr.md) |
| 🟡 | Đọc chữ tiếng Việt trên Windows, tìm ảnh bền hơn | Tesseract `vie` (kèm sẵn trong exe) làm mặc định trên Windows; tìm ảnh so cạnh (đổi theme vẫn thấy), mặt nạ, kiểm tra màu | [40](phase3/40-nhan-dang.md) |
| ✅ | Thử lại khi thất bại | Thử lại N lần, nghỉ giữa các lần, hết lượt đi cổng Thất bại | [25b](phase3/25b-khi-that-bai.md), [20](phase3/20-flow.md) |
| 🧪 | Thao tác giống người | Chuột đi đường cong có tăng / giảm tốc, nhịp gõ / click / cuộn tự nhiên – bật sẵn mức vừa | [34](phase3/34-giong-nguoi.md) |
| 🧪 | Chụp màn hình, clipboard, HTTP | Đợt 1 node nâng cao: chụp màn / vùng ra file, đọc / ghi clipboard, gọi API | [35](phase3/35-node-nang-cao.md) |
| 🧪 | Tệp / thư mục, âm lượng, chờ đến giờ, vẽ đường | Đợt 2 node nâng cao (xoá vào Thùng rác); Bluetooth hoãn | [35](phase3/35-node-nang-cao.md) |
| 🟡 | Cửa sổ + Ứng dụng | Node Cửa sổ (focus, chờ mở / đóng, đặt vị trí + cỡ, thu nhỏ / phóng to / đóng, đọc) + node Ứng dụng (đang chạy? cổng yes / no, chờ chạy / thoát, thoát / buộc thoát) – cố định môi trường trước khi click. **Node Cửa sổ + Ứng dụng xong code trên Windows** (2026-10-19), macOS chưa | [26](phase3/26-cua-so-ung-dung.md) |
| 🧪 | Web qua DOM | **Chỉ trang cơ bản, không bắt đăng nhập / captcha** (2026-10-18; việc tiếp theo dời sang [36](phase3/36-chrome-app-sau.md)). Tìm phần tử trang bằng chữ / selector (Chrome), bấm bằng chuột thật – D1: Chờ / Click phần tử web, node Mở bằng Chrome của app; D2: chờ đứng yên + thử hover trước khi bấm, iframe cùng nguồn, `role=`; D3: Chọn phần tử trên trang, Thử tìm, trạng thái kết nối; D4a: Gõ vào ô / Đọc phần tử / Cuộn trang web (tới phần tử, trong khung, tới khi thấy); D4b: chạy nền theo từng node (CDP, không đụng chuột); D4c: `PageOutline` – cây phần tử rút gọn cho AI (MCP 31) | [25d](phase3/25d-web-dom.md) |
| 🧪 | Tìm / đọc phần tử màn hình (Accessibility) | **E0–E4 xong code (macOS)**: đọc cây, Chờ / Click theo phần tử (Tìm theo: Phần tử, Chọn trên màn, Thử tìm), node Đọc phần tử (+ đọc chữ cạnh nhãn bằng OCR, lọc mẫu, lấy số, chờ giá trị đổi), mẫu thử `element.html`. Chrome thường đã đăng nhập + app khác, không CDP: Chờ / Click theo phần tử, Đọc phần tử; dự phòng OCR cạnh nhãn + lọc mẫu – macOS (AX) + **Windows (UI Automation, E5 xong 2026-10-19)** | [37](phase3/37-phan-tu-man-hinh.md) |
| ⬜ | Trình duyệt thường (không CDP) | Chrome / Edge / Cốc Cốc / Brave: tab đầy đủ (cả đóng tab node Mở tạo), đi tới URL, chuẩn hoá, đọc chữ trang, đọc bảng, chờ tải xong, lưu PDF | [43 B](phase3/43-node-chuyen-sau.md) |
| ⬜ | Phần tử app không cần chuột, hệ điều hành | Bấm / đặt giá trị / tick qua AX / UIA, chờ sự kiện giao diện, đọc tài liệu; chạy lệnh (người duyệt), Shortcuts, nguồn, thông tin máy, tiến trình, bộ gõ, màn hình / âm thanh, zip, thông báo, kho bí mật | [43 E, S](phase3/43-node-chuyen-sau.md) |
| 🧪 | Kịch bản mẫu để test | Nút *Mẫu thử* ở Thư viện: mẫu đơn giản cho từng loại bước + nhiều kiểu web app, chạy trên sân thử cục bộ / vài web thật | [33](phase3/33-mau-thu.md) |

### Rẽ nhánh & luồng

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Cổng Thành công / Thất bại, vòng lặp bằng cạnh | Thất bại không nối = dừng báo lỗi; chặn lặp vô hạn 10 000 node / vòng | [20 F1–F2](phase3/20-flow.md) |
| 🧪 | Mọi node có output, ô số nhận biến | Gõ chữ / phím / cuộn / chờ / mở cũng trả output; số lần click, thời gian chờ… nhận `{{biến}}` | [20 F5c](phase3/20-flow.md) |
| 🧪 | Toạ độ lấy từ biến | Click / kéo / cuộn / chờ pixel tại `{{n2.output.x}}` (+ lệch px) – vd click cạnh chữ vừa tìm thấy | [20 F5b](phase3/20-flow.md) |
| ✅ | Biến giữa các node | `{{n2.output.x}}`, `{{n2.status}}`, `{{last…}}`, `{{vars…}}`; gợi ý khi gõ `{{` | [20](phase3/20-flow.md) |
| 🧪 | Nếu | Thấy chữ / ảnh / màu, so giá trị, và / hoặc, đảo, chờ tới khi đúng | [20 F3](phase3/20-flow.md) |
| 🧪 | Switch theo giá trị / theo màn hình | Bằng / chứa / khớp mẫu; màn nào hiện trước đi cổng đó | [20 F3](phase3/20-flow.md) |
| 🧪 | Đếm, Kết thúc, Đặt biến | Giới hạn số lần lặp; kết thúc thành công / báo lỗi; gán / cộng biến | [20 F3](phase3/20-flow.md) |
| 🧪 | Thử node | Xét Nếu / Switch trên màn hình lúc này, khung chỗ thấy trên overlay | [20 F3](phase3/20-flow.md) |
| 🟡 | Chờ màn hình đứng yên, lặp qua danh sách, tìm tất cả, tính toán / xử lý chữ | Chờ trang tải xong thay Chờ cố định; lặp theo chỗ thấy / CSV / JSON; regex, lấy số, biểu thức | [42](phase3/42-du-lieu-luong.md) |
| ⬜ | Nhóm node, nhúng kịch bản khác | Khung nhóm trên canvas, chép kịch bản khác vào thành một nhóm; group khoá (subflow) để dành | [39](phase3/39-gom-kich-ban.md) |

### Chạy

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Chạy N vòng / vô hạn / theo thời gian | Đếm ngược, F8 chạy / dừng, tạm dừng / tiếp tục, thanh mini | [8](phase1-mvp.md), [16](phase1-mvp.md) |
| ✅ | Dừng khẩn cấp | Rê chuột vào góc màn hình | [9](phase1-mvp.md) |
| 🧪 | Xem trước bằng con trỏ giả | Đi theo đồ thị, chọn nhánh ở menu Nhánh, Đếm chạy 1 lượt | [19b](phase2.md), [20 F6](phase3/20-flow.md) |
| 🧪 | Canvas khi chạy + nhật ký từng node | Đường đã đi, node xong / lỗi / ×n, bảng nhật ký (output, log, ảnh lúc lỗi), lời nhắn Kết thúc thành công | [20 F5](phase3/20-flow.md) |
| 🧪 | Lịch sử chạy, debug | Lưu 50 lần chạy gần nhất / kịch bản, mở lại từ thư viện; điểm dừng, từng node (F10), chạy từ node, chạy riêng một node | [20 F5](phase3/20-flow.md), [20 F7](phase3/20-flow.md) |
| 🧪 | Hẹn giờ, thông báo, CLI / API local | Chạy lúc HH:mm, báo Telegram / Discord / webhook, lệnh `ghosthand run`, API local cho chương trình khác (tắt mặc định). **Xong code 2026-10-20**, chưa thử tay | [22](phase3/22-hen-gio-cli-api.md) |

### AI

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ✅ | Mô tả loại node + hướng dẫn flow cho AI | `StepTypes`, `FlowGuide`, kịch bản mẫu – nền cho MCP | [20 F1](phase3/20-flow.md) |
| 🧪 | AI tạo / sửa kịch bản qua MCP | Claude / Cursor / Codex… ra lệnh bằng lời; kịch bản lưu ở Documents/Ghosthand, chip AI; chưa chạy được (31c) | [31a](phase3/31-mcp-ai.md) |
| 🟡 | AI tự chạy, xem lỗi, sửa, chạy tiếp; soạn bằng cách thử | Mở app nền (thanh mini), chạy một phần / chạy tiếp từ node lỗi với biến cũ, chi tiết lỗi có cấu trúc + ảnh khi lỗi, đọc chữ / chụp màn khi xin, công tắc AI 4 mức (có Tự chạy); ảnh mẫu do AI khoanh, chạy thử khô | [31b, 31c](phase3/31-mcp-ai.md) |
| 🧪 | Thử trang + ưu tiên node cho AI | Nút / tool `probe_page` mở trang trên Chrome của app, tự dò captcha / chặn bot / canvas → dùng node web hay ảnh / chữ; ưu tiên 2 mức (mặc định ảnh / chữ), AI đổi qua `set_node_preference` | [44](phase3/44-thu-trang-uu-tien-node.md) |
| ⬜ | MCP web – tinh chỉnh | `coordSpace`, `read_web_outline` tab đang điều khiển, `webType` bớt chặt + scope / occurrence, ghim tab ID, chạy kịch bản tạm, `webKey` | [46](phase3/46-mcp-web-tinh-chinh.md) |
| 🧪 | Tên app Ghosthand | Đổi tên Auto Clicker → Ghosthand ở UI, exe, CLI, MCP; tự chuyển dữ liệu ở thư mục tên cũ một lần | [45](phase3/45-doi-ten-ghosthand.md) |
| ⬜ | Hình minh hoạ động cho node | Bảng Thêm node: chọn / rê một loại node thì hiện hoạt hoạ ngắn (SVG / CSS theo theme) diễn tả node làm gì, chữ là phụ; mọi loại node | [47](phase3/47-hinh-minh-hoa-node.md) |
| ⬜ | AI nhìn màn hình theo phần tử | Ảnh đánh số phần tử, cây giao diện rút gọn mọi app, so sánh trước / sau, gợi ý selector bền | [43 A](phase3/43-node-chuyen-sau.md) |
| ⬜ | AI bên trong flow | Node Hỏi AI (nhiều nhà cung cấp, cả AI chạy trên máy), Gọi tool MCP khác – làm sau cùng của 31 | [31d](phase3/31-mcp-ai.md) |

### Giao diện & nền tảng

| | Tính năng | Ghi chú | Bước |
|---|---|---|---|
| ⬜ | Kiểm tra quyền trước khi chạy | Cài đặt → tab Quyền (Accessibility, Screen Recording, Automation Chrome / Finder / System Events, Thông báo…) + cảnh báo trên node và trước khi Chạy; Automation hỏi hệ điều hành không bật hộp thoại | [48](phase3/48-kiem-tra-quyen.md) |
| 🧪 | Cài đặt rộng hơn, thanh overlay đặt cạnh + co giãn theo màn, Lịch sử xem mọi output | Modal Cài đặt ~760px; Cài đặt chọn thanh overlay top / left / right / bottom, tự gọn theo cỡ màn; Lịch sử có chế độ Tất cả output + Chép | [49](phase3/49-cai-dat-overlay-lich-su.md) |
| 🧪 | Hướng dẫn sử dụng trong app (người + AI) | Modal Hướng dẫn: chương chung (cài đặt, quyền, chạy, biến, Cài đặt, chọn cách tìm) + trang từng node (ngữ cảnh, công nghệ, độ chính xác, hoạt hoạ, mẫu thử); JSON chung Go + TS, MCP `ghosthand://guide`; test bắt thiếu khi thêm node | [51](phase3/51-huong-dan.md) |
| ✅ | Giao diện v2, theme sáng / tối | Kiểu Windows 11; UI dựng sẵn cho tính năng *Sắp có* | [27](phase3/27-ui-v2.md), [27b](phase3/27b-ui-sap-co.md) |
| 🧪 | Giao diện v3 – gọn | Màu theo 7 nhóm node, thẻ node nhỏ (168), inspector thu gọn có tóm tắt, nút Chạy tách đôi + menu; theme tối giữ Slate | [38](phase3/38-ui-v3.md) |
| 🟡 | Đa màn hình / DPI | macOS xong (chờ kiểm tra tay 2 màn); Windows 125 % thử thật qua (chuột, chụp, ảnh mẫu), còn 100 % / 150 % / 2 màn | [17](phase1-mvp.md) |
| 🧪 | Bản Windows (.exe) | **18a**: GitHub Actions build exe mỗi lần push (tab Actions → Artifacts); chưa có OCR / phần tử màn hình / Cửa sổ trên Windows; thử máy sạch + DPI cần máy Windows (18b) | [18](phase1-mvp.md) |

## Tổng quan theo bước

> Bảng tự sinh – sau khi tick chạy `python3 scripts/tasks-index.py`. Bấm tên bước để mở file chi tiết.

<!-- index:start -->
**46 / 61 bước xong code** · 🧪 **[253 việc chờ bạn kiểm tra tay](checks.md)** · ✅ xong · 🧪 xong code, chờ kiểm tra tay · 🟡 đang làm · ⬜ chưa làm

### Phase 3 – Design v2 & tự động hoá (theo thứ tự làm)

| Trạng thái | Bước | Mục con xong | Kiểm tra tay |
|---|---|---|---|
| ✅ xong | [27. UI v2 cho các màn đang có + theme sáng / tối](phase3/27-ui-v2.md) | 18 / 18 |  |
| ✅ xong | [27b. Dựng sẵn UI cho tính năng chưa có](phase3/27b-ui-sap-co.md) | 13 / 13 |  |
| ✅ xong | [29. Neo điểm theo 4 góc vùng](phase3/29-neo-diem.md) | 10 / 10 |  |
| ✅ xong | [21. Lưu / tải kịch bản](phase3/21-luu-tai.md) | 8 / 8 |  |
| 🟡 đang làm | [30. Sửa nhiều điểm cùng lúc: di chuyển, co giãn, xoay, xiên](phase3/30-sua-nhieu-diem.md) | 9 / 10 | [1 việc](checks.md) |
| ✅ xong | [21b. Input của kịch bản](phase3/21b-input.md) | 13 / 13 |  |
| ✅ xong | [23. Cuộn + Mở URL / app](phase3/23-cuon-mo-url.md) | 8 / 8 |  |
| 🧪 chờ kiểm tra tay | [25. Chờ ảnh, click theo ảnh, chờ pixel](phase3/25-cho-anh.md) | 8 / 8 | [1 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [25e. Tìm theo chữ (OCR)](phase3/25e-ocr.md) | 6 / 7 | [3 việc](checks.md) |
| ✅ xong | [25b. Khi thất bại](phase3/25b-khi-that-bai.md) | 4 / 4 |  |
| 🧪 chờ kiểm tra tay | [20. Flow kiểu n8n – mỗi bước là một module, rẽ nhánh theo kết quả](phase3/20-flow.md) | 66 / 66 | [20 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [32. Tách `package main` ở root thành package trong `internal/`](phase3/32-go-packages.md) | 6 / 6 | [3 việc](checks.md) |
| 🟡 đang làm | [33. Danh sách kịch bản mẫu để test](phase3/33-mau-thu.md) | 8 / 10 | [4 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [25d. Web qua DOM – tìm phần tử bằng HTML, bấm bằng chuột thật](phase3/25d-web-dom.md) | 49 / 49 | [1 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [34. Thao tác giống người – di chuột, gõ, click, cuộn tự nhiên](phase3/34-giong-nguoi.md) | 7 / 7 | [5 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [35. Node nâng cao](phase3/35-node-nang-cao.md) | 9 / 9 | [9 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [38. UI v3 – gọn: màu theo nhóm node, thẻ node nhỏ, inspector thu gọn](phase3/38-ui-v3.md) | 9 / 11 | [7 việc](checks.md) |
| 🟡 đang làm | [37. Tìm / đọc phần tử màn hình qua Accessibility](phase3/37-phan-tu-man-hinh.md) | 10 / 11 | [7 việc](checks.md) |
| 🟡 đang làm | [26. Node Cửa sổ (`window`) + Ứng dụng (`app`)](phase3/26-cua-so-ung-dung.md) | 19 / 20 | [12 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [22. Hẹn giờ + thông báo + CLI / API local](phase3/22-hen-gio-cli-api.md) | 17 / 17 | [7 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [31b. MCP – vòng thử – sửa: AI tự chạy, xem lỗi, sửa, chạy tiếp](phase3/31-mcp-ai.md) | 19 / 19 | [15 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [31c. MCP – AI soạn bằng cách thử + ảnh mẫu](phase3/31-mcp-ai.md) | 5 / 5 | [7 việc](checks.md) |
| 🟡 đang làm | [31d. AI bên trong flow](phase3/31-mcp-ai.md) | 7 / 11 |  |
| ✅ xong | [41. Nơi lưu kịch bản / ảnh chụp + xoá lịch sử](phase3/41-noi-luu-lich-su.md) | 4 / 4 |  |
| 🟡 đang làm | [44. Thử trang trên Chrome của app + ưu tiên node cho AI](phase3/44-thu-trang-uu-tien-node.md) | 8 / 8 | [8 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [45. Đổi tên app thành Ghosthand](phase3/45-doi-ten-ghosthand.md) | 5 / 5 | [6 việc](checks.md) |
| 🟡 đang làm | [46. MCP web – tinh chỉnh](phase3/46-mcp-web-tinh-chinh.md) | 9 / 11 | [10 việc](checks.md) |
| 🟡 đang làm | [47. Hình minh hoạ động cho từng node](phase3/47-hinh-minh-hoa-node.md) | 6 / 7 | [3 việc](checks.md) |
| 🟡 đang làm | [48. Kiểm tra quyền](phase3/48-kiem-tra-quyen.md) | 5 / 5 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [49. Chỉnh giao diện theo yêu cầu 2026-10-25](phase3/49-cai-dat-overlay-lich-su.md) | 4 / 4 | [4 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [50. Góp ý khi dùng node 2026-10-25](phase3/50-gop-y-dung-node.md) | 12 / 12 | [10 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [51. Hướng dẫn sử dụng](phase3/51-huong-dan.md) | 16 / 16 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [42. Dữ liệu & luồng](phase3/42-du-lieu-luong.md) | 12 / 12 | [16 việc](checks.md) |
| 🟡 đang làm | [43. Node chuyên sâu](phase3/43-node-chuyen-sau.md) | 38 / 42 | [29 việc](checks.md) |
| 🟡 đang làm | [40. Nhận dạng chữ / ảnh tốt hơn](phase3/40-nhan-dang.md) | 11 / 12 |  |
| 🧪 chờ kiểm tra tay | [39. Gom kịch bản: nhóm node, nhúng kịch bản khác](phase3/39-gom-kich-ban.md) | 2 / 2 | [6 việc](checks.md) |
| 🧪 chờ kiểm tra tay | [24. Ghi macro](phase3/24-ghi-macro.md) | 1 / 1 | [2 việc](checks.md) |
| ⬜ chưa làm | [28. Mở rộng](phase3/28-mo-rong.md) | 0 / 3 |  |
| ⬜ chưa làm | [36. Web qua Chrome của app – làm sau](phase3/36-chrome-app-sau.md) | 0 / 5 |  |

### Phase 0 – 2

| Trạng thái | Bước | Mục con xong | Kiểm tra tay |
|---|---|---|---|
| ✅ xong | [1. Cài môi trường](phase0.md) | – |  |
| ✅ xong | [2. Khởi tạo project](phase0.md) | – |  |
| ✅ xong | [3. Spike click](phase0.md) | 3 / 3 |  |
| ✅ xong | [4. Spike hotkey toàn cục](phase0.md) | 4 / 4 |  |
| ✅ xong | [5. Spike overlay](phase0.md) | 4 / 4 |  |
| ✅ xong | [6. Định nghĩa model](phase1-mvp.md) | – |  |
| ✅ xong | [7. Engine chạy bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [8. Pause / Resume / Stop](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [9. Dừng khẩn cấp](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [10. Chọn vùng](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [11. Chọn điểm](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [12. Marker & đường nối](phase1-mvp.md) | 4 / 4 |  |
| ✅ xong | [13. Chọn điểm kéo thả](phase1-mvp.md) | 6 / 6 |  |
| ✅ xong | [13b. Dựng UI tĩnh từ bản thiết kế](phase1-mvp.md) | – |  |
| ✅ xong | [14. Danh sách bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [15. Form cấu hình bước](phase1-mvp.md) | 5 / 5 |  |
| ✅ xong | [16. Cài đặt chạy](phase1-mvp.md) | 7 / 7 |  |
| 🟡 đang làm | [17. DPI & đa màn hình](phase1-mvp.md) | 9 / 10 | [4 việc](checks.md) |
| 🟡 đang làm | [18. Build & thử máy sạch](phase1-mvp.md) | 3 / 4 |  |
| ✅ xong | [19. Ngẫu nhiên hoá](phase2.md) | 5 / 5 |  |
| ✅ xong | [19b. Xem trước kịch bản](phase2.md) | 4 / 4 |  |
| ✅ xong | [19c. Xem / sửa riêng một bước trên overlay](phase2.md) | 3 / 3 |  |
<!-- index:end -->

## Các file

| File | Nội dung |
|---|---|
| [checks.md](checks.md) | **Cần kiểm tra tay** – việc đã xong code, chờ người dùng thử trong app |
| [decisions.md](decisions.md) | Quyết định đã chốt – không cần bàn lại |
| [overview.md](overview.md) | Stack, cài môi trường máy mới |
| [log.md](log.md) | Nhật ký (mỗi dòng: ngày, kết quả kiểm tra) |
| [phase0.md](phase0.md) · [phase1-mvp.md](phase1-mvp.md) · [phase2.md](phase2.md) | Bước 1–19c (còn 17 phần Windows, 18) |
| `phase3/<số>-<tên>.md` | Mỗi bước Phase 3 một file – thứ tự ở bảng dưới |

**Quy ước:** mục con xong là tick `[x]` ngay; mục cha tick khi hết phần code; việc *Kiểm tra tay* của bước đã xong code ghi ở [checks.md](checks.md) (file bước chỉ để link). Việc mới phát sinh thêm thành mục con trong file của bước. Bước mới → file mới `phase3/<số>-<tên>.md` + một dòng trong bảng dưới.

## Phase 3 – Design v2 & tự động hoá

> Thiết kế: **`design/DESIGN.md`** (token, thành phần, icon, map artboard → file), `design/theme.css` (token Tailwind v4), artboard trên canvas https://claude.ai/artifact/5WdDyFZdB3WKxEXwkticnw. Mỗi việc UI dưới đây ghi artboard tương ứng trong ngoặc vuông.
> Số bước giữ nguyên để khớp nhật ký nên không theo thứ tự số; **làm theo thứ tự từ trên xuống**. Xong 26 là chạy được ví dụ Facebook (cuối phase).

**Thứ tự làm** (từ trên xuống, giống danh sách bên dưới):

| # | Bước | Vì sao ở vị trí này |
|---|---|---|
| 1 | [27. UI v2 cho màn đang có](phase3/27-ui-v2.md) | Người dùng muốn làm giao diện trước; nền cho mọi màn sau |
| 2 | [27b. Khung UI tính năng chưa có](phase3/27b-ui-sap-co.md) | Dựng hết UI theo design một lần cho đồng bộ; bước sau chỉ nối logic |
| 3 | [29. Neo 4 góc](phase3/29-neo-diem.md) | Sửa toạ độ lệch khi đổi vùng; đổi model `Point` nên làm trước khi có file lưu (21) |
| 4 | [21. Lưu / tải](phase3/21-luu-tai.md) | App chưa lưu được gì – tắt là mất kịch bản |
| 5 | [30. Sửa nhiều điểm](phase3/30-sua-nhieu-diem.md) | Dựa vào neo (29) + UI mới (27); có kịch bản lưu được (21) mới đáng đầu tư chỉnh sửa hàng loạt; kèm hoàn tác / làm lại |
| 6 | [21b. Input](phase3/21b-input.md) | Cần 21 (preset theo từng kịch bản); mở đường cho chuỗi web / app (23, 25) |
| 7–8 | [23](phase3/23-cuon-mo-url.md) → [25](phase3/25-cho-anh.md) | Cuộn / mở URL đơn giản, rồi chờ ảnh – cốt lõi tương tác web / app |
| 9 | [25e. Tìm theo chữ (OCR)](phase3/25e-ocr.md) | Xong 2026-10-17 – tìm ảnh chưa đủ chính xác |
| 10 | [25b. Khi thất bại](phase3/25b-khi-that-bai.md) | Xong 2026-10-17; 20 thay *bỏ qua / nhảy tới* bằng cạnh `fail`, giữ phần thử lại |
| 11 | [20. Flow kiểu n8n (F0–F5, rồi F5b–F7 sau 25d)](phase3/20-flow.md) | Người dùng cần luồng thành công / thất bại, if / else, switch (2026-10-17); đổi model lớn nên làm trước các loại bước mới (26, 25d); gồm luôn debug + lịch sử chạy (thay 25c) |
| 11b | [32. Tách Go thành package](phase3/32-go-packages.md) | Người dùng chọn (2026-10-18): làm đầu tuần sau, trước F5b – 49 file `package main` ở root không có ranh giới; MCP / API (22, 31) cần dùng lại engine không qua Wails |
| 11b2 | [33. Kịch bản mẫu để test](phase3/33-mau-thu.md) | Người dùng yêu cầu (2026-10-18): làm trước 25d D1 – có mẫu cho mỗi loại bước + sân thử cục bộ để test tay nhanh; bước mới sau này đều thêm mẫu |
| 11c | [25d. Web qua DOM](phase3/25d-web-dom.md) | Người dùng ưu tiên (2026-10-18): web phải chạy chính xác – làm ngay sau 32, chia D0–D4 (đo toạ độ trước); focus bằng CDP `Page.bringToFront` nên không chờ 26. Người dùng yêu cầu (2026-10-17): web bền hơn ảnh mẫu; cần cổng `fail` (20); làm trước MCP vì AI dùng DOM tốt hơn ảnh chụp |
| 11d | [34. Thao tác giống người](phase3/34-giong-nguoi.md) | Người dùng chọn (2026-10-18): sau 20 F5b + F5c – chuột nhảy thẳng là dấu hiệu bot rõ nhất, web (25d) cần nhất |
| 11e | [35. Node nâng cao](phase3/35-node-nang-cao.md) | Người dùng yêu cầu (2026-10-18): sau 34, trước 26 – ít node nền (chụp màn hình, clipboard, HTTP trước) + kịch bản mẫu; node mới dùng output chuẩn F5c |
| 11f | [38. UI v3 – gọn](phase3/38-ui-v3.md) | Người dùng yêu cầu (2026-10-19): làm trước 37 E3 (E3 thêm UI vào inspector – dựng luôn theo kiểu mới); màu theo nhóm node, thẻ node 168, inspector thu gọn, nút Chạy tách đôi; theme tối giữ Slate |
| 11g | [37. Phần tử màn hình qua Accessibility](phase3/37-phan-tu-man-hinh.md) | Người dùng yêu cầu (2026-10-18): sau 35, trước 20 F6 – đọc giá trị web ở Chrome thường đã đăng nhập (không CDP, tránh captcha của 36) + app khác; đã thử chạy trên macOS; phần Windows UIA làm cùng 17–18 |
| 12 | [26. Cửa sổ + Ứng dụng](phase3/26-cua-so-ung-dung.md) | Xong 26 là chạy được ví dụ Facebook. Người dùng mở rộng (2026-10-19): `focusWindow` → node Cửa sổ + node Ứng dụng – cố định app / cửa sổ (vị trí, cỡ) trước khi thao tác |
| 14 | [22. Hẹn giờ / CLI / API local](phase3/22-hen-gio-cli-api.md) | Chạy không cần ngồi canh; dựng server HTTP + token mà MCP dùng lại |
| 15–17 | [31a → 31b → 31c → 31d. MCP cho AI](phase3/31-mcp-ai.md) | Người dùng chọn làm sau (2026-10-17); các bước trước đã có mục *Chuẩn bị cho MCP* nên lúc này chủ yếu là bọc hàm Go sẵn có thành tool. 31d (AI trong flow) chỉ làm khi 31a–c dùng ổn (2026-10-18) |
| 16a | [41. Nơi lưu + xoá lịch sử](phase3/41-noi-luu-lich-su.md) | Người dùng yêu cầu (2026-10-20): làm ngay, trước 40 O0–O3 (cần máy Windows) – việc nhỏ, làm trên Mac được; thư mục lưu tự chọn, xoá lịch sử |
| 16a1 | [44. Thử trang + ưu tiên node cho AI](phase3/44-thu-trang-uu-tien-node.md) | Người dùng yêu cầu (2026-10-21): làm ngay, trước 42 – việc nhỏ dùng lại Chrome của app + `PageOutline` (25d); AI biết trang nào dùng được node web. Không đổi 36: chỉ thử trang không cần đăng nhập |
| 16a1b | [45. Đổi tên thành Ghosthand](phase3/45-doi-ten-ghosthand.md) | Người dùng yêu cầu (2026-10-21): làm ngay sau 44, trước 42 – đổi tên máy móc, càng để lâu càng nhiều chỗ; xong trước khi phát hành cho người khác |
| 16a1c | [46. MCP web – tinh chỉnh](phase3/46-mcp-web-tinh-chinh.md) | Người dùng yêu cầu (2026-10-21): góp ý khi dùng MCP thật trên GoERP – đợt A (toạ độ, read_web_outline, webType bớt chặt, ghim tab ID) làm trước 42 vì đang chặn việc dùng; đợt B/C sau |
| 16a1d | [47. Hình minh hoạ động cho node](phase3/47-hinh-minh-hoa-node.md) | Người dùng yêu cầu (2026-10-21): người mới nhìn hình hiểu node ngay, không cần đọc chữ; chưa xếp trước 42 / 43 – chờ người dùng chọn lúc làm |
| 16a1e | [48. Kiểm tra quyền trước khi chạy](phase3/48-kiem-tra-quyen.md) | Người dùng yêu cầu (2026-10-24): biết thiếu quyền trước khi chạy; chưa xếp trước 42 / 43 – chờ người dùng chọn lúc làm |
| 16a1f | [49. Cài đặt, thanh overlay, lịch sử output](phase3/49-cai-dat-overlay-lich-su.md) | Người dùng yêu cầu (2026-10-25); chưa xếp thứ tự – chờ người dùng chọn lúc làm |
| 16a1g | [50. Góp ý khi dùng node](phase3/50-gop-y-dung-node.md) | Người dùng yêu cầu (2026-10-25): sửa UI tràn + log Accessibility, nút chọn file mọi nơi, output dạng bảng, cửa sổ macOS, vẽ đường trên overlay, dán curl, chọn tiến trình – làm ngay, nhóm A → E |
| 16a1h | [51. Hướng dẫn sử dụng](phase3/51-huong-dan.md) | Người dùng yêu cầu (2026-10-25): modal hướng dẫn cho người + AI, 3 đợt H1 → H3, giữ đồng bộ bằng test + check-docs |
| 16a2 | [42. Dữ liệu & luồng](phase3/42-du-lieu-luong.md) | Người dùng yêu cầu (2026-10-20): ngay sau 41 – chờ màn hình đứng yên thay Chờ cố định, lặp qua danh sách + tìm tất cả, tính toán / xử lý chữ; làm trên Mac được |
| 16a3 | [43. Node chuyên sâu](phase3/43-node-chuyen-sau.md) | Người dùng yêu cầu (2026-10-20): sau 42, xen kẽ 40 O0–O3 (máy Windows) – trình duyệt Chromium thường không CDP, phần tử app không cần chuột, hệ điều hành, ảnh đánh số / cây giao diện cho AI trước 31c; mỗi việc một node |
| 16b | [40. Nhận dạng chữ / ảnh tốt hơn](phase3/40-nhan-dang.md) | Người dùng yêu cầu (2026-10-20): làm sau 31b, trước 31c – Windows chưa đọc được tiếng Việt (`Windows.Media.Ocr`); 31c (AI soạn bằng cách thử, ảnh mẫu) cần đọc chữ / tìm ảnh đáng tin |
| 17b | [39. Gom kịch bản](phase3/39-gom-kich-ban.md) | Người dùng yêu cầu (2026-10-19): ưu tiên vừa – sau các bước quan trọng; gom đoạn hay vào kịch bản lớn. Khung nhóm + nhúng phẳng trước (engine không đổi), group khoá để dành |
| 18–19 | [24](phase3/24-ghi-macro.md) → [28](phase3/28-mo-rong.md) | Ghi macro, mở rộng |
| 20 | [36. Web qua Chrome của app – làm sau](phase3/36-chrome-app-sau.md) | Người dùng chốt (2026-10-18): đăng nhập Google / Facebook trong Chrome của app bị captcha, chế độ điều khiển quá rủi ro cho tài khoản thật – dời mọi việc qua Chrome của app xuống cuối, tìm cách sau |
| – | [17 (Windows), 18](phase1-mvp.md) | **18a** (build exe qua GitHub Actions) làm trước – người dùng yêu cầu 2026-10-19, không cần máy Windows; phần còn lại làm trên máy Windows (có từ 2026-10-19 – [windows-dev.md](../windows-dev.md)); riêng *Kiểm tra tay macOS* của 17 làm lúc nào cũng được |
