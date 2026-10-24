import { describe, expect, it } from 'vitest';
import data from '../../../testdata/perms.json';
import { STEP_LABEL } from '../types';
import type { Step } from '../types';
import { missingOf, needs, needsOf } from './perms';

// Cùng dữ liệu với internal/perm/needs_test.go
// Giữ cùng noPermTypes trong internal/perm/needs_test.go
const NO_PERM = ['wait', 'open', 'clipboard', 'http', 'system', 'waitUntil', 'window', 'app', 'webWait', 'webRead', 'webKey',
  'waitDownload', 'shell', 'osShortcut', 'sysInfo', 'process', 'zip', 'switch', 'counter', 'forEach', 'end', 'setVar', 'calc',
  'textMatch', 'textSplit', 'textClean', 'textNumber'];

describe('needsOf', () => {
  it.each(data.cases)('$name', (c) => {
    expect(needsOf(c.step as unknown as Step)).toEqual(c.want);
  });
  it('mọi loại node đã khai báo quyền', () => {
    const declared = new Set([...NO_PERM, ...data.cases.filter((c) => c.want.length).map((c) => c.step.type)]);
    const missing = Object.keys(STEP_LABEL).filter((t) => !declared.has(t));
    expect(missing).toEqual([]);
  });
  it('bỏ qua node tắt', () => {
    const steps = [{ type: 'click', enabled: false }, { type: 'screenshot', enabled: true }] as unknown as Step[];
    expect(needs({ steps })).toEqual(['screenRecording']);
  });
});

describe('missingOf', () => {
  const items = [{ id: 'accessibility', state: 'denied' }, { id: 'autoChrome', state: 'unknown' }, { id: 'screenRecording', state: 'granted' }];
  it('chỉ lấy quyền denied và nằm trong danh sách cần', () => {
    expect(missingOf(items, ['accessibility', 'autoChrome', 'screenRecording', 'notifications'])).toEqual(['accessibility']);
  });
  it('chưa tải trạng thái thì không báo thiếu', () => {
    expect(missingOf(null, ['accessibility'])).toEqual([]);
  });
});
