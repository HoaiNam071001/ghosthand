# 52. MCP ít token: AI hiểu flow nhanh, viết flow đúng

- [x] **52. MCP ít token** *(người dùng yêu cầu 2026-10-27: AI nối MCP hiểu nhanh, rõ flow, tạo flow chuẩn với ít token nhất; khi làm tính năng mới thì chỉnh hướng dẫn cho AI theo)*
  - **Đo trước khi làm (byte UTF-8, tiếng Việt ~3 byte / token):** `get_step_types compact=true` 35,6 KB (mỗi node là object lặp khoá, ví dụ kịch bản dạng đủ, mẹo thử – sửa lẫn vào), `read_script` trả đủ mọi trường mặc định (89 mẫu: 291 KB thụt lề), cạnh `{id, from, port, to}` ~50 byte / cạnh, mọi kết quả tool thụt lề + `>` thành `>`.
  - [x] M1. Cạnh dạng chữ `flow: ["n1>n2>n3", "n2.fail>n5.next>n6>n2"]` (cổng sau node nguồn, không ghi = success) cho create / validate / run / update – `script/flowtext.go` (`ParseFlow`, `FlowText`), `Compact.Flow`, `Patch.Flow`; `removeEdges` nhận `"n2.fail"` (mỗi cổng một cạnh nên nguồn + cổng đủ xác định); `update_script` trả `flow` mới để AI soát
  - [x] M2. `read_script` mặc định dạng gọn – `script/shrink.go` `Shrink` (node theo FlowOrder, chỉ trường khác `NewStep`, cạnh thành flow, bỏ `pos`); `full=true` = đủ trường. Test `shrink_test.go`: Shrink → Expand dựng lại đúng **mọi Mẫu thử** (89 mẫu: 291 KB → 71 KB)
  - [x] M3. `get_step_types compact=true`: mỗi loại node một dòng `type [cổng]: khi nào dùng` theo nhóm (`nodeLines`, `portsLabel` – cổng động switch / app), mẹo thử – sửa tách ra `topic=debug`, `type=a,b,c` lấy nhiều loại một lần; ví dụ flow (`model.flowExample`) viết dạng gọn + flow. 35,6 KB → 22,9 KB
  - [x] M4. Kết quả tool + resource: JSON không thụt lề, không escape `< > &` (`script.MarshalRaw`)
  - [x] M5. `instructions` (client nạp sẵn) thành primer: cú pháp gọn + flow + biến + đường ít token nhất (compact → type=a,b,c → validate → create), sửa bằng update theo phần
  - [x] M6. Ngân sách chữ cho AI – `mcpsrv/budget_test.go` (`instructions`, `tools/list`, bản gọn, mỗi dòng node, mỗi loại node); quy ước giữ gọn ghi ở skill `add-node-type` + CLAUDE.md
  - Vá kèm: `Compact.KeepAwake` (AI trước đây không đặt được *Giữ máy thức*); `model.PortsOf` export (trước là `portsOf`)
  - Chưa làm (để sau nếu cần): gọn schema `update_script` (inputs / groups lồng ~1,5 KB trong tools/list); số tool 30 > mốc ~20 của quyết định 31 – gộp tool khi có dịp
  - Kiểm tra tay: không cần (đo bằng test); thử thật = nhờ Claude Desktop / Code tạo một kịch bản có rẽ nhánh qua MCP, xem có dùng `flow` + `type=a,b,c` không
  - Xong khi: AI đọc ≤ ~8k token (primer + bản gọn) là viết được flow có nhánh / vòng lặp; đọc / sửa kịch bản không phải nhận lại trường mặc định.
