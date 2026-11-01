import { describe, expect, it } from 'vitest';
import { makeStep } from '../types';
import { counterText, isForeignRun, progressNode, progressSteps } from './progress';

describe('progressNode', () => {
  const steps = [
    makeStep({ id: 'a', ref: 'n2', type: 'waitImage', name: 'Tìm nút Nhắn tin' }),
    makeStep({ id: 'b', ref: 'n5', type: 'counter' }),
    makeStep({ id: 'c', ref: 'n6', type: 'switch', cases: [{ key: 'k1', label: 'Có tin' }] }),
  ];

  it('tới bằng cổng khác Thành công → kèm node trước + nhãn cổng', () => {
    expect(progressNode({ nodeId: 'b', ref: 'n5', from: { ref: 'n2', port: 'fail' } }, steps))
      .toBe('n2 · Tìm nút Nhắn tin · Thất bại → n5 · Đếm');
    expect(progressNode({ nodeId: 'a', ref: 'n2', from: { ref: 'n6', port: 'case:k1' } }, steps))
      .toBe('n6 · Switch theo giá trị · Có tin → n2 · Tìm nút Nhắn tin');
  });

  it('đi thẳng success / node đầu → chỉ node đang chạy', () => {
    expect(progressNode({ nodeId: 'b', ref: 'n5', from: { ref: 'n2', port: 'success' } }, steps)).toBe('n5 · Đếm');
    expect(progressNode({ nodeId: 'a', ref: 'n2' }, steps)).toBe('n2 · Tìm nút Nhắn tin');
    expect(progressNode({}, steps)).toBe('Node');
  });

  it('lượt Đếm', () => {
    expect(counterText({ ref: 'n5', count: 3, max: 10 })).toBe('lượt n5 3 / 10');
  });
});

describe('lần chạy của kịch bản khác', () => {
  it('isForeignRun: người dùng bấm Chạy / cùng file = của editor; kịch bản tạm / file khác = khác', () => {
    expect(isForeignRun('user', '', '/a.json')).toBe(false);
    expect(isForeignRun('ai', '/a.json', '/a.json')).toBe(false);
    expect(isForeignRun('ai', '', '/a.json')).toBe(true);
    expect(isForeignRun('ai', '', undefined)).toBe(true);
    expect(isForeignRun('api', '/b.json', '/a.json')).toBe(true);
  });

  it('progressSteps: tên node lấy từ tiến độ, không tra kịch bản đang mở', () => {
    expect(progressNode({ nodeId: 's3', ref: 'n3' }, progressSteps({ nodeId: 's3', ref: 'n3', type: 'ocrRead' }))).toBe('n3 · Đọc chữ vùng');
    expect(progressNode({ nodeId: 's3', ref: 'n3' }, progressSteps({ nodeId: 's3', ref: 'n3', type: 'click', name: 'Bấm Gửi' }))).toBe('n3 · Bấm Gửi');
    expect(progressSteps({ nodeId: 's3', ref: 'n3' })).toEqual([]);
  });
});
