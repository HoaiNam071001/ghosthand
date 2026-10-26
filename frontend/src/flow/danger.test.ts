import { expect, it } from 'vitest';
import { dangerOpText, dangerScript, dangerTitle, isPermanent, type DangerOp } from './danger';

it('dangerOpText', () => {
  expect(dangerOpText({ ref: 'n1', op: 'trash', folder: '~/Downloads', pattern: '*.png' })).toContain('“*.png” trong ~/Downloads');
  expect(dangerOpText({ ref: 'n2', op: 'emptyTrash' })).toContain('không khôi phục');
  expect(dangerOpText({ ref: 'n3', op: 'forceQuit', target: 'zalo' })).toBe('Buộc thoát zalo – mất dữ liệu chưa lưu');
  expect(dangerOpText({ ref: 'n4', op: 'close', target: 'notepad “a”' })).toContain('Đóng cửa sổ notepad “a”');
});

it('dangerTitle / isPermanent', () => {
  expect(dangerTitle([{ ref: 'n1', op: 'trash' }])).toBe('Kịch bản này sẽ xoá file');
  expect(dangerTitle([{ ref: 'n1', op: 'quit' }, { ref: 'n2', op: 'close' }])).toBe('Kịch bản này sẽ thoát app / đóng cửa sổ');
  expect(dangerTitle([{ ref: 'n1', op: 'trash' }, { ref: 'n2', op: 'close' }])).toBe('Kịch bản có thao tác cần xác nhận');
  expect(isPermanent({ ref: 'n1', op: 'forceQuit' }) && !isPermanent({ ref: 'n2', op: 'trash' })).toBe(true);
});

it('lệnh shell: câu, tiêu đề, nội dung nguyên văn', () => {
  const d: DangerOp = { ref: 'n1', op: 'shell', script: 'rm -rf x', dir: '~/a' };
  expect(dangerOpText(d)).toContain('Chạy lệnh');
  expect(dangerOpText(d)).toContain('~/a');
  expect(dangerScript(d)).toBe('rm -rf x');
  expect(dangerScript({ ref: 'n2', op: 'trash' })).toBe('');
  expect(dangerTitle([d])).toBe('Kịch bản này sẽ chạy lệnh trên máy');
});

it('node người dùng đánh dấu ghi / xoá', () => {
  expect(dangerOpText({ ref: 'n3', op: 'marked', target: 'click' })).toContain('Node n3 (Click)');
  expect(dangerTitle([{ ref: 'n3', op: 'marked', target: 'click' }])).toBe('Kịch bản có thao tác cần xác nhận');
});
