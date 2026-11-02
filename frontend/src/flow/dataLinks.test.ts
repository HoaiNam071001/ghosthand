import { describe, expect, it } from 'vitest';
import { makeStep, type Edge, type Step } from '../types';
import { dataSlots, linkBlock, linkSlot, setSlot, unlinkSlot, usesOf, varRefs } from './dataLinks';

const st = (id: string, ref: string, patch: Partial<Step>) => makeStep({ id, ref, ...patch } as Step);
const e = (from: string, port: string, to: string): Edge => ({ id: `${from}-${port}`, from, port, to });

describe('dataLinks', () => {
  it('varRefs: biến node, bỏ vars / secret / last, cắt output.', () => {
    expect(varRefs('Đã chọn {{n4.output.count}} món · {{vars.x}} {{n2.status}} {{secret.k}} {{last.port}}'))
      .toEqual([{ ref: 'n4', key: 'count' }, { ref: 'n2', key: 'status' }]);
  });

  it('dataSlots: tên trường kiểu Go, nhãn, điểm số vẫn có ô X / Y', () => {
    const click = st('c', 'n8', { type: 'click', points: [{ x: 1, y: 2 }] });
    expect(dataSlots(click).map((s) => [s.name, s.label, s.num])).toEqual([['points[0].xVar', 'X', true], ['points[0].yVar', 'Y', true]]);
    const t = st('t', 'n5', { type: 'textNumber', value: '{{n4.output.item.text}}' });
    expect(dataSlots(t)).toEqual([{ name: 'value', label: 'Giá trị', text: '{{n4.output.item.text}}', refs: [{ ref: 'n4', key: 'item.text' }], num: false }]);
    const iff = st('i', 'n7', { type: 'if', cond: { kind: 'value', left: '{{n6.output.value}}', op: 'eq', right: 'true' } });
    expect(dataSlots(iff).map((s) => s.name)).toEqual(['cond.left', 'cond.right']);
  });

  it('linkSlot: ô số thay, ô chữ có nội dung thêm vào cuối, toạ độ số chuyển sang biến', () => {
    const typ = st('t', 'n2', { type: 'type', text: 'Xin chào ' });
    expect(linkSlot(typ, 'text', 'n1', 'value').text).toBe('Xin chào {{n1.output.value}}');
    const click = linkSlot(st('c', 'n8', { type: 'click', points: [{ x: 1, y: 2 }] }), 'points[0].xVar', 'n4', 'item.x');
    expect(click.points[0]).toEqual({ x: 1, y: 2, xVar: '{{n4.output.item.x}}' });
    expect(unlinkSlot(typ, 'text', 'n1').text).toBe('Xin chào');
    expect(unlinkSlot(linkSlot(typ, 'text', 'n1', 'value'), 'text', 'n1', 'value').text).toBe('Xin chào');
  });

  it('setSlot không sửa node cũ', () => {
    const iff = st('i', 'n7', { type: 'if', cond: { kind: 'value', left: 'a', op: 'eq', right: 'b' } });
    const out = setSlot(iff, 'cond.left', 'x');
    expect(out.cond?.left).toBe('x');
    expect(iff.cond?.left).toBe('a');
  });

  it('linkBlock: chỉ nối node chạy trước → node chạy sau', () => {
    const sc = { start: 'a', steps: [st('a', 'n1', { type: 'wait' }), st('b', 'n2', { type: 'wait' }), st('c', 'n3', { type: 'wait' })], edges: [e('a', 'success', 'b'), e('b', 'success', 'c')] };
    expect(linkBlock(sc, 'a', 'c')).toBeNull();
    expect(linkBlock(sc, 'c', 'a')).toMatch(/chạy trước/);
    expect(linkBlock(sc, 'a', 'a')).toMatch(/chính nó/);
  });

  it('usesOf: nơi dùng output', () => {
    const steps = [st('t', 'n5', { type: 'textNumber', value: '{{n4.output.item.text}}' }), st('c', 'n8', { type: 'click', points: [{ x: 0, y: 0, xVar: '{{n4.output.item.x}}', yVar: '{{n4.output.item.y}}' }] })];
    expect(usesOf(steps, 'n4').map((u) => `${u.stepId}:${u.slot}:${u.key}`)).toEqual(['t:value:item.text', 'c:points[0].xVar:item.x', 'c:points[0].yVar:item.y']);
  });
});
