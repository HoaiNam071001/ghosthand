import { describe, expect, it } from 'vitest';
import { askItems, fmtAskUser } from './askUser';
import { portsOf } from './model';

describe('askUser', () => {
  it('tách mục theo dòng, bỏ dòng trống', () => {
    expect(askItems('a@x.vn\n\n  b@x.vn ')).toEqual(['a@x.vn', 'b@x.vn']);
    expect(askItems(undefined)).toEqual([]);
  });
  it('dòng chi tiết', () => {
    expect(fmtAskUser({ message: 'Gửi?', askItems: 'a\nb', askInput: true })).toBe('Gửi? · 2 mục · có ô nhập');
    expect(fmtAskUser({})).toBe('(chưa nhập câu hỏi)');
  });
  it('cổng khớp Go PortsOf', () => {
    expect(portsOf({ type: 'askUser' })).toEqual(['approve', 'deny', 'timeout']);
  });
});
