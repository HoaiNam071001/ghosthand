// Chế độ "Ánh xạ 4 mốc" của công cụ Chọn nhiều (bước 30): 4 núm ở góc khung bao các điểm đang chọn = mốc cũ,
// kéo từng núm tới chỗ mới → xem trước phối cảnh (homography 4 → 4), Enter áp dụng, Esc thoát. Toán ở transform.ts.
import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { bbox, corners, homography, Mat } from '../transform';
import { transformSelected } from '../store';
import { Point } from '../types';

type Quad = { src: Point[]; dst: Point[] };

export function useQuadMode(toScreen: (client: Point) => Point) {
  const [quad, setQuad] = useState<Quad | null>(null);
  const drag = useRef<number | null>(null);
  const quadRef = useRef(quad);
  quadRef.current = quad;

  const exit = useCallback(() => setQuad(null), []);
  const enter = (pts: Point[]) => {
    const c = corners(bbox(pts));
    setQuad({ src: c, dst: c });
  };
  const apply = useCallback(() => {
    const q = quadRef.current;
    const m = q && homography(q.src, q.dst);
    if (m && transformSelected(m, 'ánh xạ 4 mốc')) setQuad(null);
  }, []);
  const grab = (e: ReactMouseEvent, i: number) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = i;
  };

  useEffect(() => {
    if (!quad) return;
    const onMove = (e: MouseEvent) => {
      const i = drag.current;
      if (i === null) return;
      const p = toScreen({ x: e.clientX, y: e.clientY });
      setQuad((q) => q && { ...q, dst: q.dst.map((d, j) => (j === i ? p : d)) });
    };
    const onUp = () => { drag.current = null; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
      else if (e.key === 'Enter') apply();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation(); // Esc không thoát luôn công cụ Chọn nhiều
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [!!quad, toScreen, exit, apply]);

  // Ma trận xem trước: chưa kéo núm nào (hoặc 3 mốc thẳng hàng) → null = không đổi gì.
  const live: Mat | null = quad && quad.dst.some((d, i) => d.x !== quad.src[i].x || d.y !== quad.src[i].y) ? homography(quad.src, quad.dst) : null;
  return { quad, live, enter, exit, apply, grab };
}

// Thanh nhỏ thay thanh ô nhập số khi đang ở chế độ 4 mốc.
export function QuadBar({ dirty, onApply, onExit }: { dirty: boolean; onApply: () => void; onExit: () => void }) {
  return (
    <div data-ui className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-xl border border-hud-line bg-hud px-3 py-2.5 text-[13px] text-hud-text shadow-[0_12px_32px_rgb(0_0_0/.4)]">
      <span>Ánh xạ 4 mốc: kéo từng núm 1–4 tới vị trí mới</span>
      <button onClick={onExit} className="h-8 rounded-md px-2.5 hover:bg-white/10">Thoát <span className="font-mono text-[11px] opacity-70">Esc</span></button>
      <button onClick={onApply} disabled={!dirty} className="btn-primary h-8 rounded-md px-3 font-semibold disabled:opacity-50">
        Áp dụng <span className="font-mono text-[11px] font-normal opacity-70">Enter</span>
      </button>
    </div>
  );
}

// 4 núm đánh số + viền tứ giác mới; vẽ bằng toạ độ cửa sổ.
export function QuadHandles({ dst, toClient, grab }: {
  dst: Point[]; toClient: (p: Point) => Point; grab: (e: ReactMouseEvent, i: number) => void;
}) {
  const pts = dst.map(toClient);
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="fill-accent/10 stroke-accent" strokeWidth="1.5" strokeDasharray="5 4" />
      </svg>
      {pts.map((p, i) => (
        <span key={i} data-ui onMouseDown={(e) => grab(e, i)} title={`Mốc ${i + 1} – kéo tới vị trí mới`} style={{ left: p.x, top: p.y }}
          className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-move place-items-center rounded-full border-2 border-accent bg-white font-mono text-[11px] font-bold text-black">
          {i + 1}
        </span>
      ))}
    </>
  );
}
