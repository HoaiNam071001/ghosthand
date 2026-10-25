import { describe, expect, it } from 'vitest';
import { onlyLabel, unsupportedHere } from './platform';

const only = { savePdf: ['darwin'], x: ['darwin', 'windows'] };

describe('platform', () => {
  it('nhãn chỉ cho loại bị giới hạn', () => {
    expect(onlyLabel(only, 'savePdf')).toBe('Chỉ macOS');
    expect(onlyLabel(only, 'x')).toBe('Chỉ macOS / Windows');
    expect(onlyLabel(only, 'click')).toBe('');
  });
  it('không chạy được ở máy khác', () => {
    expect(unsupportedHere(only, 'savePdf', 'windows')).toBe(true);
    expect(unsupportedHere(only, 'savePdf', 'darwin')).toBe(false);
    expect(unsupportedHere(only, 'click', 'windows')).toBe(false);
    expect(unsupportedHere(only, 'savePdf', '')).toBe(false);
  });
});
