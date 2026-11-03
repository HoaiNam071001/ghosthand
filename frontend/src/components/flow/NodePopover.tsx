// Popover chi tiết node (bước 60): đặt dưới / trên node và dịch ngang cho nằm gọn trong khung canvas.
// Không dùng NodeToolbar – nó luôn ở dưới node nên tràn khỏi canvas (sát mép trái, khi khung Nhật ký thu nhỏ canvas) và bị cắt.
// Nằm ngoài lớp zoom của xyflow nên lăn chuột trong popover không zoom canvas.
import { ReactNode, RefObject, useLayoutEffect, useRef, useState } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';
import { placePopover, type Box } from '../../flow/popoverPlace';

// Thanh công cụ nổi trên canvas (FlowHeader: top-3 + nút h-8) – popover không chui xuống dưới nó.
const HEADER_H = 44;

const sameBox = (a: Box | null, b: Box | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

export default function NodePopover({ nodeId, children }: { nodeId: string; children: ReactNode }) {
  const node = useStore((s: ReactFlowState) => {
    const n = s.nodeLookup.get(nodeId);
    if (!n) return null;
    const p = n.internals.positionAbsolute;
    return { x: p.x, y: p.y, w: n.measured.width ?? 0, h: n.measured.height ?? 0 };
  }, sameBox);
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const paneW = useStore((s) => s.width);
  const paneH = useStore((s) => s.height);
  const ref = useRef<HTMLDivElement>(null);
  const size = useNaturalSize(ref);
  const at = node && placePopover(
    { x: node.x * zoom + tx, y: node.y * zoom + ty, w: node.w * zoom, h: node.h * zoom },
    { w: size.w, h: Math.min(size.h, window.innerHeight * 0.6) }, // cao quá 60 % cửa sổ thì cuộn trong popover
    { w: paneW, h: paneH }, { insetTop: HEADER_H });
  return (
    <div ref={ref} className="absolute z-10"
      style={at ? { left: at.left, top: at.top, maxHeight: at.maxH, visibility: size.h ? 'visible' : 'hidden' } : { display: 'none' }}>
      {children}
    </div>
  );
}

// Kích thước thật của nội dung (scrollHeight – không bị maxHeight cắt) để biết phía nào đủ chỗ; đo lại khi mở / đóng mục.
function useNaturalSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const el = box.firstElementChild as HTMLElement | null;
      if (!el) return;
      const w = el.offsetWidth, h = el.scrollHeight + el.offsetHeight - el.clientHeight;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    const mo = new MutationObserver(measure);
    mo.observe(box, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [ref]);
  return size;
}
