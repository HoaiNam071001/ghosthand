// Nét kéo chuột (hàng trăm mẫu) → vài điểm của node Vẽ đường (bước 50 E1). Douglas–Peucker giữ các góc, bỏ điểm thẳng hàng.
import type { Point } from '../types';

export const STROKE_EPS = 6; // px – lệch tối đa so với nét gốc
export const STROKE_MAX = 80; // số điểm tối đa của node

function distToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / len;
}

function rdp(pts: Point[], eps: number): Point[] {
  if (pts.length < 3) return pts;
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToLine(pts[i], pts[0], pts[pts.length - 1]);
    if (d > far) { far = d; at = i; }
  }
  if (far <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, at + 1), eps).slice(0, -1), ...rdp(pts.slice(at), eps)];
}

// Quá nhiều điểm thì nới dung sai dần tới khi vừa max. Điểm đầu / cuối luôn giữ; tròn số px.
export function simplifyStroke(pts: Point[], max = STROKE_MAX, eps = STROKE_EPS): Point[] {
  const dedup = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  let out = rdp(dedup, eps);
  for (let e = eps; out.length > max; e *= 1.5) out = rdp(dedup, e);
  return out.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
}
