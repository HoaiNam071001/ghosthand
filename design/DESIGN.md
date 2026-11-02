# Ghosthand – Design v3 (gọn) trên nền v2

Canvas **v3 – gọn** (2026-10-19, đã dựng – bước [38](../docs/tasks/phase3/38-ui-v3.md)): https://claude.ai/artifact/Hr4MxJYqSwCgAFuuZFNVvD – mã nguồn artboard đã xoá khỏi repo khi xong 38, xem lại bằng `git show d5a6b52:design/canvas/<tên>.dc.html` (đủ 7 artboard) hoặc mở canvas.
Design bước 60 – dữ liệu qua node (thẻ Gọn / Đầy đủ, kéo nối, Lịch sử dạng cây; duyệt 2026-11-02): https://claude.ai/artifact/GnFB6LJZXAcg4KWixJR8ne
Canvas v2 (nền token, thành phần): https://claude.ai/artifact/5WdDyFZdB3WKxEXwkticnw
Xuất ảnh / PDF: mở canvas → Share › Export.

## v3 – gọn: thay đổi so với v2

v3 giữ nguyên nguyên tắc v2 (một màu nhấn cho trạng thái, gradient 4 chỗ, font, token chung) – thêm **màu theo nhóm node** và làm bố cục chật hơn. **Theme tối giữ bảng Slate** (quyết định 2026-10-16) – canvas v3 vẽ theme tối bằng bảng trung tính cũ, chỉ lấy bố cục + màu nhóm, không lấy giá trị nền tối của canvas.

### Token mới

| Token | Sáng | Tối (Slate) | Dùng cho |
|---|---|---|---|
| `canvas` | `#EFF1F4` | `#141820` | Nền canvas flow (tối hơn `bg` một nấc để thẻ node nổi) |
| `dot` | ink 9% | trắng 7% | Chấm lưới canvas, cách 18 px |
| `panel` | `#FCFCFD` | `#1F2530` | Nền khối thu gọn trong inspector (trên `surface`) |
| `faint` | `#9AA0AA` | `#6B7689` | Icon ⓘ giải thích, chữ rất phụ |
| `cat-<nhóm>` | xem bảng dưới | | Màu chữ / icon của nhóm node |
| `cat-<nhóm>-soft` | màu nhóm 8% | 12% | Nền đầu thẻ node |
| `cat-<nhóm>-tile` | màu nhóm 16% | 24% | Ô icon trên thẻ node, đầu inspector |

### Màu theo nhóm node (7 nhóm = nhóm trong bảng thêm node)

| Nhóm | `cat-…` | Sáng | Tối | Gốc pha (soft / tile) | Loại node |
|---|---|---|---|---|---|
| Chuột | `mouse` | `#3657C8` | `#8EA8FF` | `rgb(62 99 221)` | Click, Double, Giữ, Kéo thả, Cuộn, Click theo ảnh / chữ / phần tử, Vẽ đường |
| Bàn phím | `kb` | `#0E7C71` | `#5FD3C4` | `rgb(15 138 126)` | Gõ chữ, Phím tắt |
| Chờ & ảnh | `wait` | `#6A4BC4` | `#B9A4FF` | `rgb(124 92 214)` | Chờ, Chờ ảnh / chữ / pixel / phần tử, Chờ đến giờ, Chụp màn hình |
| Hệ thống & dữ liệu | `data` | `#93580A` | `#F2B24D` | `rgb(214 140 20)` | Clipboard, HTTP, Tệp, Âm lượng, Đặt biến |
| Ứng dụng | `app` | `#4F5866` | `#B4BAC4` | `rgb(91 100 114)` | Mở URL / app, Focus cửa sổ, Đọc phần tử |
| Rẽ nhánh & luồng | `flow` | `#B0306A` | `#F28BB8` | `rgb(194 65 122)` | Nếu, Switch, Switch theo màn hình, Đếm, Kết thúc |
| Web | `web` | `#0B6F94` | `#6CCDF0` | `rgb(14 127 168)` | Mở trang (Chrome của app), Chờ / Click / Gõ / Đọc / Cuộn phần tử web |

- Màu nhóm **chỉ** ở: ô icon + nền đầu thẻ node, ô icon đầu inspector, chữ loại node trong inspector, chấm nhóm trong bảng thêm node. Trạng thái (chọn, đang chạy, lỗi) vẫn dùng `accent` / `ok` / `danger` – màu nhóm không thay màu trạng thái.
- Theo canvas v3, khác bảng thêm node hiện tại: *Đặt biến* sang *Hệ thống & dữ liệu* (đang ở Rẽ nhánh), *Đọc phần tử* sang *Ứng dụng* (đang ở Chờ), *Chụp màn hình* sang *Chờ & ảnh*; nhóm *Ứng dụng & cấu trúc* đổi tên *Ứng dụng*. Bảng thêm node và màu thẻ dùng chung một bảng nhóm.
- Theme tối: giá trị lấy từ canvas, kiểm lại độ tương phản trên `surface` Slate `#222833` (≥ 4.5:1 cho chữ) khi dựng; Chuột `#8EA8FF` gần `accent` tối `#60A5FA` – thẻ đang chọn vẫn phân biệt bằng viền `ring-selected` + bóng.

### Bố cục (màn soạn – `Main`)

- **Thanh tiêu đề** cao 36 (v2: 40): logo accent, "Ghosthand" 12 `muted`, bên phải nút sáng / tối (một nút bật tắt), nút cửa sổ 44×36.
- **Toolbar** chung nền `chrome` với thanh tiêu đề, padding 4×16×10, viền dưới `line`: tên kịch bản 18/600 (v2: 19), chip "Chưa lưu" (chấm `warn`, nền `soft`, cao 22), tab Soạn / Xem trước (gạch dưới 3 px). Phải: nút vòng lặp ("3 vòng" mono), **nút Chạy tách đôi** (xem dưới). Các nút debug / ghi macro rời toolbar → vào menu Chạy.
- **Thư viện** rộng 224 (v2: 236), nền `side`: ô tìm + nút thu gọn thư viện; nhãn nhỏ "KỊCH BẢN 4"; mục cao 34 (mục mở: `bg-hover`, vạch trái accent, chấm `warn`; giờ hẹn mono bên phải); "Mở gần đây" / "Lịch sử chạy" dạng hàng thu gọn (▸ + số / chấm kết quả `ok` / `danger`); chân: "+ Mới" + 3 nút icon 34 (Mẫu thử, Mở, Lưu).
- **Canvas flow** nền `canvas` + lưới `dot`. Góc trái trên: "Flow · 10 node"; phải: "Toàn màn hình", "+ Thêm node Ctrl+K". Góc trái dưới: nhóm + / − / vừa khung + nút "?" (tooltip phím tắt canvas, thay dòng gợi ý v2). Góc phải dưới: minimap 148×92, node đang chọn tô `accent`.
- **Inspector** rộng 340, padding 14, các khối cách 12.
- **Status bar** padding 5×16, chữ 12: chấm trạng thái, toạ độ chuột mono, "Bản nháp tự lưu 14:32", phải "Dừng khẩn cấp: F8 / góc màn hình".

### Thẻ node (v3)

- Rộng **168** (v2: 248), bo 10, `bg-surface border-line`, bóng rất nhẹ (tối: không bóng).
- **Đầu thẻ** cao 32, nền `cat-…-soft`, bo trên 9: ô icon 20×20 bo 6 nền `cat-…-tile`, icon 12 nét 2.1 màu `cat-…`; tên 12.5/600 cắt `…`; mã node mono 10.5 `muted` bên phải.
- **Dòng chi tiết** mono 11 `muted`, padding 5×10×7, một dòng cắt `…`.
- **Cổng ra:** node một lối ra (Thành công / Thất bại) **không có dòng nhãn** – 2 chấm trên mép phải: chấm `ok` 8 px ngang đầu thẻ (top 12), chấm `danger` 7 px sát đáy. Node nhiều lối ra (Nếu, Switch, Đếm): mỗi cổng một dòng 18, nhãn 11 `muted` căn phải + chấm 8 viền `line-strong`; thêm đệm dưới 6. Node Kết thúc: không có chấm ra. Cổng vào: chấm 8 nền `surface` viền `line-strong` ở mép trái, top 12.
- **Phần v2 đưa vào tooltip** (người dùng chốt 2026-10-19): "→ dừng" / "→ hết" của cổng chưa nối, chip phụ ("1 input", "thử lại 2") – hiện khi rê chuột vào chấm / thẻ; inspector vẫn ghi đủ.
- **Nhảy về node khác** (cạnh quay lại xa): nhãn nhỏ mono "→ n2" ngoài mép phải thẻ, nền `surface` viền `line`, thay vì vẽ cạnh dài.
- Đang chọn: `ring-selected` (1.5 px) + bóng accent 16% (tối 25%). Bắt đầu: nhãn "▸ Bắt đầu" `accent-soft` ngay trên thẻ (như v2). Huy hiệu chạy / cảnh báo, outline đang chạy / lỗi: giữ như v2.
- Cạnh: nét 1.6 `line-strong`, cong; khoảng cách giữa cột node ~200 (thẻ 168 + 32), giữa hàng ~100.

### Inspector (v3 – `Main`, `Inspectors`)

- **Đầu:** ô icon 36 bo 9 nền `cat-…-tile` màu `cat-…`; tên 15/600; dưới tên: mã node mono trên `soft` + **loại node là nút ▾ màu `cat-…`** (đổi loại); phải: nút ⓘ mô tả loại node (tooltip – thay thẻ mô tả N0 to), nút Xem trên màn hình, công tắc bật 34×18.
- **Tab** Node / Input (chip số `accent-soft`), viền dưới `line`.
- **Khối thu gọn (accordion):** mỗi nhóm một khung `border-line` bo 10 nền `panel`; đầu khối cao 38 (▾ / ▸ + tên 600 + **tóm tắt bên phải** `muted` 12 khi thu gọn: "chờ 500 ms, cố định", "thử lại 2 lần · nghỉ 500 ms", "ok → n4 · lỗi → dừng", "4 biến"). Mặc định mở *Thiết lập*, các khối khác thu gọn. Thứ tự: Thiết lập → Thời gian → Khi thất bại → Cổng ra → Output → (Lần chạy gần nhất khi có).
- **Hàng trường:** xem *Ô nhập (`FieldKit`, `ClickDetail`)* ngay dưới – thay quy cách 104 / 30 ban đầu.
- **Giải thích:** icon ⓘ 13 `faint` cạnh nhãn (đang mở: `accent-text`), bấm / rê mở tooltip đen (`ink` nền, chữ `bg`) rộng 230, mũi tên 10 – thay chữ giải thích dài dưới ô.
- **Case Switch:** mỗi case một thẻ (⋮⋮ kéo, chấm màu case, tên + điều kiện `muted`), case đang sửa viền accent 45% nền accent 5%; "+ Thêm case" nét đứt.
- **Cổng ra:** mỗi cổng một hàng: chấm màu + tên, bên phải ô chọn đích (mã node mono + tên + ▾); ghi chú "hoặc kéo trên canvas".
- **Output:** chip `var-token` `n7.output.status`, bấm để chép (tooltip mô tả).
- **Chân:** hàng nút chữ không viền: "Đặt làm bắt đầu", "○ Điểm dừng", phải "Xoá node" `danger-text`; viền trên `line`.

### Ô nhập (`FieldKit`, `ClickDetail` – thêm 2026-10-19)

Một kiểu ô cho mọi trường của inspector; các nút phụ (biến, ghim input, về mặc định) gom vào **menu ⋯ trong ô** thay vì nút {x} / ghim nằm ngoài ô (v2 – làm ô số hẹp, cắt chữ).

- **Hàng:** lưới `112px 1fr` (code dùng **120 px** – nhãn có ⓘ không gãy dòng), gap 10, nhãn `muted` bên trái (rê hàng: nhãn `ink`). Ô cao **34**, bo 7, nền `field`, viền `line`; số mono 13, đơn vị `muted` 12 sát phải trong ô.
- **Rê chuột:** viền `line-strong`, hiện nút **⋯** 26×26 (nền `soft`) ở mép phải trong ô. Mở menu: viền ô `accent`, nút ⋯ nền `accent-soft` chữ `accent-text`.
- **Menu ⋯** (rộng 226, bo 9, mục cao 36, icon 15 `muted`): *Dùng biến…* · *Đặt làm input khi chạy* · *Về mặc định (120 ms)* · *Ô này dùng để làm gì* (chữ `muted`, mở giải thích). Mục nào không áp dụng thì không hiện.
- **Đang dùng biến:** trong ô chỉ còn chip `var-token` (`{{vars.clickGap}}`, cắt `…`) + nút ✕ 24 "Bỏ biến" bên phải.
- **Đã ghim làm input:** dưới nhãn có chip key (icon ghim + `gap`, mono 11, `accent-soft`, bo tròn); ô viền **nét đứt** `accent`, sau giá trị chữ nhỏ "mặc định" `muted`.
- **Lỗi:** viền `danger` + icon ⓘ đỏ trong ô; lý do trong tooltip (không thêm dòng chữ dưới ô).
- **Số nguyên nhỏ** (Số click, số lần thử…): ô có nút **− / +** 34×34 hai đầu, số giữa căn giữa.
- **Cặp X / Y** (vị trí): nhãn ở **trên** (kèm ⓘ, phải ghi neo "neo trên-trái" `muted` 12), dưới là 2 ô X / Y chia đều + nút chọn trên màn hình 34 + nút ⋯ (Số / Biến, neo…). **Sơ đồ màn hình thu gọn** thành một hàng nút "Sơ đồ màn hình · cách trái 812, trên 436"; mở ra: khung `soft` có sơ đồ, chọn neo 4 góc (↖ ↗ ↙ ↘), px / %.
- **Chữ có biến:** ô **tự cao** theo nội dung (min 34, line-height 1.85), biến là chip `var-token` trong dòng.
- **Giải thích:** ⓘ `faint` cạnh nhãn, rê / focus hiện tooltip (fixed, không bị inspector cắt) – thay dòng chữ dài dưới ô; **lỗi / thiếu dữ liệu vẫn hiện chữ đỏ dưới ô** (không giấu vào ⓘ). Công tắc: hàng nhãn trái + công tắc (`SwitchField`). Nút chọn 2–3 mục dài, ô chữ dài: nhãn trên.
- **Dropdown:** cùng khung ô 34, chữ cắt `…`, mũi tên ▾ 12 `muted` bên phải.
- Theme tối: canvas vẽ bằng bảng trung tính cũ – dùng token Slate tương ứng (`field`, `line`, `line-strong`, `accent-soft`…).

### Nút Chạy + menu (`RunMenu`)

- Nút tách đôi `btn-primary`: trái "▶ Chạy F8" (F8 mono 11 mờ 80%), phải nút ▾ 30×34 (viền trái trắng 30%, `aria-label="Cách chạy khác"`).
- Menu (rộng 280, bo 10, `surface`, bóng 12/32): Chạy từ node đang chọn · Chạy từng node `F10` · Xem trước trên màn hình · Ghi thao tác `F9` (icon `danger-text`); gạch ngăn; "Sửa input trước khi chạy `Shift+F8`" chữ nhỏ `muted`. Mục cao 40, icon 15 `muted`, phím tắt mono 11 bên phải. Đang chạy: nút trái thành Dừng `btn-danger-soft` như v2.

## Nguyên tắc

- **Nhẹ, ít màu.** Nền và bề mặt là màu đặc cố định, trung tính. Chỉ một màu nhấn (`accent`).
- **Màu nhấn chỉ cho trạng thái:** bước đang chọn, nhãn "Mới", công tắc bật, gạch chân tab, nút chính.
- **Gradient chỉ ở 4 chỗ:** nút chính, viền mục đang chọn, viền ô nhập đang focus, vòng tiến độ. Gradient luôn là một màu nhạt dần (accent → accent trong suốt), không phối nhiều màu.
- **Opacity thay vì màu mới:** chip, nền icon, nút Dừng dùng màu pha độ trong suốt thấp.
- **Số, toạ độ, thời gian** dùng font mono.
- Bố cục và nút cửa sổ kiểu Windows 11 (thu nhỏ / phóng to / đóng bên phải).

## Token màu

> **Theme tối đã đổi sang bảng "Slate"** (`design/newdarkmode.md`, 2026-10-16) – cột *Tối* dưới đây là bản cũ; giá trị đang dùng nằm trong `theme.css` / `frontend/src/style.css`. Thêm token `on-accent` (chữ trên nền accent: trắng ở theme sáng, `#0B1B33` ở theme tối).

Khai báo trong `theme.css`. Class Tailwind: `bg-surface`, `text-muted`, `border-line`, `bg-accent-soft`…

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `bg` | `#F6F7F9` | `#141518` | Nền vùng nội dung |
| `chrome` | `#FBFBFC` | `#18191C` | Thanh tiêu đề, toolbar, status bar |
| `side` | `#F3F4F7` | `#18191C` | Thanh bên thư viện |
| `surface` | `#FFFFFF` | `#1E1F23` | Thẻ bước, inspector, popup, thanh mini |
| `raised` | `#FFFFFF` | `#2A2C31` | Lựa chọn đang bật trong segmented |
| `field` | `#FFFFFF` | `#17181B` | Ô nhập, select |
| `soft` | ink 4.5% | trắng 5% | Chip thời gian, nền ô icon, nền segmented |
| `hover` | ink 5% | trắng 6% | Mục đang chọn ở thanh bên, hover |
| `group` | ink 1.5% | trắng 2% | Nền khung nhóm bước |
| `line` | `#E6E8EC` | trắng 8% | Viền thường |
| `line-strong` | `#D3D6DC` | trắng 16% | Viền nét đứt (nhóm, nút "+ Thêm bước") |
| `ink` | `#16181D` | `#ECEDF0` | Chữ chính |
| `muted` | `#636A76` | `#A0A5B0` | Chữ phụ, icon, nhãn |
| `accent` | `#4F6BED` | `#4F6BED` | Màu nhấn (đổi được) |
| `accent-soft` | accent 10% | accent 16% | Nền nhãn "Mới", ô icon bước đang chọn |
| `accent-text` | `#3B55CF` | `#B4C1FF` | Chữ trên `accent-soft` |
| `warn` | `#C8893A` | `#D9A35B` | Chấm "Chưa lưu" |
| `ok` | `#3E9B5C` | `#5DBB7A` | Chấm "Sẵn sàng" |
| `danger` / `danger-text` / `danger-soft` | `#D6343A` / `#B4252B` / 8% | — / `#FF9A9D` / 14% | Nút Dừng |
| `hud`, `hud-text`, `hud-line`, `dim` | luôn tối | | Thanh công cụ overlay, lớp phủ mờ |

Màu nhấn thay thế đã thử trên canvas: `#2F8F83` (xanh ngọc), `#8B6CE0` (tím nhạt), `#5B6472` (xám, gần đơn sắc).

## Chữ

- **Sans:** Segoe UI Variable (Windows) → Plus Jakarta Sans (cài `@fontsource/plus-jakarta-sans` để chạy offline, có tiếng Việt).
- **Mono:** Cascadia Mono (Windows) → JetBrains Mono (`@fontsource/jetbrains-mono`).
- Cỡ: tên kịch bản 19/600, tiêu đề vùng 16/600, tên bước 14/600, chữ thường 14/400, phụ 12–13, mono 12–13.

## Bo góc & khoảng cách

- Nút, ô nhập: 6–7 px. Thẻ bước: 9 px. Khung nhóm: 11 px. Popup: 12 px. Thanh mini: 14 px.
- Thẻ bước: padding 9×12, cách nhau 6 px, ô icon 32×32 bo 8.
- Thanh bên rộng 236, inspector 320–360, nội dung giữa co giãn.

## Gradient (4 chỗ duy nhất)

| Chỗ | Utility | Mô tả |
|---|---|---|
| Nút chính (Chạy, Dùng ảnh này, Xong) | `btn-primary` | Dọc: accent 82% → accent, viền accent 90%, viền sáng trên 25%, bóng accent 22% |
| Mục đang chọn | `ring-selected` | Viền 1px chéo 135°: accent → accent 25% |
| Ô nhập đang focus | `ring-focus` | Viền 1px ngang: accent → accent 20% |
| Vòng tiến độ thanh mini | SVG | `<linearGradient>` accent → accent 35%, nét 3.5, đầu tròn |

```html
<svg width="50" height="50" viewBox="0 0 50 50">
  <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="var(--c-accent)"/><stop offset="1" stop-color="var(--c-accent)" stop-opacity=".35"/>
  </linearGradient></defs>
  <circle cx="25" cy="25" r="22" fill="none" stroke="var(--c-soft)" stroke-width="3.5"/>
  <circle cx="25" cy="25" r="22" fill="none" stroke="url(#ring)" stroke-width="3.5" stroke-linecap="round"
          stroke-dasharray="{progress * 138.2} 138.2" transform="rotate(-90 25 25)"/>
</svg>
```

## Thành phần

- **Thẻ bước:** `bg-surface border border-line rounded-card`. Ô icon `bg-soft text-muted`; khi chọn: `ring-selected`, ô icon `bg-accent-soft text-accent-text`. Phải: chip thời gian `bg-soft text-muted font-mono`. Bước tắt: `opacity-50`.
- **Khung nhóm:** `border border-dashed border-line-strong bg-group rounded-group p-2`; đầu khung: icon, tên nhóm, chip `lặp ×N`.
- **Nhãn "Mới" / trạng thái:** `bg-accent-soft text-accent-text rounded-full text-[11px] font-semibold`.
- **Tab Soạn / Xem trước:** chữ, mục đang chọn có gạch dưới 3px `bg-accent` rộng 50%.
- **Thanh bên:** mục đang chọn `bg-hover` + vạch trái 3×16 `bg-accent`.
- **Segmented (Khi hết giờ):** nền `bg-soft`, lựa chọn bật `bg-raised shadow-[var(--c-raise)]`.
- **Công tắc:** 40×20, bật `bg-accent`, núm trắng 14px.
- **Nút phụ:** `bg-surface border border-line rounded-control`.
- **Overlay:** lớp phủ `bg-dim`, khung chọn nét đứt trắng, 4 núm vuông viền accent, nhãn kích thước nền accent. Thanh công cụ dưới cùng `bg-hud text-hud-text border border-hud-line rounded-xl`, công cụ đang bật nền trắng 14%.
- **Thanh mini:** `bg-surface border border-line rounded-hud`, vòng tiến độ, 2 dòng mono (`whitespace-pre`), nút tạm dừng phụ, nút Dừng `btn-danger-soft`.

## Input của kịch bản

- **Tab Bước / Input (N)** ở đầu inspector; số N là chip `accent-soft`.
- **Nút ghim** cạnh mỗi trường số / chữ: 32×32, viền `line`, icon `muted`; đã ghim: nền `accent-soft`, icon `accent-text`, viền accent 45%. Trường đã ghim: `field-pinned` + chip key (`var-token` có icon ghim) cạnh nhãn.
- **Biến trong ô chữ:** `{{M1}}` hiển thị bằng `var-token`. Gõ `{{` mở popup gợi ý (nền `surface`, viền `line`, bóng nhẹ): key mono `accent-text` + nhãn `muted`, mục đang chọn `bg-hover`, cuối danh sách "+ Tạo input mới…". Dòng phụ dưới ô: "N biến, tự thêm vào tab Input".
- **Thẻ bước** có input: chip viền `line` "1 input" / "2 input".
- **Tab Input:** mỗi input một dòng (⋮⋮ kéo, nhãn + `*` nếu bắt buộc, `key · mặc định` mono, chip kiểu `bg-soft`, chip bước dùng viền `line`). Input đang sửa mở rộng với `ring-selected`: nhãn, kiểu, mặc định, bắt buộc (công tắc), gợi ý. Cuối: "+ Thêm input", ghi chú giá trị lần trước lưu trên máy.
- **Form Chạy kịch bản** (popup 560, bo 12):
  - Đầu: icon Chạy `accent-soft`, tên kịch bản + số input, nút đóng.
  - Hàng "Bộ giá trị": select preset + "Lưu bộ mới".
  - Thân: nhóm theo bước (nhãn nhỏ `muted` có số bước mono), ô cao 34. Ô đã khác mặc định dùng `ring-focus` + dòng "đã đổi, mặc định …" màu `accent-text` + "khôi phục". Bắt buộc: `*` màu `warn`. Key mono nhỏ cạnh nhãn.
  - Khung "Sẽ gõ" `bg-soft` xem trước câu sau khi thay biến, phần thay thế đậm `accent-text`.
  - Chân `chrome`: ô tick "Lần sau chạy luôn với giá trị này", "Đếm ngược 3 giây", nút Huỷ (phụ) và Chạy (`btn-primary`, F8).

## Icon bước (SVG 24×24, nét 1.8, đầu tròn)

| Loại | path `d` |
|---|---|
| click | `M5 3l13 7-6 1.5L9 18z` |
| double | `M5 3l13 7-6 1.5L9 18zM15 3l2-2M19 6l2-1` |
| hold | `M5 3l13 7-6 1.5L9 18zM17 15a3 3 0 1 0 0 .01` |
| drag | `M5 19a2 2 0 1 0 0-.01M7 17L18 6M13 6h5v5` |
| scroll | `M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4` |
| type | `M4 7V5h12v2M10 5v14M7 19h6M15 13h5M17.5 13v6` |
| key | `M5 9h14v10H5zM8 13h1M11 13h1M14 13h2M8 16h8` |
| wait | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2` |
| waitImage | `M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0` |
| clickImage | `M4 8V5h3M17 5h3v3M7 19H4v-3M10 9l9 5-4 1-2 4z` |
| waitPixel | `M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7z` |
| open | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18` |
| focusWindow | `M4 5h16v14H4zM4 9h16` |
| group | `M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z` |
| ghim input | `M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6` |
| if (Nếu) | `M12 3l9 9-9 9-9-9zM12 8v5M12 16v.01` |
| switch (theo giá trị) | `M3 12h5M8 12c3 0 3-6 7-6h6M8 12h13M8 12c3 0 3 6 7 6h6` |
| switchScreen | `M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 12h3M11 12c2 0 2-3 5-3M11 12c2 0 2 3 5 3` |
| counter (Đếm) | `M9 4L7 20M17 4l-2 16M4 9h16M3 15h16` |
| end (Kết thúc) | `M5 21V4M5 4h12l-2.5 4L17 12H5` |
| setVar (Đặt biến) | `M8 4c-2 0-3 1-3 3v2.5C5 11 4 12 3 12c1 0 2 1 2 2.5V17c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2.5c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5V17c0 2-1 3-3 3` |

## Canvas flow (bước 20)

Soạn kịch bản dạng node + cạnh kiểu n8n (`@xyflow/react`). Xem mẫu: màn `#demo-flow` (`?mode=running` / `?mode=failed` mở thẳng trạng thái chạy). Không thêm token mới – dùng token sẵn có.

- **Nền canvas:** `bg`, lưới chấm `line-strong` cách 18 px. Góc trái dưới: hộp nút `bg-surface border-line rounded-control` (phóng to, thu nhỏ, vừa màn hình, sắp xếp lại). Góc phải dưới: minimap `bg-surface border-line` bo 9, node `soft`. Góc trái trên: một dòng gợi ý thao tác `muted` 12.
- **Vừa màn hình tự động** (sau khi mở / xếp lại): flow vừa khít nếu zoom ≥ 65%; rộng hơn thì giữ 65% và đặt mép trái flow sát cạnh trái. Nút "Vừa màn hình" mới thu toàn bộ (tối thiểu 30%).
- **Thẻ node:** rộng 248, `bg-surface border-line rounded-card`, bóng rất nhẹ. Phần đầu cao 56: ô icon 32 (như thẻ bước), mã node mono 11 `muted` (`n2`), tên 14/600, dòng chi tiết mono 12 `muted`. Đang chọn: `ring-selected` + ô icon `accent-soft`. Tắt: nội dung `opacity-50` + chip "Tắt".
- **Cổng ra:** vùng dưới phần đầu, viền trên `line`, mỗi cổng một dòng cao 24, nhãn 12 căn phải + chấm 10 px nằm trên mép phải thẻ (nền `surface`, viền 2 px): thành công `ok`, thất bại `danger` (nhãn `danger-text`), nhánh khác (đúng / sai, case, còn lượt / hết lượt) `muted`. Cổng chưa nối ghi thêm "→ dừng" (thất bại) / "→ hết" (cổng khác), mono 11 mờ. Chip phụ ("1 input", "thử lại 2") nằm bên trái dòng cổng đầu. Cổng vào: chấm viền `line-strong` ở mép trái, ngang giữa phần đầu. Rê / đang nối: viền `accent`, nền `accent-soft`.
- **Node bắt đầu:** nhãn "▶ Bắt đầu" `bg-accent-soft text-accent-text` 11/600 bo tròn, nằm ngay trên góc trái thẻ.
- **Huy hiệu góc phải trên** (tròn 20, nền `surface`, viền màu): cảnh báo `warn` "!" (node không đi tới được, thiếu dữ liệu – tooltip ghi lý do); khi chạy: đang chạy vòng xoay `accent`, xong ✓ `ok`, lỗi ✗ `danger`, bỏ qua "–" `line`; đi qua nhiều lần thêm "×N" mono. Node đang chạy / lỗi có thêm `outline` 2 px cách 2 px màu `accent` / `danger`.
- **Cạnh:** cong (bezier) khi đi tới, gấp khúc bo 14 khi quay lại (vòng lặp); nét 1.6 `line-strong`, mũi tên kín 14. Từ cổng thất bại: nét đứt 5/4, `danger` 60%. Không ghi nhãn trên cạnh (tên cổng đã có trên thẻ). Chọn cạnh: `accent` 2.2 + nút × tròn 20 ở giữa. Lần chạy: cạnh đã đi `accent` 2.2, cạnh đang đi nét đứt chạy.
- **Bảng thêm node:** dùng lại bảng Ctrl+K (`PaletteView`), thêm nhóm *Rẽ nhánh & luồng*; mở khi kéo cổng ra thả ở chỗ trống (dòng đầu "Nối từ n2 · Thất bại", node mới đặt ở chỗ thả, cổng đã có cạnh thì chèn vào giữa) hoặc nút "+ Thêm node" / Ctrl+K.
- **Inspector node:** đầu (icon `accent-soft`, tên sửa tại chỗ, mã node ô mono `bg-soft`, loại node, nhãn "Bắt đầu", công tắc bật), tab Node / Input. Tab Node lần lượt: nội dung theo loại → *Khi thất bại* (thử lại N lần, nghỉ ms) → *Cổng ra* (mỗi cổng: chấm màu + nhãn, ô chọn node đích có mục "— Không nối: dừng kịch bản, báo lỗi" / "kết thúc kịch bản", nút → nhảy tới node) → *Output* (mỗi giá trị một `var-token` `n2.output.x` + mô tả, bấm để chép) → *Lần chạy gần nhất* (chip status, giờ / ms / số lần thử / cổng đã đi mono, lỗi `bg-danger-soft`, output JSON `bg-soft`, log) → chờ sau bước + điểm dừng → nút "Đặt làm bắt đầu" / "Xoá node". Mục cách nhau bằng viền trên `line`.
- **Bảng Nhật ký** (dưới canvas khi chạy / xem lại, cao 220, thu gọn được): đầu "Nhật ký · lần chạy 14:32:05 · vòng 1 / 3" + tóm tắt bên phải (`accent-text` đang chạy, `ok` xong, `danger-text` lỗi). Mỗi dòng: giờ mono, mã node, icon + tên, chip status (Thành công `ok` / Thất bại `danger` / Bỏ qua / Đang chạy `accent`), ms, "→ cổng · node kế" mono. Bấm dòng → chọn node + khung chi tiết bên phải (lỗi, output, log).

## Màn hình trên canvas → file trong repo

**v3 (bước 38 – đã dựng):**

| Artboard | Nội dung | File trong repo |
|---|---|---|
| `Main` / `MainDark` | Màn soạn gọn: thanh tiêu đề + toolbar, thư viện 224, canvas flow, inspector accordion | `components/TitleBar.tsx`, `AppChrome.tsx`, `Library.tsx` + `library/LibraryParts.tsx`, `StepForm.tsx`, `stepform/*`, `components/flow/*` (`FlowHeader`) |
| `Inspectors` | Inspector Click, Switch theo màn hình, HTTP | `stepform/MouseFields.tsx`, `flow/nodes/ControlFields`, `stepform/HttpFields.tsx`, `flow/PortField.tsx` |
| `Categories` | Màu 7 nhóm node, thẻ mẫu sáng / tối | token `cat-*` trong `style.css`; nhóm của node trong `flow/view.ts` |
| `FieldKit` / `ClickDetail` | Ô nhập trong inspector: các trạng thái; node Click dùng ô mới | `stepform/shared` (`Field`, `NumField`), `NumInput`, `inputs/PinButton`, `VarTextInput`, `stepform/MouseFields`, `PointSource` |
| `RunMenu` | Nút Chạy tách đôi + menu | `RunMenu.tsx` (`RunButton`), `AppChrome.tsx` (`Toolbar`) |

**v2 (đã dựng, mã artboard đã xoá):**

| Artboard | Nội dung | File trong repo |
|---|---|---|
| `Main` / `MainDark` | Soạn kịch bản: thư viện, danh sách bước + nhóm, inspector "Chờ ảnh" | `screens/MainScreen.tsx`, `components/StepList.tsx`, `StepForm.tsx`, `RunSettings.tsx`; thêm `components/Library.tsx` |
| `AddStep` / `AddStepDark` | Bảng thêm bước (Ctrl+K) | Thay menu "+ Thêm bước" trong `StepList.tsx` bằng `components/AddStepPalette.tsx` |
| `Overlay` | Chế độ chụp ảnh mẫu | `screens/OverlayScreen.tsx`, thêm tool `capture` |
| `MiniBar` / `MiniBarDark` | Đang chạy, đang chờ ảnh | `screens/MiniBar.tsx` |
| `StepInputs` | Bước gõ chữ: biến `{{…}}`, gợi ý, nút ghim | `components/StepForm.tsx`; thêm `components/VarTextInput.tsx`, `components/PinButton.tsx` |
| `InputsTab` | Tab Input của kịch bản | thêm `components/InputsPanel.tsx` |
| `RunDialog` / `RunDialogDark` | Form Chạy kịch bản | thêm `components/RunDialog.tsx`; nút Chạy / F8 mở form khi kịch bản có input |
| *(chưa có artboard)* Canvas flow | Soạn flow node + cạnh, nhật ký chạy | `components/flow/FlowEditor.tsx` (màn chính), `components/flow/*` (`FlowCanvas`, `NodeCard`, `FlowEdge`, `PortField`, `RunLog`, `nodes/ControlFields`), mẫu `screens/DemoFlow.tsx` (`#demo-flow`) |

## Đổi tên token từ bản cũ

| Cũ | Mới |
|---|---|
| `ground` | `bg` |
| `ink`, `muted`, `line`, `accent`, `accent-soft`, `danger`, `ok` | giữ tên (giá trị mới) |
| `accent-strong` | `accent-text` |
| `accent-light`, `drag`, `drag-light`, `drag-marker` | bỏ; kéo thả dùng chung icon/màu trung tính, marker overlay dùng `accent` |
| `dark-*` | bỏ; dùng token chung + `data-theme="dark"` (MiniBar, PreviewScreen) |

Mã nguồn artboard v2 đã xoá khỏi repo ngày 2026-10-18 (UI v2 đã dựng xong); xem lại: `git show f5d2dce:design/canvas/<tên>.dc.html` hoặc mở canvas. Mã artboard v3 đã xoá khi xong bước 38 (xem dòng đầu file).
