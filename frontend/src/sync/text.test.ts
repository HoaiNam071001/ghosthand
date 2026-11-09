import { describe, expect, it } from 'vitest';
import { EMPTY_STATUS } from './types';
import { clockText, conflictLead, intervalOk, passphraseOk, summaryText, syncTone } from './text';

const on = { ...EMPTY_STATUS, loggedIn: true };

describe('syncTone', () => {
  it('chưa đăng nhập', () => expect(syncTone(EMPTY_STATUS).tone).toBe('off'));
  it('MCP chưa kết nối nói rõ là server', () => expect(syncTone({ ...EMPTY_STATUS, backend: 'mcp' }).text).toContain('MCP'));
  it('đang chạy ưu tiên hơn lỗi cũ', () => expect(syncTone({ ...on, running: true, lastError: 'x' }).tone).toBe('busy'));
  it('lỗi', () => expect(syncTone({ ...on, lastError: 'mất mạng' }).tone).toBe('error'));
  it('xung đột báo số', () => expect(syncTone({ ...on, conflicts: ['a', 'b'] })).toEqual({ tone: 'warn', text: '2 xung đột chờ bạn chọn' }));
  it('tệp thiếu / đang soạn dở là cảnh báo', () => {
    expect(syncTone({ ...on, missing: ['a: x.csv'] }).tone).toBe('warn');
    expect(syncTone({ ...on, held: ['scripts/a.json'] }).tone).toBe('warn');
  });
  it('xong', () => expect(syncTone({ ...on, lastAt: new Date().toISOString() }).tone).toBe('ok'));
  it('chưa đồng bộ lần nào vẫn ok', () => expect(syncTone(on).text).toBe('Chưa đồng bộ lần nào'));
});

describe('clockText', () => {
  const now = new Date(2026, 10, 9, 15, 0);
  it('cùng ngày chỉ giờ', () => expect(clockText(new Date(2026, 10, 9, 9, 5).toISOString(), now)).toBe('09:05'));
  it('khác ngày có ngày / tháng', () => expect(clockText(new Date(2026, 10, 8, 23, 59).toISOString(), now)).toBe('08/11 23:59'));
  it('rỗng hoặc hỏng', () => {
    expect(clockText(undefined, now)).toBe('chưa');
    expect(clockText('khong-phai-gio', now)).toBe('chưa');
  });
});

describe('summaryText', () => {
  it('chỉ liệt kê phần có việc', () => expect(summaryText({ pushed: 2, pulled: 0, deleted: 1 })).toBe('Đẩy lên 2 · Xoá 1'));
  it('không có gì → rỗng', () => expect(summaryText({ pushed: 0, pulled: 0, deleted: 0 })).toBe(''));
});

describe('kiểm tra nhập', () => {
  it('cụm mật khẩu tính theo ký tự, không theo byte', () => {
    expect(passphraseOk('1234567')).toBe(false);
    expect(passphraseOk('12345678')).toBe(true);
    expect(passphraseOk('mậtkhẩu!')).toBe(true);
  });
  it('chu kỳ', () => {
    expect([0, 5, 1440].every(intervalOk)).toBe(true);
    expect([1, 4, 1441, -5, 7.5].some(intervalOk)).toBe(false);
  });
});

describe('conflictLead', () => {
  it('nói đúng bên nào đã xoá', () => {
    expect(conflictLead({ localDeleted: true, remoteDeleted: false, device: 'MAY-B' })).toContain('Bạn đã xoá');
    expect(conflictLead({ localDeleted: false, remoteDeleted: true, device: 'MAY-B' })).toContain('MAY-B đã xoá');
    expect(conflictLead({ localDeleted: false, remoteDeleted: false, device: '' })).toContain('máy khác');
  });
});
