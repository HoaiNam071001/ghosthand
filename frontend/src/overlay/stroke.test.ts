import { describe, expect, it } from 'vitest';
import { simplifyStroke } from './stroke';

describe('simplifyStroke', () => {
  it('đường thẳng chỉ còn hai đầu', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i * 4, y: 100 + (i % 2) }));
    expect(simplifyStroke(line)).toEqual([{ x: 0, y: 100 }, { x: 196, y: 101 }]);
  });
  it('giữ góc', () => {
    const l = [...Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 0 })), ...Array.from({ length: 20 }, (_, i) => ({ x: 100, y: i * 5 + 5 }))];
    const out = simplifyStroke(l);
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual({ x: 95, y: 0 });
  });
  it('vòng tròn nhiều mẫu bị chặn ở số điểm tối đa, giữ điểm đầu / cuối', () => {
    const circle = Array.from({ length: 600 }, (_, i) => ({ x: 300 + 200 * Math.cos(i / 95), y: 300 + 200 * Math.sin(i / 95) }));
    const out = simplifyStroke(circle, 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out[0]).toEqual({ x: 500, y: 300 });
  });
  it('nét một điểm / trùng điểm', () => {
    expect(simplifyStroke([{ x: 1, y: 1 }, { x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });
});
