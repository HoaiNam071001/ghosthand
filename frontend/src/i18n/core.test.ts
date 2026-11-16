import { describe, expect, it } from 'vitest';
import { en } from './en';
import { format, resolveLang, translate } from './core';
import { vi } from './vi';

describe('i18n core', () => {
  it('resolveLang: system theo ngôn ngữ máy', () => {
    expect(resolveLang('system', 'vi-VN')).toBe('vi');
    expect(resolveLang('system', 'en-US')).toBe('en');
    expect(resolveLang('system', 'fr')).toBe('en');
    expect(resolveLang('vi', 'en-US')).toBe('vi');
    expect(resolveLang('en', 'vi-VN')).toBe('en');
  });
  it('format thay {biến}, giữ nguyên biến thiếu', () => {
    expect(format('Chào {name}', { name: 'A' })).toBe('Chào A');
    expect(format('Chào {name}')).toBe('Chào {name}');
    expect(format('{a}-{b}', { a: 1 })).toBe('1-{b}');
  });
  it('translate theo ngôn ngữ', () => {
    expect(translate('vi', 'theme.dark')).toBe('Tối');
    expect(translate('en', 'theme.dark')).toBe('Dark');
    expect(translate('en', 'lang.current', { name: 'English' })).toBe('Language: English');
  });
  it('en có đủ key của vi và cùng biến {x}', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(vi) as (keyof typeof vi)[]) {
      expect(en[k], k).toBeTruthy();
      expect(vars(en[k]), k).toBe(vars(vi[k]));
    }
  });
});
