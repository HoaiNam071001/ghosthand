// Node điều khiển (bước 20 F3): thêm node, sửa node (xoá case → bỏ cạnh của cổng case đó), sửa điều kiện lồng nhau
// (khoanh ảnh / chọn điểm trên overlay). Phép trên điều kiện ở flow/cond.ts.
import { tr } from '../i18n/lang';
import { CondAt, emptyCond, newCase, patchCond } from '../flow/cond';
import { pruneEdges } from '../flow/edit';
import { Cond, ControlType, makeStep, Step } from '../types';
import { getEditor, updateScript } from './editor';
import { clearInsertAt, insertNode, newId } from './nodes';

const stepById = (id: string) => getEditor().script.steps.find((s) => s.id === id);

// Giá trị mặc định – giống NewStep (model.go).
const DEFAULTS: Record<ControlType, () => Partial<Step>> = {
  if: () => ({ cond: emptyCond('text'), intervalMs: 250 }),
  switch: () => ({ value: '', cases: [newCase([], false), newCase([{ key: 'c1' }], false)] }),
  switchScreen: () => ({ cases: [newCase([], true), newCase([{ key: 'c1' }], true)], timeoutMs: 3000, intervalMs: 250 }),
  counter: () => ({ max: 10 }),
  forEach: () => ({ value: '' }),
  end: () => ({ endStatus: 'success', message: '' }),
  setVar: () => ({ varName: 'ten', varOp: 'set', value: '' }),
  calc: () => ({ value: '' }),
  textMatch: () => ({ value: '' }),
  textSplit: () => ({ value: '' }),
  textClean: () => ({ value: '', trim: true }),
  textNumber: () => ({ value: '' }),
};

export function addControl(type: ControlType) {
  insertNode(makeStep({ id: newId(), type, clicks: 0, delayAfter: 0, ...DEFAULTS[type]() }), (ref) => tr('ctl2.added', { r: ref }));
  clearInsertAt();
}

// Sửa node điều khiển, bỏ cạnh của cổng không còn (xoá case).
export function updateControl(id: string, patch: Partial<Step>) {
  const sc = getEditor().script;
  const steps = sc.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  updateScript({ steps, edges: pruneEdges(steps, sc.edges) });
}

export function updateCond(id: string, at: CondAt, f: (c: Cond) => Cond) {
  const s = stepById(id);
  if (s) updateControl(id, patchCond(s, at, f));
}
