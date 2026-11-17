import { describe, expect, it } from 'vitest';
import { summarizeRegion } from './regionSummary';

const d1 = { index: 0, main: true, rect: { x: 0, y: 0, w: 1920, h: 1080 } };
const d2 = { index: 1, main: false, rect: { x: 1920, y: 0, w: 1280, h: 1024 } };

describe('summarizeRegion', () => {
  it('chưa có danh sách màn → không hiện', () => expect(summarizeRegion(null, [])).toBeUndefined());
  it('vùng trống, một màn → toàn màn, không nhắc số màn', () => {
    expect(summarizeRegion(null, [d1])).toMatchObject({ full: true, display: null, w: 1920, h: 1080 });
  });
  it('vùng trống, hai màn → toàn màn chính (màn 1)', () => expect(summarizeRegion(null, [d2, d1])).toMatchObject({ full: true, display: 1 }));
  it('vùng khớp đúng màn phụ → toàn màn 2', () => expect(summarizeRegion(d2.rect, [d1, d2])).toMatchObject({ full: true, display: 2 }));
  it('vùng con của màn 2 → tỉ lệ trong màn đó', () => {
    const s = summarizeRegion({ x: 1920 + 640, y: 512, w: 640, h: 512 }, [d1, d2]);
    expect(s).toMatchObject({ full: false, display: 2, w: 640, h: 512 });
  });
  it('sơ đồ hai màn đặt đúng vị trí, vùng con nằm trong màn 2', () => {
    const s = summarizeRegion({ x: 1920 + 640, y: 512, w: 640, h: 512 }, [d1, d2])!;
    expect(s.map.aspect).toBeCloseTo(3200 / 1080);
    expect(s.map.screens.map((x) => x.active)).toEqual([false, true]);
    expect(s.map.screens[1].rect.x).toBeCloseTo(1920 / 3200);
    expect(s.map.region.x).toBeCloseTo(2560 / 3200);
  });
  it('màn phụ đặt bên trái (toạ độ âm) vẫn chuẩn hoá về 0..1', () => {
    const left = { index: 1, main: false, rect: { x: -1280, y: 0, w: 1280, h: 1024 } };
    const s = summarizeRegion(null, [d1, left])!;
    expect(s.map.screens[1].rect.x).toBe(0);
    expect(s.map.screens[0].rect.x).toBeCloseTo(1280 / 3200);
  });
});
