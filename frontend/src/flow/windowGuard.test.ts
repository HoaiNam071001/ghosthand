import { describe, expect, it } from 'vitest';
import { guardLabel, hasWindowGuard } from './windowGuard';

describe('windowGuard', () => {
  it('chỉ node chuột / phím có công tắc', () => {
    expect(hasWindowGuard('click')).toBe(true);
    expect(hasWindowGuard('key')).toBe(true);
    expect(hasWindowGuard('waitImage')).toBe(false);
  });
  it('tóm tắt', () => {
    expect(guardLabel({})).toBeNull();
    expect(guardLabel({ onlyInWindow: true })).toBeNull();
    expect(guardLabel({ onlyInWindow: true, winApp: 'chrome', winTitle: 'Zalo' })).toBe('Chỉ khi “chrome · Zalo” ở trước');
  });
});
