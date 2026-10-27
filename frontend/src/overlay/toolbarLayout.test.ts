import { describe, expect, it } from 'vitest';
import { atBarEdge, barLayout, barPlacement, inBarHold, toBarSide } from './toolbarLayout';

describe('barLayout', () => {
  it('màn lớn: ngang, đủ nhãn', () => {
    expect(barLayout('top', 'main', true, { w: 2560, h: 1440 })).toEqual({ vertical: false, compact: false });
  });
  it('chuyển sang màn nhỏ: ẩn nhãn', () => {
    expect(barLayout('top', 'main', true, { w: 1280, h: 800 }).compact).toBe(true);
  });
  it('cùng màn, xem trước ngắn hơn nên còn đủ nhãn', () => {
    expect(barLayout('top', 'preview', false, { w: 1280, h: 800 }).compact).toBe(false);
  });
  it('trái / phải: dọc, gọn khi màn thấp', () => {
    expect(barLayout('left', 'main', false, { w: 1280, h: 900 })).toEqual({ vertical: true, compact: false });
    expect(barLayout('right', 'main', false, { w: 1280, h: 600 })).toEqual({ vertical: true, compact: true });
  });
});

describe('barPlacement / atBarEdge', () => {
  it('đóng thì trượt ra ngoài đúng phía', () => {
    expect(barPlacement('top', false).transform).toContain('translateY(-');
    expect(barPlacement('bottom', false).transform).toContain('translateY(calc');
    expect(barPlacement('left', false).transform).toContain('translateX(-');
    expect(barPlacement('right', true).transform).toBe('translateY(-50%)');
  });
  it('chuột sát cạnh', () => {
    const vp = { w: 1000, h: 800 };
    expect(atBarEdge('top', { x: 500, y: 5 }, vp, 12)).toBe(true);
    expect(atBarEdge('bottom', { x: 500, y: 795 }, vp, 12)).toBe(true);
    expect(atBarEdge('left', { x: 5, y: 400 }, vp, 12)).toBe(true);
    expect(atBarEdge('right', { x: 5, y: 400 }, vp, 12)).toBe(false);
  });
  it('giá trị lạ → top', () => { expect(toBarSide('x')).toBe('top'); expect(toBarSide(undefined)).toBe('top'); });
});

describe('inBarHold', () => {
  const vp = { w: 1000, h: 800 };
  it('cạnh trên giữ mở cả chỗ gợi ý dời xuống', () => {
    expect(inBarHold('top', { x: 500, y: 100 }, vp)).toBe(true);
    expect(inBarHold('top', { x: 500, y: 200 }, vp)).toBe(false);
  });
  it('cạnh khác chỉ khe sát mép', () => {
    expect(inBarHold('left', { x: 20, y: 400 }, vp)).toBe(true);
    expect(inBarHold('left', { x: 100, y: 400 }, vp)).toBe(false);
  });
});
