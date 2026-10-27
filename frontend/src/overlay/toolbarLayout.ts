// Thanh công cụ overlay: đặt ở cạnh nào, xếp dọc hay ngang, có ẩn nhãn không – hàm thuần (không React) để có test.
import type { CSSProperties } from 'react';

export type BarSide = 'top' | 'bottom' | 'left' | 'right';
export type BarMode = 'main' | 'preview' | 'focus';
export const BAR_SIDES: BarSide[] = ['top', 'bottom', 'left', 'right'];
export const toBarSide = (v: string | undefined): BarSide => (BAR_SIDES.includes(v as BarSide) ? (v as BarSide) : 'top');

const GAP = 8; // px – cách mép màn hình
// Bề rộng ước của thanh đầy đủ (có nhãn) theo chế độ – hơn bề rộng màn hình thì ẩn nhãn, còn dài nữa thì xuống hàng.
const FULL_WIDTH: Record<BarMode, number> = { main: 1180, preview: 900, focus: 760 };
const DISPLAY_PICKER = 150; // thêm khi có nhiều màn hình
const FULL_HEIGHT = 620; // thanh dọc đầy đủ cao ước chừng

export interface BarLayout { vertical: boolean; compact: boolean }

// vp = vùng nhìn thấy của overlay (màn đang chọn) – đổi màn thì gọi lại.
export function barLayout(side: BarSide, mode: BarMode, multiDisplay: boolean, vp: { w: number; h: number }): BarLayout {
  const vertical = side === 'left' || side === 'right';
  const need = FULL_WIDTH[mode] + (multiDisplay ? DISPLAY_PICKER : 0);
  return { vertical, compact: vertical ? vp.h - 2 * GAP < FULL_HEIGHT : vp.w - 2 * GAP < need };
}

// Vị trí thanh: sát cạnh, giữa theo chiều còn lại; đóng thì trượt ra ngoài mép.
export function barPlacement(side: BarSide, open: boolean): CSSProperties {
  const out = 'calc(100% + 16px)';
  switch (side) {
    case 'top': return { top: GAP, left: '50%', transform: `translateX(-50%)${open ? '' : ` translateY(-${out})`}` };
    case 'bottom': return { bottom: GAP, left: '50%', transform: `translateX(-50%)${open ? '' : ` translateY(${out})`}` };
    case 'left': return { left: GAP, top: '50%', transform: `translateY(-50%)${open ? '' : ` translateX(-${out})`}` };
    case 'right': return { right: GAP, top: '50%', transform: `translateY(-50%)${open ? '' : ` translateX(${out})`}` };
  }
}

// Chuột có đang trong dải `edge` px sát cạnh đặt thanh không (để hiện thanh đang ẩn).
export function atBarEdge(side: BarSide, p: { x: number; y: number }, vp: { w: number; h: number }, edge: number): boolean {
  switch (side) {
    case 'top': return p.y <= edge;
    case 'bottom': return p.y >= vp.h - edge;
    case 'left': return p.x <= edge;
    case 'right': return p.x >= vp.w - edge;
  }
}

// Thanh đang mở: giữ mở khi chuột còn trong dải này (ngoài thanh / gợi ý thì người gọi tự xét). Cạnh trên tính cả
// gợi ý (dời xuống dưới thanh lúc mở) – dải hẹp hơn thì rê vào gợi ý → mở → gợi ý dời khỏi chuột → đóng → nhấp nháy.
const HOLD_TOP = 120; // px – thanh (8 + ~54) + gợi ý (76 + 32) + dư
const HOLD = 24; // px – khe giữa mép màn và thanh
export const inBarHold = (side: BarSide, p: { x: number; y: number }, vp: { w: number; h: number }) =>
  atBarEdge(side, p, vp, side === 'top' ? HOLD_TOP : HOLD);
