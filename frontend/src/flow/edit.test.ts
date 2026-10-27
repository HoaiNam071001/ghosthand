import { describe, expect, it } from 'vitest';
import { addConnected, chain, connect, copyNodes, pasteNodes, disconnect, Edge, flowTail, insertNode, nextRef, pruneEdges, reachable, removeNode } from './edit';
import { makeStep } from '../types';

const e = (id: string, from: string, port: string, to: string): Edge => ({ id, from, port, to });

describe('flowEdit', () => {
  it('connect: mỗi cổng một cạnh, nối lại thì thay, giữ id', () => {
    let edges = connect([], 'a', 'success', 'b');
    expect(edges).toHaveLength(1);
    const id = edges[0].id;
    edges = connect(edges, 'a', 'success', 'c');
    expect(edges).toEqual([{ id, from: 'a', port: 'success', to: 'c' }]);
    edges = connect(edges, 'a', 'fail', 'b');
    expect(edges).toHaveLength(2);
  });

  it('connect: không nối node vào chính nó', () => {
    expect(connect([], 'a', 'success', 'a')).toEqual([]);
  });

  it('disconnect chỉ bỏ cạnh của đúng cổng', () => {
    const edges = [e('1', 'a', 'success', 'b'), e('2', 'a', 'fail', 'c')];
    expect(disconnect(edges, 'a', 'fail')).toEqual([edges[0]]);
  });

  it('removeNode bỏ cạnh vào / ra, chuyển start', () => {
    const g = { nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], edges: [e('1', 'a', 'success', 'b'), e('2', 'b', 'success', 'c')], start: 'a' };
    const r = removeNode(g, 'b');
    expect(r.edges).toEqual([]);
    expect(removeNode(g, 'a').start).toBe('b');
  });

  it('addConnected chèn vào giữa cạnh có sẵn', () => {
    const g = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [e('1', 'a', 'success', 'b')] };
    const r = addConnected(g, { id: 'n' }, 'a', 'success', 'success');
    expect(r.edges.map((x) => `${x.from}.${x.port}>${x.to}`).sort()).toEqual(['a.success>n', 'n.success>b']);
    // cổng chưa nối: chỉ thêm một cạnh
    const r2 = addConnected(g, { id: 'm' }, 'b', 'fail', 'success');
    expect(r2.edges.map((x) => `${x.from}.${x.port}>${x.to}`).sort()).toEqual(['a.success>b', 'b.fail>m']);
  });

  it('reachable đi theo cả vòng lặp', () => {
    const edges = [e('1', 'a', 'success', 'b'), e('2', 'b', 'fail', 'a'), e('3', 'c', 'success', 'a')];
    expect([...reachable(edges, 'a')].sort()).toEqual(['a', 'b']);
  });
});

describe('flowEdit – kịch bản', () => {
  const node = (id: string, ref = '') => makeStep({ id, ref, type: 'wait' });

  it('nextRef lấy số nhỏ nhất chưa dùng', () => {
    expect(nextRef([node('a', 'n1'), node('b', 'n3')])).toBe('n2');
    expect(nextRef([])).toBe('n1');
  });

  it('insertNode: node đầu thành start; nối từ cổng, chèn giữa', () => {
    let g = insertNode({ steps: [], edges: [], start: '' }, node('a'), null);
    expect(g.start).toBe('a');
    g = insertNode(g, node('b'), { from: 'a', port: 'success' });
    g = insertNode(g, node('c'), { from: 'a', port: 'success' });
    expect(g.edges.map((e) => `${e.from}.${e.port}>${e.to}`).sort()).toEqual(['a.success>c', 'c.success>b']);
    // start trỏ node đã xoá → node mới thành start
    expect(insertNode({ steps: [node('x')], edges: [], start: 'gone' }, node('y'), null).start).toBe('y');
  });

  it('flowTail: node cuối chuỗi còn cổng trống, bỏ node rời; flow rỗng → null', () => {
    const steps = [node('a'), node('b'), node('lone')];
    expect(flowTail({ steps, edges: chain(['a', 'b']), start: 'a' })).toEqual({ from: 'b', port: 'success' });
    expect(flowTail({ steps: [], edges: [], start: '' })).toBeNull();
    // vòng kín: không còn cổng đầu trống → null (node mới đứng riêng)
    expect(flowTail({ steps: [node('a'), node('b')], edges: [...chain(['a', 'b']), e('x', 'b', 'success', 'a')], start: 'a' })).toBeNull();
  });

  it('pruneEdges bỏ cạnh của cổng không còn / node không còn', () => {
    const steps = [node('a'), node('b')];
    const edges = [e('1', 'a', 'success', 'b'), e('2', 'a', 'true', 'b'), e('3', 'a', 'fail', 'x')];
    expect(pruneEdges(steps, edges).map((x) => x.id)).toEqual(['1']);
  });

  it('chain nối success theo thứ tự', () => {
    expect(chain(['a', 'b', 'c']).map((x) => `${x.from}>${x.to}`)).toEqual(['a>b', 'b>c']);
  });

  it('copy / paste: chỉ cạnh bên trong, id + mã mới, đổi imageFrom và biến trỏ node đã chép', () => {
    const steps = [
      makeStep({ id: 'a', ref: 'n1', type: 'waitImage', pos: { x: 0, y: 0 } }),
      makeStep({ id: 'b', ref: 'n2', type: 'clickImage', imageSource: 'node', imageFrom: 'a' }),
      makeStep({ id: 'c', ref: 'n3', type: 'type', text: '{{n1.output.text}} {{n9.status}}' }),
    ];
    const g = { steps, edges: chain(['a', 'b', 'c']), start: 'a' };
    const clip = copyNodes(g, ['a', 'b', 'c'])!;
    expect(copyNodes(g, ['b', 'c'])!.edges).toHaveLength(1);
    let i = 0;
    const r = pasteNodes(g, clip, () => `p${i++}`, { x: 40, y: 40 });
    expect(r.ids).toEqual(['p0', 'p1', 'p2']);
    const [pa, pb, pc] = r.steps.slice(3);
    expect([pa.ref, pb.ref, pc.ref]).toEqual(['n4', 'n5', 'n6']);
    expect(pa.pos).toEqual({ x: 40, y: 40 });
    expect(pb.imageFrom).toBe('p0');
    expect(pc.text).toBe('{{n4.output.text}} {{n9.status}}');
    expect(r.edges.slice(2).map((x) => `${x.from}>${x.to}`)).toEqual(['p0>p1', 'p1>p2']);
    expect(r.start).toBe('a');
    expect(steps[1].imageFrom).toBe('a'); // không sửa bản gốc
  });
});
