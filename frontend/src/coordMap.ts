import { Point, Rect } from './types';

// Ánh xạ toạ độ trong cửa sổ overlay (CSS px) ↔ toạ độ robotgo (toạ độ dùng để click), mỗi trục:
//   màn hình = k · cửa sổ + b
// Overlay phủ đúng một màn hình nên lấy thẳng từ khung màn đó (setDisplay): b = góc màn, k = số px thật / 1 px CSS
// (Windows scale ≠ 100 %: robotgo tính pixel thật; macOS: robotgo tính point = CSS px). Không ước lượng lại khi rê
// chuột – trước đây hồi quy k, b từ mẫu chuột làm mọi hình (vùng, marker, nền xem trước) nhích theo từng lần dừng chuột.
// Mẫu (vị trí trong cửa sổ, MousePos) chỉ để sửa b khi cửa sổ không nằm đúng góc màn (Windows: taskbar trên / trái,
// macOS: hệ điều hành không cho phủ thanh menu) – chỉ đổi khi hai mẫu liền nhau cùng lệch hẳn khỏi b hiện tại.
export type Mapping = { kx: number; bx: number; ky: number; by: number };

const KEEP = 5; // số mẫu giữ lại để lấy trung vị

let mapping: Mapping = { kx: 1, bx: 0, ky: 1, by: 0 };
let display: Rect | null = null;
let offsets: Point[] = []; // b đo từ từng mẫu
const fixes = new Map<string, Point>(); // độ lệch cửa sổ so với góc màn đã đo – mở lại overlay ở màn đó không phải đo lại

const keyOf = (d: Rect) => `${d.x},${d.y},${d.w},${d.h}`;

export const currentMapping = () => mapping;

// Gọi khi biết overlay đang phủ màn d (mở overlay / đổi màn). scale: px thật / CSS px.
export function setDisplay(d: Rect, scale: number): Mapping {
  const fix = fixes.get(keyOf(d)) ?? { x: 0, y: 0 };
  display = d;
  offsets = [];
  mapping = { kx: scale, bx: d.x + fix.x, ky: scale, by: d.y + fix.y };
  return mapping;
}

const median = (vs: number[]) => {
  const s = [...vs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// c: vị trí trong cửa sổ, s: MousePos lúc chuột đứng yên. Trả mapping (cùng object nếu không đổi – không vẽ lại).
export function addSample(c: Point, s: Point): Mapping {
  offsets = [...offsets.slice(-(KEEP - 1)), { x: s.x - mapping.kx * c.x, y: s.y - mapping.ky * c.y }];
  if (offsets.length < 2) return mapping;
  const [a, b] = offsets.slice(-2);
  const noise = Math.max(mapping.kx, mapping.ky) + 0.5; // làm tròn clientX / MousePos lệch tối đa ~k px
  if (Math.abs(a.x - b.x) > noise || Math.abs(a.y - b.y) > noise) return mapping; // một mẫu lấy lúc chuột còn trôi
  const bx = Math.round(median(offsets.map((o) => o.x)));
  const by = Math.round(median(offsets.map((o) => o.y)));
  if (Math.abs(bx - mapping.bx) <= noise && Math.abs(by - mapping.by) <= noise) return mapping;
  mapping = { ...mapping, bx, by };
  if (display) fixes.set(keyOf(display), { x: bx - display.x, y: by - display.y });
  return mapping;
}

export const toScreenPt = (m: Mapping, p: Point): Point => ({
  x: Math.round(m.kx * p.x + m.bx),
  y: Math.round(m.ky * p.y + m.by),
});

export const toClientPt = (m: Mapping, p: Point): Point => ({
  x: (p.x - m.bx) / m.kx,
  y: (p.y - m.by) / m.ky,
});
