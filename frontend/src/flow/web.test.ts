import { describe, expect, it } from 'vitest';
import { browserStatusText, fmtSelectors, loginUrl, fmtWebStep, parseSelector, Selector, WebFind, webFindText } from './web';
import { makeStep } from '../types';
import data from '../../../testdata/selectors.json';

// Cùng dữ liệu với TestParseSelector (internal/model/web_test.go) – Go và TS phải đọc selector giống nhau.
const cases = data as { in: string; want?: Selector; bad?: boolean }[];

describe('parseSelector (chung với Go)', () => {
  it('có dữ liệu', () => expect(cases.length).toBeGreaterThan(0));
  for (const c of cases) it(JSON.stringify(c.in), () => expect(parseSelector(c.in)).toEqual(c.bad ? null : c.want));
});

describe('fmtSelectors', () => {
  it('cách đầu + số dự phòng, bỏ dòng trống', () => {
    expect(fmtSelectors(['text=Xem lịch sử', '', 'css=#h'])).toBe('chữ “Xem lịch sử” (+1 dự phòng)');
    expect(fmtSelectors(['css=#go'])).toBe('CSS #go');
    expect(fmtSelectors(['role=button[name="Gửi"]'])).toBe('vai trò button “Gửi”');
    expect(fmtSelectors(['role=link'])).toBe('vai trò link');
  });
  it('chưa nhập', () => {
    expect(fmtSelectors(undefined)).toBe('chưa nhập cách tìm phần tử');
    expect(fmtSelectors(['text='])).toBe('chưa nhập cách tìm phần tử');
  });
});

describe('webFindText', () => {
  const base: WebFind = { found: true, x: 100, y: 200, w: 40, h: 20, text: 'Gửi', selector: 'text=Gửi', covered: '', offView: false, hidden: 0, tab: 'file:///a', noTab: false, count: 1, value: '', ms: 12 };
  it('thấy', () => expect(webFindText(base)).toEqual({ ok: true, text: 'Thấy “text=Gửi” tại X 120 Y 210 · 12 ms' }));
  it('ngoài khung nhìn vẫn ok', () => expect(webFindText({ ...base, offView: true }).ok).toBe(true));
  it('bị che', () => expect(webFindText({ ...base, covered: 'div#cookie' })).toEqual({ ok: false, text: 'Thấy “text=Gửi” tại X 120 Y 210 nhưng đang bị div#cookie che · 12 ms' }));
  it('đang ẩn', () => expect(webFindText({ ...base, found: false, selector: '', hidden: 2 }).text).toBe('Có 2 phần tử khớp nhưng đang ẩn · 12 ms'));
  it('nhiều phần tử khớp', () => expect(webFindText({ ...base, count: 3 }).text).toBe('Thấy “text=Gửi” tại X 120 Y 210 · 3 phần tử khớp, dùng cái đầu · 12 ms'));
  it('node Đọc cho xem giá trị', () => expect(webFindText({ ...base, value: '' }, '', true).text).toBe('Thấy “text=Gửi” tại X 120 Y 210 · đọc được “” · 12 ms'));
  it('không có tab', () => expect(webFindText({ ...base, found: false, noTab: true }, 'shop').text).toContain('“shop”'));
});

describe('browserStatusText', () => {
  it('chưa mở', () => expect(browserStatusText({ open: false, tabs: [] })).toBe('Chrome của app: chưa mở'));
  it('đang mở', () => expect(browserStatusText({ open: true, tabs: [{ title: '', url: 'file:///web.html' }, { title: 'B', url: 'x' }] }))
    .toBe('Chrome của app: đang mở, 2 tab · tab đang dùng “file:///web.html”'));
  it('đang đăng nhập', () => expect(browserStatusText({ open: false, login: true, tabs: [] })).toContain('đăng nhập xong bấm Xong'));
});

describe('loginUrl', () => {
  it('tab web', () => expect(loginUrl({ open: true, tabs: [{ title: '', url: 'https://facebook.com/' }] })).toBe('https://facebook.com/'));
  it('trang trống / file', () => {
    expect(loginUrl({ open: true, tabs: [{ title: '', url: 'about:blank' }] })).toBe('');
    expect(loginUrl(null)).toBe('');
  });
});

describe('fmtWebStep', () => {
  const web = (p: Parameters<typeof makeStep>[0]) => fmtWebStep(makeStep({ selectors: ['text=Gửi'], timeoutMs: 5000, ...p }));
  it('chạy nền', () => expect(web({ id: 'a', type: 'webClick', webBackground: true })).toBe('chữ “Gửi” · chạy nền · tối đa 5 s'));
  it('gõ', () => expect(web({ id: 'a', type: 'webType', text: '{{email}}', webEnter: true })).toBe('“{{email}}” + Enter vào chữ “Gửi” · tối đa 5 s'));
  it('đọc thuộc tính', () => expect(web({ id: 'a', type: 'webRead', readFrom: 'attr', attr: 'href' })).toBe('đọc thuộc tính href · chữ “Gửi” · tối đa 5 s'));
  it('đọc chữ', () => expect(web({ id: 'a', type: 'webRead' })).toBe('đọc chữ hiển thị · chữ “Gửi” · tối đa 5 s'));
  it('cuộn tới', () => expect(web({ id: 'a', type: 'webScroll' })).toBe('tới chữ “Gửi” · tối đa 5 s'));
  it('cuộn tới khi thấy', () => expect(web({ id: 'a', type: 'webScroll', scrollMode: 'until', direction: 'down', amount: 3, tab: 'shop' }))
    .toBe('lăn ↓ 3 nấc tới khi thấy chữ “Gửi” · tab “shop” · tối đa 5 s'));
  it('chỗ thứ + hộp thoại', () => expect(web({ id: 'a', type: 'webClick', selectors: ['label=Ngày sinh'], occurrence: 2, webScope: 'dialog' }))
    .toBe('ô của nhãn “Ngày sinh” · chỗ thứ 2 · trong hộp thoại · tối đa 5 s'));
  it('chờ mất', () => expect(web({ id: 'a', type: 'webWait', webGone: true })).toBe('chữ “Gửi” · chờ mất · tối đa 5 s'));
});
