import { describe, expect, it } from 'vitest';
import { appChoices } from './windowChoices';

const w = (id: number, app: string, minimized = false) => ({ id, app, title: `${app} ${id}`, minimized });

describe('appChoices', () => {
  it('mỗi app một dòng, giữ thứ tự chồng (cửa sổ trên cùng trước)', () => {
    expect(appChoices([w(1, 'Chrome'), w(2, 'Code'), w(3, 'Chrome')]).map((c) => c.id)).toEqual([1, 2]);
  });
  it('bỏ cửa sổ thu nhỏ và không có tên app', () => {
    expect(appChoices([w(1, 'Chrome', true), w(2, ''), w(3, 'Chrome')]).map((c) => c.id)).toEqual([3]);
  });
});
