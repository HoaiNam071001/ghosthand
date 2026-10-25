import { describe, expect, it } from 'vitest';
import { outputRows } from './outputRows';

describe('outputRows', () => {
  const fields = [{ key: 'text', desc: 'chữ đọc được' }, { key: 'count', desc: 'số dòng' }];
  it('nhãn lấy từ mô tả, giá trị object thành JSON', () => {
    const rows = outputRows('n2', { text: 'xin chào', extra: { a: 1 } }, fields);
    expect(rows[0]).toEqual({ key: 'text', label: 'chữ đọc được', variable: '{{n2.output.text}}', value: 'xin chào' });
    expect(rows[1].label).toBe('extra');
    expect(rows[1].value).toContain('"a": 1');
  });
  it('chưa chạy: liệt kê trường khai báo, giá trị rỗng', () => {
    expect(outputRows('n1', undefined, fields).map((r) => r.value)).toEqual(['', '']);
  });
});
