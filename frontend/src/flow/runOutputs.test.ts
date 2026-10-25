import { describe, expect, it } from 'vitest';
import type { RunRow } from '../components/flow/model';
import { allOutputsJson, outputBlocks, valueText } from './runOutputs';

const nodes = [{ id: 'a', ref: 'n1', title: 'Đọc chữ' }, { id: 'b', ref: 'n2', title: 'Click' }];
const row = (nodeId: string, loop: number, output?: Record<string, unknown>): RunRow =>
  ({ nodeId, loop, at: '10:00:00', status: 'success', output });

describe('outputBlocks', () => {
  it('bỏ node không có output', () => {
    const b = outputBlocks([row('a', 1, { text: 'xin chào' }), row('b', 1)], nodes);
    expect(b.map((x) => x.key)).toEqual(['n1']);
  });
  it('nhiều vòng: khoá kèm số vòng', () => {
    const b = outputBlocks([row('a', 1, { n: 1 }), row('a', 2, { n: 2 })], nodes);
    expect(b.map((x) => x.key)).toEqual(['n1#1', 'n1#2']);
  });
  it('cùng node chạy lại trong một vòng (thử lại) không đè khoá', () => {
    const b = outputBlocks([row('a', 1, { n: 1 }), row('a', 1, { n: 2 })], nodes);
    expect(b.map((x) => x.key)).toEqual(['n1', 'n1.2']);
  });
  it('node đã xoá vẫn hiện', () => {
    expect(outputBlocks([row('z', 1, { x: 1 })], nodes)[0].title).toBe('node đã xoá');
  });
  it('JSON gộp theo khoá', () => {
    expect(JSON.parse(allOutputsJson(outputBlocks([row('a', 1, { text: 'a' })], nodes)))).toEqual({ n1: { text: 'a' } });
  });
});

describe('valueText', () => {
  it('chữ nguyên văn, số / mảng thành JSON', () => {
    expect(valueText('abc')).toBe('abc');
    expect(valueText(5)).toBe('5');
    expect(valueText([1, 2])).toContain('1');
  });
});
