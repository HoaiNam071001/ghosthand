// Nét đang kéo (công cụ Vẽ đường, bước 50 E1): đường liền + chấm đầu / cuối. Chỉ hiển thị, toạ độ cửa sổ.
import type { Point } from '../../types';

export function StrokeLayer({ pts }: { pts: Point[] }) {
  if (pts.length < 1) return null;
  const a = pts[0], b = pts[pts.length - 1];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" />
      <circle cx={a.x} cy={a.y} r={5} className="fill-ok" />
      <circle cx={b.x} cy={b.y} r={4} className="fill-accent" />
    </svg>
  );
}
