import { describe, expect, it } from 'vitest';
import { demoDataScript, demoRun } from '../demo/dataDemo';
import { buildRunTree, dataSources, layoutRunTree, lineage, MAX_ITERS, traceBack, TreeNode, visibleIters } from './runTree';
import type { StepResult } from '../types';

const sc = demoDataScript();
const shape = (list: TreeNode[]): unknown[] => list.map((n) => (n.children.length ? [n.kind, n.nodeId, shape(n.children)] : `${n.kind}:${n.nodeId}`));

describe('runTree', () => {
  it('buildRunTree: lượt lặp thành nhánh, "hết" ngay sau khối vòng', () => {
    const t = buildRunTree(demoRun(false), sc.steps);
    expect(t.map((n) => `${n.kind}:${n.nodeId}`)).toEqual(['step:s1', 'step:s2', 'step:s3', 'loop:s4', 'done:s4', 'step:s9', 'step:s10']);
    const loop = t[3];
    expect(loop.children.map((c) => c.iter)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shape(loop.children.slice(0, 2))).toEqual([['iter', 's4', ['step:s5', 'step:s6', 'step:s7', 'step:s8']], ['iter', 's4', ['step:s5', 'step:s6', 'step:s7']]]);
  });

  it('lỗi đánh dấu lên lượt và khối vòng chứa nó', () => {
    const t = buildRunTree(demoRun(true), sc.steps);
    const loop = t[3];
    expect(loop.fail).toBe(true);
    expect(loop.children.map((c) => !!c.fail)).toEqual([false, false, true, false, false, false]);
    expect(t.find((n) => n.nodeId === 's9')?.fail).toBe(true);
  });

  it('vòng lồng: Đếm bên ngoài, Lặp bên trong', () => {
    const steps = [{ id: 'c', type: 'counter' }, { id: 'f', type: 'forEach' }, { id: 't', type: 'type' }] as const;
    const r = (nodeId: string, port: string) => ({ nodeId, port, status: 'success' }) as StepResult;
    const res = [r('c', 'next'), r('f', 'item'), r('t', 'success'), r('f', 'done'), r('c', 'next'), r('f', 'item'), r('t', 'success'), r('f', 'done'), r('c', 'done')];
    expect(shape(buildRunTree(res, [...steps]))).toEqual([
      ['loop', 'c', [['iter', 'c', [['loop', 'f', [['iter', 'f', ['step:t']]]], 'done:f']], ['iter', 'c', [['loop', 'f', [['iter', 'f', ['step:t']]]], 'done:f']]]],
      'done:c',
    ]);
  });

  it('visibleIters: gộp lượt thừa, giữ lượt lỗi', () => {
    const g: TreeNode = { key: 'g', kind: 'loop', nodeId: 'f', children: Array.from({ length: 15 }, (_, i) => ({ key: `i${i}`, kind: 'iter', nodeId: 'f', iter: i + 1, children: [], fail: i === 13 })) };
    const v = visibleIters(g);
    expect(v.length).toBe(MAX_ITERS + 2);
    expect(v[MAX_ITERS].key).toBe('i13');
    expect(v[MAX_ITERS + 1]).toMatchObject({ kind: 'more', hidden: 4 });
  });

  it('layoutRunTree: lượt mở thành cột dưới node lặp, không chồng nhau', () => {
    const t = buildRunTree(demoRun(false), sc.steps);
    const open = new Set([t[3].children[0].key]);
    const { cards, links, W, H } = layoutRunTree(t, open);
    const by = new Map(cards.map((c) => [c.node.key, c]));
    const loop = by.get(t[3].key)!, it1 = by.get(t[3].children[0].key)!, n5 = by.get(t[3].children[0].children[0].key)!;
    expect(it1.y).toBeGreaterThan(loop.y);
    expect(n5.x).toBe(it1.x);
    expect(n5.y).toBeGreaterThan(it1.y);
    expect(cards.filter((c) => c.node.kind === 'iter').length).toBe(6);
    for (const a of cards) for (const b of cards) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y !== b.y).toBe(true);
    expect(links.filter((l) => l.kind === 'fan').length).toBe(6);
    expect(links.some((l) => l.kind === 'join' && l.to === t[4].key)).toBe(true);
    expect(Math.max(...cards.map((c) => c.x + c.w))).toBeLessThanOrEqual(W);
    expect(Math.max(...cards.map((c) => c.y))).toBeLessThan(H);
  });

  it('dataSources / traceBack / lineage: nguồn là lần chạy gần nhất của node trước đó', () => {
    const res = demoRun(false);
    const src = dataSources(res, sc.steps);
    const n5 = res.findIndex((r) => r.nodeId === 's5');
    const it1 = res.findIndex((r) => r.nodeId === 's4');
    expect(src[n5]).toEqual([{ slot: 'value', label: 'Giá trị', key: 'item.text', from: it1 }]);
    const n6 = res.findIndex((r) => r.nodeId === 's6');
    expect(traceBack(src, n6).map((c) => [res[c.index].ref, c.key])).toEqual([['n3', 'items'], ['n4', 'item.text'], ['n5', 'value'], ['n6', undefined]]);
    const l = lineage(src, n5);
    expect([...l.up].map((i) => res[i].ref).sort()).toEqual(['n3', 'n4']);
    expect([...l.down].map((i) => res[i].ref)).toEqual(['n6']);
  });
});
