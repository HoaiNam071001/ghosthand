import { describe, expect, it } from 'vitest';
import { parseInline, plainText } from './inline';

describe('parseInline', () => {
  it('tách đậm, mã, link', () => {
    expect(parseInline('Bấm **Chạy** hoặc `F8`, xem [[node:waitText]] và [[chapter:quyen]].')).toEqual([
      { t: 'text', v: 'Bấm ' }, { t: 'bold', v: 'Chạy' }, { t: 'text', v: ' hoặc ' }, { t: 'code', v: 'F8' },
      { t: 'text', v: ', xem ' }, { t: 'node', v: 'waitText' }, { t: 'text', v: ' và ' }, { t: 'chapter', v: 'quyen' }, { t: 'text', v: '.' },
    ]);
  });
  it('nghiêng khác đậm', () => {
    expect(parseInline('*a* **b**')).toEqual([{ t: 'em', v: 'a' }, { t: 'text', v: ' ' }, { t: 'bold', v: 'b' }]);
  });
  it('chữ thường giữ nguyên', () => {
    expect(parseInline('abc')).toEqual([{ t: 'text', v: 'abc' }]);
    expect(parseInline('')).toEqual([]);
  });
  it('plainText thay link bằng nhãn', () => {
    expect(plainText('**a** [[node:click]]', (_t, id) => id.toUpperCase())).toBe('a CLICK');
  });
});
