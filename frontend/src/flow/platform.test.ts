import { describe, expect, it } from 'vitest';
import { onlyLabel, unsupportedHere } from './platform';

const only = { osShortcut: ['darwin'], x: ['darwin', 'windows'] };

describe('platform', () => {
  it('nhãn chỉ cho loại bị giới hạn', () => {
    expect(onlyLabel(only, 'osShortcut')).toBe('Chỉ macOS');
    expect(onlyLabel(only, 'x')).toBe('Chỉ macOS / Windows');
    expect(onlyLabel(only, 'click')).toBe('');
  });
  it('không chạy được ở máy khác', () => {
    expect(unsupportedHere(only, 'osShortcut', 'windows')).toBe(true);
    expect(unsupportedHere(only, 'osShortcut', 'darwin')).toBe(false);
    expect(unsupportedHere(only, 'click', 'windows')).toBe(false);
    expect(unsupportedHere(only, 'osShortcut', '')).toBe(false);
  });
});
