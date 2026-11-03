import { describe, expect, it } from 'vitest';
import { placePopover } from './popoverPlace';

const pane = { w: 1000, h: 600 };
const pop = { w: 360, h: 300 };

describe('placePopover', () => {
  it('đủ chỗ dưới → dưới node, căn giữa', () => {
    const p = placePopover({ x: 400, y: 100, w: 160, h: 50 }, pop, pane);
    expect(p).toMatchObject({ side: 'below', top: 162, left: 300 });
  });

  it('node gần đáy (khung Nhật ký thu nhỏ canvas) → lật lên trên', () => {
    const p = placePopover({ x: 400, y: 450, w: 160, h: 50 }, pop, pane);
    expect(p.side).toBe('above');
    expect(p.top).toBe(450 - 12 - 300);
  });

  it('hai phía đều thiếu → phía rộng hơn, giới hạn chiều cao trong khung', () => {
    const p = placePopover({ x: 400, y: 300, w: 160, h: 50 }, { w: 360, h: 900 }, pane);
    expect(p.side).toBe('above');
    expect(p.maxH).toBe(300 - 12 - 8);
    expect(p.top).toBe(8);
  });

  it('node sát mép trái / phải → dịch vào trong khung', () => {
    expect(placePopover({ x: 0, y: 100, w: 160, h: 50 }, pop, pane).left).toBe(8);
    expect(placePopover({ x: 900, y: 100, w: 160, h: 50 }, pop, pane).left).toBe(1000 - 8 - 360);
  });

  it('node ra ngoài khung → popover vẫn nằm trong khung', () => {
    const p = placePopover({ x: 400, y: 700, w: 160, h: 50 }, pop, pane);
    expect(p.top).toBeGreaterThanOrEqual(8);
    expect(p.top + Math.min(pop.h, p.maxH)).toBeLessThanOrEqual(600 - 8);
  });

  it('chừa phần trên cho thanh công cụ nổi', () => {
    const p = placePopover({ x: 400, y: 300, w: 160, h: 50 }, { w: 360, h: 900 }, pane, { insetTop: 44 });
    expect(p).toMatchObject({ side: 'above', top: 52, maxH: 300 - 12 - 52 });
  });

  it('khung hẹp hơn popover → bám mép trái', () => {
    expect(placePopover({ x: 50, y: 10, w: 100, h: 40 }, pop, { w: 300, h: 600 }).left).toBe(8);
  });
});
