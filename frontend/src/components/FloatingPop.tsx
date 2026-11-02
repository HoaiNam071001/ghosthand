// Lớp nổi bám theo một phần tử (popover chi tiết node trên canvas, popover khi rê thẻ ở Lịch sử dạng cây – bước 60).
// Vẽ ra body (portal, position fixed) để không bị khung cuộn / canvas cắt hay thẻ khác đè; mỗi khung hình đo lại chỗ
// phần tử neo (canvas kéo / zoom, cây cuộn vẫn bám theo). Sát mép cửa sổ thì lật lên trên / sang trái.
// Phần tử neo ra khỏi vùng nhìn thấy của khung chứa (data-float-clip) thì ẩn.
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Pos = { left: number; top: number; hidden: boolean; maxH?: number };
const EDGE = 8;

export default function FloatingPop({ anchor, side = 'bottom', gap = 10, z = 30, onMouseEnter, onMouseLeave, children }: {
  anchor: () => Element | null | undefined; // tìm lại mỗi khung hình (node vẽ lại thì phần tử đổi)
  side?: 'bottom' | 'right';
  gap?: number;
  z?: number; // dưới hộp thoại (z-40) khi nổi trên canvas; trên hộp thoại khi nằm trong hộp thoại
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>({ left: -9999, top: -9999, hidden: true });
  const find = useRef(anchor);
  find.current = anchor;

  useLayoutEffect(() => {
    let frame = 0;
    let last = '';
    const tick = () => {
      const next = place(find.current(), box.current, side, gap);
      const k = `${next.left}|${next.top}|${next.hidden}|${next.maxH}`;
      if (k !== last) { last = k; setPos(next); }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [side, gap]);

  return createPortal(
    <div ref={box} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: z, visibility: pos.hidden ? 'hidden' : undefined,
        maxHeight: pos.maxH, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>,
    document.body,
  );
}

// Chỗ đặt lớp nổi cạnh phần tử a (hàm tính – chỉ đọc kích thước DOM)
function place(a: Element | null | undefined, el: HTMLElement | null, side: 'bottom' | 'right', gap: number): Pos {
  if (!a || !el) return { left: -9999, top: -9999, hidden: true };
  const r = a.getBoundingClientRect();
  const clip = a.closest('[data-float-clip]')?.getBoundingClientRect();
  if (clip && (r.bottom < clip.top || r.top > clip.bottom || r.right < clip.left || r.left > clip.right)) return { left: -9999, top: -9999, hidden: true };
  const w = el.offsetWidth, h = el.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(v, hi)));
  if (side === 'right') {
    const left = r.right + gap + w <= W - EDGE ? r.right + gap : r.left - gap - w;
    return { left: clamp(left, EDGE, W - w - EDGE), top: clamp(r.top - 4, EDGE, H - h - EDGE), hidden: false };
  }
  // dưới đủ chỗ thì đặt dưới, không thì trên; cả hai thiếu → phía rộng hơn và co chiều cao (không đè lên phần tử neo)
  const roomBelow = H - EDGE - (r.bottom + gap), roomAbove = r.top - gap - EDGE;
  const down = h <= roomBelow || (h > roomAbove && roomBelow >= roomAbove);
  const maxH = Math.max(120, Math.floor(down ? roomBelow : roomAbove));
  const top = down ? r.bottom + gap : r.top - gap - Math.min(h, maxH);
  return { left: clamp(r.left, EDGE, W - w - EDGE), top: Math.round(Math.max(EDGE, top)), hidden: false, maxH };
}
