import { describe, expect, it } from 'vitest';
import { elementMissOf, missHint, missText } from './elementMiss';

describe('elementMiss', () => {
  it('bỏ qua lỗi không phải phần tử', () => {
    expect(elementMissOf({ kind: 'web' })).toBeNull();
    expect(elementMissOf(undefined)).toBeNull();
  });
  it('gợi ý theo số đã đọc', () => {
    const m = elementMissOf({ kind: 'element', read: 0 })!;
    expect(missHint(m)).toMatch(/quyền Accessibility/);
    expect(missHint({ ...m, read: 3 })).toMatch(/khung cửa sổ/);
  });
  it('bản chép thụt theo độ sâu', () => {
    const m = elementMissOf({ kind: 'element', read: 2, count: 0, roles: [{ raw: 'AXButton', count: 1 }],
      dump: [{ raw: 'AXButton', role: 'button', name: 'Gửi', depth: 2, box: { x: 0, y: 0, w: 1, h: 1 } }] })!;
    expect(missText(m)).toBe('Đã đọc 2 phần tử; khớp 0.\nAXButton×1\n    AXButton "Gửi"');
  });
});
