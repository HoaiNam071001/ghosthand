import { describe, expect, it } from 'vitest';
import { daysLeft } from './trials';

const DAY = 24 * 3600 * 1000;

describe('daysLeft', () => {
  it('làm tròn lên, không âm', () => {
    expect(daysLeft(0, 7, 0)).toBe(7);
    expect(daysLeft(0, 7, 6.5 * DAY)).toBe(1);
    expect(daysLeft(0, 7, 9 * DAY)).toBe(0);
  });
  it('không dọn thì null', () => {
    expect(daysLeft(0, 0, 0)).toBeNull();
  });
});
