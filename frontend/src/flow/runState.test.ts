import { describe, expect, it } from 'vitest';
import type { Progress } from '../engineStore';
import { runTitle } from './runState';

const base: Progress = { loop: 1, loops: 1, step: 1, total: 2, clicks: 0, elapsedMs: 0, paused: false };

describe('runTitle', () => {
  it('đang thao tác / đang chờ chữ còn mấy giây', () => {
    expect(runTitle(base, 0, 0)).toBe('Đang thao tác – đừng chạm chuột');
    const w = { ...base, wait: { kind: 'text' as const, what: 'Sent', elapsedMs: 0, timeoutMs: 10_000, best: 0 } };
    expect(runTitle(w, 2_500, 0)).toBe('Đang chờ chữ "Sent" · còn 8 s');
    expect(runTitle({ ...w, wait: { ...w.wait, kind: 'image', what: undefined } }, 0, 0)).toBe('Đang chờ ảnh · còn 10 s');
    expect(runTitle({ ...w, wait: { ...w.wait, kind: 'delay', what: undefined, timeoutMs: 4_000 } }, 1_000, 0)).toBe('Đang nghỉ giữa các bước · còn 3 s');
  });
  it('đụng chuột: đếm ngược tự chạy tiếp / tắt tự chạy', () => {
    expect(runTitle({ ...base, paused: true, pausedBy: 'touch', resumeAt: 10_000 }, 0, 6_100)).toBe('Bạn vừa đụng chuột · tự chạy tiếp sau 4 s');
    expect(runTitle({ ...base, paused: true, pausedBy: 'touch' }, 0, 0)).toBe('Bạn vừa đụng chuột – bấm ▶ để chạy tiếp');
  });
  it('debug / nút Tạm dừng', () => {
    expect(runTitle({ ...base, paused: true, break: 'step' }, 0, 0)).toBe('Dừng trước node kế');
    expect(runTitle({ ...base, paused: true }, 0, 0)).toBe('Tạm dừng');
  });
});
