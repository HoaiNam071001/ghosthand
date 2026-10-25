import { describe, expect, it } from 'vitest';
import { addGroup, dropMembers, groupViews, GROUP_CARD_H, GROUP_HEAD, GROUP_PAD, nextGroupName, routeEdges, shiftPositions } from './groups';
import { nodeHeight, NODE_W } from '../components/flow/model';

const g = (id: string, members: string[], collapsed = false) => ({ id, name: id, members, collapsed });

describe('nhóm node', () => {
  it('nhóm mới lấy node từ nhóm cũ; nhóm cũ hết node thì mất', () => {
    const out = addGroup([g('g1', ['a', 'b']), g('g2', ['c'])], ['b', 'c'], { id: 'g3', name: 'Mới' });
    expect(out.map((x) => [x.id, x.members])).toEqual([['g1', ['a']], ['g3', ['b', 'c']]]);
  });
  it('xoá node khỏi nhóm', () => {
    expect(dropMembers([g('g1', ['a'])], ['a'])).toEqual([]);
    expect(dropMembers(undefined, ['a'])).toEqual([]);
  });
  it('tên nhóm mới không trùng', () => {
    expect(nextGroupName([{ ...g('g1', ['a']), name: 'Nhóm 1' }, { ...g('g2', ['b']), name: 'Nhóm 3' }])).toBe('Nhóm 2');
  });
  it('khung bao các node thành viên', () => {
    const nodes = [{ id: 'a', ports: ['success', 'fail'] }, { id: 'b', ports: ['success', 'fail'] }];
    const [v] = groupViews([g('g1', ['a', 'b'])], { a: { x: 100, y: 50 }, b: { x: 400, y: 200 } }, nodes);
    const h = nodeHeight(['success', 'fail']);
    expect(v.box).toEqual({ x: 100 - GROUP_PAD, y: 50 - GROUP_PAD - GROUP_HEAD, w: 300 + NODE_W + 2 * GROUP_PAD, h: 150 + h + 2 * GROUP_PAD + GROUP_HEAD });
  });
  it('nhóm thu gọn thành thẻ ở góc trên trái, nhóm không có vị trí thì bỏ', () => {
    const nodes = [{ id: 'a', ports: ['success'] }];
    const vs = groupViews([g('g1', ['a'], true), g('g2', ['zz'])], { a: { x: 10, y: 20 } }, nodes);
    expect(vs).toHaveLength(1);
    expect(vs[0].box).toEqual({ x: 10, y: 20, w: NODE_W, h: GROUP_CARD_H });
  });
  it('cạnh qua nhóm thu gọn: ẩn cạnh nội bộ, đổi đầu mút', () => {
    const edges = [
      { id: 'e1', from: 'x', port: 'success', to: 'a' },
      { id: 'e2', from: 'a', port: 'success', to: 'b' },
      { id: 'e3', from: 'b', port: 'success', to: 'y' },
    ];
    const out = routeEdges(edges, [g('g1', ['a', 'b'], true)]);
    expect(out.map((e) => [e.id, e.from, e.to])).toEqual([['e1', 'x', 'g1'], ['e3', 'g1', 'y']]);
    expect(routeEdges(edges, [g('g1', ['a', 'b'])])).toBe(edges);
  });
  it('dời cụm', () => {
    expect(shiftPositions({ a: { x: 1, y: 2 }, b: { x: 5, y: 5 } }, ['a', 'q'], 10, -2)).toEqual({ a: { x: 11, y: 0 } });
  });
});

describe('groupColor', () => {
  it('chỉ nhận tên nhóm node hợp lệ', async () => {
    const { groupColor } = await import('./groups');
    expect(groupColor('wait')).toBe('wait');
    expect(groupColor('red')).toBeUndefined();
    expect(groupColor(undefined)).toBeUndefined();
  });
});
