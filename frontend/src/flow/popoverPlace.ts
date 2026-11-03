// Chỗ đặt popover chi tiết node (bước 60) trong khung canvas: ưu tiên dưới node, không đủ chỗ thì lật lên trên,
// cả hai đều thiếu thì chọn phía rộng hơn và giới hạn chiều cao (popover tự cuộn); dịch ngang cho không tràn mép.
// Toạ độ tính theo px trong khung canvas (gốc ở góc trên trái).

export type Box = { x: number; y: number; w: number; h: number };
export type Placement = { left: number; top: number; maxH: number; side: 'below' | 'above' };

const MIN_H = 160; // nhỏ hơn mức này thì thà đè lên node còn hơn popover quá thấp, khó đọc

// insetTop: phần trên khung bị thanh công cụ nổi che (dòng "Flow · Xem · Thêm node") – popover không lên tới đó.
export function placePopover(node: Box, pop: { w: number; h: number }, pane: { w: number; h: number }, { gap = 12, margin = 8, insetTop = 0 } = {}): Placement {
  const top0 = insetTop + margin;
  const below = pane.h - (node.y + node.h) - gap - margin;
  const above = node.y - gap - top0;
  const side = pop.h <= below || (pop.h > above && below >= above) ? 'below' : 'above';
  const room = side === 'below' ? below : above;
  const maxH = Math.max(room, Math.min(MIN_H, pane.h - top0 - margin));
  const h = Math.min(pop.h, maxH);
  const want = side === 'below' ? node.y + node.h + gap : node.y - gap - h;
  return {
    left: clamp(node.x + node.w / 2 - pop.w / 2, margin, pane.w - margin - pop.w),
    top: clamp(want, top0, pane.h - margin - h),
    maxH,
    side,
  };
}

// hi < lo (khung hẹp hơn popover) → bám mép trái / trên
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
