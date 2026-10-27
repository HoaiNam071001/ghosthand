import { describe, expect, it } from 'vitest';
import { fnOfKey, portForDrag } from './dragConnect';

const ports = ['success', 'fail'];
const none = { mod: false, alt: false, fn: 0 };

describe('portForDrag', () => {
  it('không phím → không nối', () => expect(portForDrag(ports, none)).toBeNull());
  it('Ctrl / Cmd = cổng đầu, Alt = cổng hai', () => {
    expect(portForDrag(ports, { ...none, mod: true })).toBe('success');
    expect(portForDrag(ports, { ...none, alt: true })).toBe('fail');
  });
  it('node một cổng: Alt không nối', () => expect(portForDrag(['success'], { ...none, alt: true })).toBeNull());
  it('Ctrl + F2 = cổng thứ hai; F không kèm Ctrl thì bỏ', () => {
    const sw = ['case:a', 'case:b', 'default'];
    expect(portForDrag(sw, { mod: true, alt: false, fn: 2 })).toBe('case:b');
    expect(portForDrag(sw, { mod: true, alt: false, fn: 9 })).toBeNull();
    expect(portForDrag(sw, { ...none, fn: 1 })).toBeNull();
  });
  it('fnOfKey', () => { expect(fnOfKey('F2')).toBe(2); expect(fnOfKey('KeyA')).toBe(0); });
});
