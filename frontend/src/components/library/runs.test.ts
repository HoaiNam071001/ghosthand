import { describe, expect, it } from 'vitest';
import { runStatsParts, type RunStats } from './runs';

describe('runStatsParts', () => {
  const st: RunStats = { runs: 9, success: 2, fail: 6, stopped: 1, successPct: 25, avgMs: 4250, topFails: [{ node: 's3', count: 2 }, { node: 'x', count: 1 }] };
  it('đủ các mẩu', () => {
    expect(runStatsParts(st, (id) => (id === 's3' ? 'n3 Click' : undefined))).toEqual(['9 lần chạy', '25 % thành công', 'trung bình 4,3 s', 'hay lỗi: n3 Click (2), node đã xoá (1)']);
  });
  it('chỉ có lần bị dừng / chưa chạy', () => {
    expect(runStatsParts({ ...st, runs: 1, success: 0, fail: 0, stopped: 1, successPct: 0, avgMs: 0, topFails: [] }, () => '')).toEqual(['1 lần chạy']);
    expect(runStatsParts({ ...st, runs: 0 }, () => '')).toEqual([]);
  });
});
