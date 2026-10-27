import { describe, expect, it } from 'vitest';
import { addSample, setDisplay, toClientPt, toScreenPt } from './coordMap';

describe('coordMap', () => {
  it('ánh xạ lấy từ khung màn – đúng ngay, không cần mẫu', () => {
    const m = setDisplay({ x: 1920, y: 0, w: 2400, h: 1350 }, 1.25);
    expect(toScreenPt(m, { x: 100, y: 80 })).toEqual({ x: 2045, y: 100 });
    expect(toClientPt(m, { x: 2045, y: 100 })).toEqual({ x: 100, y: 80 });
  });

  it('rê chuột (mẫu có nhiễu làm tròn) không làm ánh xạ nhích', () => {
    const m = setDisplay({ x: 0, y: 0, w: 2400, h: 1350 }, 1.25);
    const samples: [number, number][] = [[10, 10], [400, 300], [1500, 900], [33, 777], [1919, 1079]];
    for (const [x, y] of samples) {
      expect(addSample({ x, y }, { x: Math.round(x * 1.25), y: Math.round(y * 1.25) })).toBe(m);
    }
  });

  it('cửa sổ không nằm đúng góc màn: hai mẫu cùng lệch thì sửa gốc, mẫu lẻ bị bỏ', () => {
    setDisplay({ x: 0, y: 0, w: 1440, h: 900 }, 1);
    // cửa sổ nằm dưới thanh menu 25 px
    expect(addSample({ x: 100, y: 100 }, { x: 100, y: 125 }).by).toBe(0); // một mẫu chưa đủ
    expect(addSample({ x: 300, y: 50 }, { x: 340, y: 75 }).by).toBe(0); // mẫu lấy lúc chuột trôi – không khớp mẫu trước
    expect(addSample({ x: 500, y: 400 }, { x: 500, y: 425 }).by).toBe(0); // vẫn lệch với mẫu trôi
    const m = addSample({ x: 700, y: 600 }, { x: 700, y: 625 });
    expect(m.by).toBe(25);
    expect(m.bx).toBe(0);
  });

  it('mở lại ở màn đã đo thì giữ độ lệch đã sửa', () => {
    const d = { x: 0, y: 0, w: 1440, h: 900 };
    setDisplay(d, 1);
    addSample({ x: 100, y: 100 }, { x: 100, y: 125 });
    addSample({ x: 600, y: 300 }, { x: 600, y: 325 });
    setDisplay({ x: 1440, y: 0, w: 1920, h: 1080 }, 1);
    expect(setDisplay(d, 1).by).toBe(25);
  });
});
