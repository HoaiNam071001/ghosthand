import { describe, expect, it } from 'vitest';
import { demoDataScript, demoRun } from '../demo/dataDemo';
import { buildRunTree, dataSources } from './runTree';
import { cardText, dataPath, inPills, outPills } from './runTreeView';
import { runRows } from './run';

const sc = demoDataScript();

describe('runTreeView', () => {
  const res = demoRun(true);
  const tree = buildRunTree(res, sc.steps);
  const rows = runRows(res, sc.steps, sc.edges);
  const src = dataSources(res, sc.steps);

  it('cardText: lượt ghi phần tử + lỗi bên trong, khối vòng đếm lượt lỗi', () => {
    const loop = tree[3];
    expect(cardText(loop, res, sc.steps, rows)).toMatchObject({ sub: '6 lượt · 1 lượt lỗi', subFail: true });
    expect(cardText(loop.children[2], res, sc.steps, rows)).toMatchObject({ title: 'Lượt 3 · THÊM 2O.OOO đ', sub: 'lỗi ở n5', subFail: true });
    expect(cardText(loop.children[0].children[0], res, sc.steps, rows).sub).toBe('Thành công → n6');
  });

  it('pill: VÀO là giá trị đã thay, RA là output được dùng', () => {
    const n5 = res.findIndex((r) => r.nodeId === 's5');
    expect(inPills(n5, res, src)).toEqual([{ id: 'value', label: 'Giá trị', value: 'THÊM 15.000 đ' }]);
    expect(outPills(n5, res, src)).toEqual([{ id: 'value', label: 'value', value: '15000' }]);
  });

  it('dataPath: vướng thẻ thì đi làn bên phải', () => {
    expect(dataPath({ x: 10, y: 0 }, { x: 10, y: 100 }, [])).toMatch(/^M10 0 C/);
    expect(dataPath({ x: 10, y: 0 }, { x: 10, y: 300 }, [{ x: 0, y: 100, w: 200, h: 50 }])).toContain('230');
  });
});
