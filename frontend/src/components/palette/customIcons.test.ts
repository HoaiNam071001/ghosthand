import { describe, expect, it } from 'vitest';
import { STEP_ICON } from '../icons';
import { CUSTOM_ICONS, customIcon, DEFAULT_CUSTOM_ICON } from './customIcons';

describe('customIcons', () => {
  it('mọi icon chọn được đều có thật', () => {
    for (const n of CUSTOM_ICONS) expect(n in STEP_ICON).toBe(true);
  });
  it('icon lạ rơi về mặc định', () => {
    expect(customIcon('file')).toBe('file');
    expect(customIcon('khong-co')).toBe(DEFAULT_CUSTOM_ICON);
    expect(customIcon(undefined)).toBe(DEFAULT_CUSTOM_ICON);
  });
});
