// Neo điểm theo cạnh vùng (bước 29) – phải khớp internal/script/anchor.go.
// Mỗi trục neo riêng: start = cách cạnh trái / trên, end = cách cạnh phải / dưới (lưu số dương, hiện dấu −),
// center = lệch so với giữa (có dấu), ratio = theo tỷ lệ cạnh, đơn vị 1/10000 (5000 = 50%).
import { tr } from './i18n/lang';
import type { Anchor, Point, Rect, StepPoint } from './types';

export const RATIO_SCALE = 10000;

const axisOf = (a: Anchor | undefined): Anchor => a ?? 'start';

function resolveAxis(v: number, a: Anchor | undefined, origin: number, size: number) {
  switch (axisOf(a)) {
    case 'end': return origin + size - v;
    case 'center': return origin + Math.trunc(size / 2) + v; // Go: size/2 chia nguyên
    case 'ratio': return origin + Math.round((size * v) / RATIO_SCALE);
    default: return origin + v;
  }
}

// Ngược với resolveAxis: toạ độ màn hình s → giá trị lưu theo neo a.
function unresolveAxis(s: number, a: Anchor | undefined, origin: number, size: number) {
  switch (axisOf(a)) {
    case 'end': return origin + size - s;
    case 'center': return s - origin - Math.trunc(size / 2);
    case 'ratio': return size > 0 ? Math.round(((s - origin) * RATIO_SCALE) / size) : 0;
    default: return s - origin;
  }
}

// Điểm đã lưu (neo theo khung b) → toạ độ màn hình thật.
export const resolvePoint = (p: StepPoint, b: Rect): Point => ({
  x: resolveAxis(p.x, p.ax, b.x, b.w),
  y: resolveAxis(p.y, p.ay, b.y, b.h),
});

// Toạ độ màn hình → điểm lưu với neo cho trước (giữ nguyên chỗ trên màn hình khi đổi neo).
export const anchorPoint = (s: Point, b: Rect, ax: Anchor | undefined, ay: Anchor | undefined): StepPoint => ({
  x: unresolveAxis(s.x, ax, b.x, b.w),
  y: unresolveAxis(s.y, ay, b.y, b.h),
  ...(ax && ax !== 'start' ? { ax } : {}),
  ...(ay && ay !== 'start' ? { ay } : {}),
});

// Neo theo góc gần nhất của từng trục (mặc định khi đặt điểm mới).
export const nearestAnchor = (s: Point, b: Rect) =>
  anchorPoint(s, b, s.x - b.x > b.w / 2 ? 'end' : 'start', s.y - b.y > b.h / 2 ? 'end' : 'start');

export const insideBounds = (s: Point, b: Rect) => s.x >= b.x && s.x <= b.x + b.w && s.y >= b.y && s.y <= b.y + b.h;

// Hiện một trục: start +300, end −300, center giữa+20, ratio 25%.
const pct = (v: number) => `${Number((v / 100).toFixed(2))}%`;
export function fmtAxis(v: number, a: Anchor | undefined) {
  switch (axisOf(a)) {
    case 'end': return `−${v}`;
    case 'center': return `${tr('an.mid')}${v >= 0 ? '+' : '−'}${Math.abs(v)}`;
    case 'ratio': return pct(v);
    default: return `+${v}`;
  }
}

// Điểm lấy toạ độ từ biến (xVar / yVar, F5b) – không có chỗ cố định trên màn hình (overlay, xem trước bỏ qua).
export const usesVar = (p: StepPoint) => !!(p.xVar || p.yVar);

export const fmtPoint = (p: StepPoint) =>
  usesVar(p) ? `X ${p.xVar || '?'}  Y ${p.yVar || '?'}` : `X ${fmtAxis(p.x, p.ax)}  Y ${fmtAxis(p.y, p.ay)}`;

// Tên neo ngắn cho đầu khối Vị trí (design v3): "neo trên-trái", "neo dưới-phải", "neo giữa", "theo %".
const SIDE = (): Record<'x' | 'y', Record<Exclude<Anchor, 'ratio'>, string>> => ({
  x: { start: tr('an.left'), center: tr('an.mid'), end: tr('an.right') },
  y: { start: tr('an.top'), center: tr('an.mid'), end: tr('an.bottom') },
});
export function anchorName({ ax, ay }: Pick<StepPoint, 'ax' | 'ay'>): string {
  const x = axisOf(ax), y = axisOf(ay);
  if (x === 'ratio' || y === 'ratio') return tr('an.pct');
  if (x === 'center' && y === 'center') return tr('an.center');
  return tr('an.name', { y: SIDE().y[y], x: SIDE().x[x] });
}

// Tóm tắt khoảng cách một dòng (hàng sơ đồ thu gọn): "cách trái 812, trên 436", "giữa ngang +20, cách dưới 10", "50% · 25%".
export function anchorSummary({ x, y, ax, ay }: StepPoint) {
  const side = SIDE();
  const part = (n: number, a: Anchor, k: 'x' | 'y', short = false) =>
    a === 'ratio' ? pct(n) : a === 'center' ? `${k === 'x' ? tr('an.midH') : tr('an.midV')} ${n >= 0 ? '+' : '−'}${Math.abs(n)}`
      : short ? `${side[k][a]} ${n}` : tr('an.far', { s: side[k][a], n });
  const px = part(x, axisOf(ax), 'x');
  return axisOf(ax) === 'ratio' ? `${px} · ${part(y, axisOf(ay), 'y')}` : `${px}, ${part(y, axisOf(ay), 'y', axisOf(ay) === axisOf(ax))}`;
}

// Khung tính toạ độ điểm của node: coordSpace "absolute" = gốc (0,0) của màn hình, còn lại là khung b (vùng hoặc màn hình).
// Phải khớp StepBounds trong internal/script/anchor.go.
export const stepBounds = (s: { coordSpace?: string }, b: Rect, screen: Rect): Rect =>
  s.coordSpace === 'absolute' ? { x: 0, y: 0, w: screen.x + screen.w, h: screen.y + screen.h } : b;
