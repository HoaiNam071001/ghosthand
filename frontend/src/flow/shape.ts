// Node Vẽ đường (bước 35 N7) – đỉnh hình (cùng công thức ShapePoints, internal/model/shape.go – test chung
// testdata/shapes.json), nhãn hình, dòng chi tiết thẻ. Chạy ở internal/engine/draw.go.
import type { Point, Step } from '../types';
import { tr } from '../i18n/lang';

// '' = đường gấp khúc qua các điểm (khớp model.Shapes)
export type Shape = '' | 'circle' | 'rect' | 'star';
export const SHAPES: { id: Shape; label: string }[] = [{ id: '', get label() { return tr('shape.0'); } }, { id: 'circle', get label() { return tr('shape.1'); } }, { id: 'rect', get label() { return tr('shape.2'); } }, { id: 'star', get label() { return tr('shape.3'); } }];

const CIRCLE_SEGMENTS = 36;

// Đỉnh hình quanh tâm (cx, cy), cỡ w × h (h ≤ 0 = w), khép kín (điểm cuối = điểm đầu). '' / lạ → [].
export function shapePoints(shape: string, cx: number, cy: number, w: number, h: number): Point[] {
  const ry = (h > 0 ? h : w) / 2, rx = w / 2;
  const ring = (n: number, r: (i: number) => number) => Array.from({ length: n + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * (i % n)) / n;
    const k = r(i % n);
    return { x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) };
  });
  switch (shape) {
    case 'circle': return ring(CIRCLE_SEGMENTS, () => 1);
    case 'star': return ring(10, (i) => (i % 2 ? 0.4 : 1));
    case 'rect': return [{ x: cx - rx, y: cy - ry }, { x: cx + rx, y: cy - ry }, { x: cx + rx, y: cy + ry }, { x: cx - rx, y: cy + ry }, { x: cx - rx, y: cy - ry }];
  }
  return [];
}

// Các đỉnh nét vẽ theo toạ độ màn hình: pts = toạ độ các điểm của node (null = điểm dùng biến – chưa biết).
export function pathVertices(s: Pick<Step, 'shape' | 'shapeW' | 'shapeH' | 'closed'>, pts: (Point | null)[]): Point[] | null {
  if (pts.some((p) => !p)) return null;
  const ps = pts as Point[];
  if (s.shape) return ps[0] ? shapePoints(s.shape, ps[0].x, ps[0].y, s.shapeW ?? 0, s.shapeH ?? 0) : null;
  return s.closed && ps.length > 1 ? [...ps, ps[0]] : ps;
}

export function fmtPath(s: Pick<Step, 'shape' | 'shapeW' | 'shapeH' | 'points' | 'closed' | 'dragMs'>): string {
  const sec = `${(s.dragMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`;
  if (!s.shape) return `${s.points.length} điểm${s.closed ? ' · khép kín' : ''} · ${sec}`;
  const name = SHAPES.find((x) => x.id === s.shape)?.label.toLowerCase();
  const size = s.shape === 'rect' || (s.shapeH && s.shapeH !== s.shapeW) ? `${s.shapeW ?? 0} × ${s.shapeH || s.shapeW || 0}` : `${s.shapeW ?? 0}`;
  return `${name} ${size} px · ${sec}`;
}
