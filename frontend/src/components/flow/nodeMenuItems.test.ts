import { describe, expect, it, vi } from 'vitest';
import { nodeMenuItems, NodeMenuCtx } from './nodeMenuItems';
import type { StepResult } from '../../types';

const ok = { nodeId: 'a', status: 'success' } as StepResult;
const ctx = (over: Partial<NodeMenuCtx> = {}): NodeMenuCtx => ({
  id: 'a', ref: 'n1', running: false, picked: [], pinned: false, run: vi.fn(), pin: vi.fn(), unpin: vi.fn(), ...over,
});
const by = (items: ReturnType<typeof nodeMenuItems>, start: string) => items.find((i) => i.label.startsWith(start))!;

describe('nodeMenuItems', () => {
  it('chạy đến đây gửi stopAt', () => {
    const c = ctx();
    by(nodeMenuItems(c), 'Chạy đến').onClick!();
    expect(c.run).toHaveBeenCalledWith({ stopAt: 'a' });
  });
  it('cụm chỉ bật khi chọn ≥ 2 node có node này', () => {
    expect(by(nodeMenuItems(ctx({ picked: ['a'] })), 'Chạy cụm').disabled).toBe(true);
    const c = ctx({ picked: ['a', 'b'] });
    const it = by(nodeMenuItems(c), 'Chạy cụm');
    expect(it.disabled).toBeFalsy();
    it.onClick!();
    expect(c.run).toHaveBeenCalledWith({ nodes: ['a', 'b'] });
  });
  it('chạy tiếp cần seedRun', () => {
    expect(by(nodeMenuItems(ctx()), 'Chạy tiếp').disabled).toBe(true);
    const c = ctx({ seedRun: 'r1' });
    by(nodeMenuItems(c), 'Chạy tiếp').onClick!();
    expect(c.run).toHaveBeenCalledWith({ from: 'a', seedRun: 'r1' });
  });
  it('ghim cần kết quả thành công; đã ghim thì bỏ ghim', () => {
    expect(by(nodeMenuItems(ctx()), 'Ghim').disabled).toBe(true);
    expect(by(nodeMenuItems(ctx({ last: { ...ok, status: 'fail' } })), 'Ghim').disabled).toBe(true);
    const c = ctx({ last: ok });
    by(nodeMenuItems(c), 'Ghim').onClick!();
    expect(c.pin).toHaveBeenCalledWith(ok);
    const d = ctx({ pinned: true });
    by(nodeMenuItems(d), 'Bỏ ghim').onClick!();
    expect(d.unpin).toHaveBeenCalledWith('a');
  });
});
