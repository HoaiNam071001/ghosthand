import { describe, expect, it } from 'vitest';
import { browserTabOutputs, browserTabWarning, fmtBrowserGo, fmtBrowserNorm, fmtBrowserTab, normTargetMissing } from './browserTab';

const refOf = (id: string) => (id === 'o' ? 'n1' : id);
const refs = new Map([['o', 'n1']]);

describe('node Tab trình duyệt', () => {
  it('dòng chi tiết theo thao tác', () => {
    expect(fmtBrowserTab({}, refOf)).toBe('Đọc tab · tab đang hiện');
    expect(fmtBrowserTab({ tabOp: 'close', tabFrom: 'o' }, refOf)).toBe('Đóng tab · tab của n1');
    expect(fmtBrowserTab({ tabOp: 'new', url: 'example.com' }, refOf)).toBe('Mở tab mới · example.com');
    expect(fmtBrowserTab({ tabOp: 'list', browser: 'coccoc' }, refOf)).toBe('Liệt kê tab · mọi tab · Cốc Cốc');
    // tab node Mở không áp dụng cho Mở tab mới / liệt kê → theo tab
    expect(fmtBrowserTab({ tabOp: 'switch', tab: 'Gmail' }, refOf)).toBe('Chuyển tới tab · “Gmail”');
  });

  it('cảnh báo thiếu giống kiểm tra của Go', () => {
    expect(browserTabWarning({ tabOp: 'waitOpen' }, refs)).toMatch('Chưa nhập');
    expect(browserTabWarning({ tabOp: 'waitClose', tabFrom: 'o' }, refs)).toBeUndefined();
    expect(browserTabWarning({ tabOp: 'close', tabFrom: 'x' }, refs)).toMatch('không còn');
    expect(browserTabWarning({ tabOp: 'close' }, refs)).toBeUndefined();
  });

  it('output theo thao tác', () => {
    expect(browserTabOutputs({ tabOp: 'list' }).map((o) => o.key)).toEqual(['items', 'count']);
    expect(browserTabOutputs({ tabOp: 'closeOthers' }).map((o) => o.key)).toContain('closed');
    expect(browserTabOutputs({}).map((o) => o.key)).toContain('url');
  });
});

describe('node Đi tới URL', () => {
  it('chi tiết, cảnh báo, output', () => {
    expect(fmtBrowserGo({ type: 'browserGo', url: 'example.com' }, refOf)).toBe('example.com · tab đang hiện');
    expect(fmtBrowserGo({ type: 'browserGo', url: 'a.vn', tabFrom: 'o', browser: 'edge' }, refOf)).toBe('a.vn · tab của n1 · Edge');
    expect(browserTabWarning({ type: 'browserGo', url: ' ' }, refs)).toBe('Chưa nhập URL');
    expect(browserTabOutputs({ type: 'browserGo' }).map((o) => o.key)).toContain('ms');
  });
});

describe('node Chuẩn hoá trình duyệt', () => {
  it('chi tiết, cảnh báo, output', () => {
    const on = { type: 'browserNorm' as const, normZoom: true, normFullscreen: true, normSize: true, winPreset: 'center' as const };
    expect(fmtBrowserNorm(on, refOf)).toBe('thoát toàn màn hình · cỡ giữa · zoom 100 % · tab đang hiện');
    expect(fmtBrowserNorm({ type: 'browserNorm' }, refOf)).toBe('chưa bật việc nào · tab đang hiện');
    expect(browserTabWarning({ type: 'browserNorm' }, refs)).toBe('Chưa bật việc nào');
    expect(browserTabWarning({ ...on, winPreset: undefined }, refs)).toBe('Chưa nhập cỡ cửa sổ');
    expect(browserTabWarning(on, refs)).toContain('chọn trình duyệt');
    expect(browserTabWarning({ ...on, browser: 'chrome', tab: 'gmail' }, refs)).toBeUndefined();
  });

  it('đặt cỡ phải có đích (khớp validateNorm)', () => {
    const size = { type: 'browserNorm' as const, normSize: true };
    expect(normTargetMissing({ ...size })).toBe('browser');
    expect(normTargetMissing({ ...size, browser: 'coccoc' })).toBe('tab');
    expect(normTargetMissing({ ...size, browser: 'coccoc', tab: ' ' })).toBe('tab');
    expect(normTargetMissing({ ...size, browser: 'coccoc', tab: 'gmail' })).toBeUndefined();
    expect(normTargetMissing({ ...size, tabFrom: 's1' })).toBeUndefined();
    expect(normTargetMissing({ type: 'browserNorm', normZoom: true })).toBeUndefined();
    expect(browserTabOutputs({ type: 'browserNorm' }).map((o) => o.key)).toContain('wasFullscreen');
  });
});
