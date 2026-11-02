import { describe, expect, it } from 'vitest';
import { makeStep, type Step, type StepResult } from '../types';
import { dataEdges, dataPins } from './dataView';

const st = (id: string, ref: string, patch: Partial<Step>) => makeStep({ id, ref, ...patch } as Step);
const each = st('f', 'n4', { type: 'forEach', value: '{{n3.output.items}}' });
const num = st('t', 'n5', { type: 'textNumber', value: '{{n4.output.item.text}}' });
const click = st('c', 'n8', { type: 'click', points: [{ x: 0, y: 0, xVar: '{{n4.output.item.x}}', yVar: '{{n4.output.item.y}}' }] });
const steps = [each, num, click];

describe('dataView', () => {
  it('VÀO: nguồn khi chưa chạy, giá trị đã thay khi có lần chạy', () => {
    expect(dataPins(num, steps).ins).toEqual([{ id: 'value', label: 'Giá trị', value: 'n4.item.text', ran: false, linked: true, src: 'n4', tip: '{{n4.output.item.text}}' }]);
    const last = { input: { value: 'THÊM 15.000 đ' }, output: { value: 15000 } } as unknown as StepResult;
    const p = dataPins(num, steps, last);
    expect(p.ins[0]).toMatchObject({ value: 'THÊM 15.000 đ', ran: true });
    expect(p.outs.find((o) => o.id === 'value')).toMatchObject({ value: '15000', ran: true });
  });

  it('RA: khoá đang được dùng lên đầu, output object tách khoá con, ẩn output chung', () => {
    const outs = dataPins(each, steps).outs.map((o) => [o.id, o.linked]);
    expect(outs.slice(0, 3)).toEqual([['item.text', true], ['item.x', true], ['item.y', true]]);
    expect(outs.map((o) => o[0])).not.toContain('startedAt');
    const last = { output: { item: { ten: 'An', tuoi: 3 }, index: 1, count: 2 } } as unknown as StepResult;
    expect(dataPins(each, [each], last).outs.map((o) => o.id)).toEqual(['item.ten', 'item.tuoi', 'index', 'count']);
  });

  it('dataEdges: mỗi biến một dây, nguồn theo ref', () => {
    expect(dataEdges(steps).map((e) => `${e.from}.${e.key}>${e.to}:${e.slot}`)).toEqual(['f.item.text>t:value', 'f.item.x>c:points[0].xVar', 'f.item.y>c:points[0].yVar']);
  });
});
