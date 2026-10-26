// Input của kịch bản (bước 21b) – thao tác trên store: ghim trường, tạo / sửa / xoá input, tính bước nào dùng input.
// Giá trị thật áp lúc chạy ở Go (script.ResolveInputs, internal/script/inputs.go). Trường đã ghim luôn giữ bằng giá trị mặc định của input,
// nên Xem trước / overlay không cần resolve vẫn đúng với lần chạy dùng mặc định.
import { usesVar } from './anchor';
import { flowOrder } from './flow/model';
import { getEditor, updateScript } from './store';
import { Cond, InputType, InputValue, KV, PinField, Script, ScriptInput, Step, stepLabel } from './types';
import { InputView, isValidKey, splitVars, varsIn } from './components/inputs/model';
import type { RunSection } from './components/inputs/RunDialog';

const PIN: Record<PinField, { key: string; label: string; type: InputType; min?: number }> = {
  clicks: { key: 'clicks', label: 'Số click', type: 'number', min: 1 },
  clickInterval: { key: 'click_interval', label: 'Giữa các click', type: 'ms' },
  holdMs: { key: 'hold_ms', label: 'Giữ chuột trong', type: 'ms' },
  dragMs: { key: 'drag_ms', label: 'Thời gian kéo', type: 'ms' },
  delayAfter: { key: 'delay', label: 'Chờ sau bước', type: 'ms' },
  jitterMs: { key: 'jitter_ms', label: 'Ngẫu nhiên thời gian', type: 'ms' },
  jitterPx: { key: 'jitter_px', label: 'Ngẫu nhiên vị trí', type: 'number' },
  amount: { key: 'scroll', label: 'Số nấc cuộn', type: 'number', min: 1 },
  timeoutMs: { key: 'timeout', label: 'Chờ tối đa', type: 'ms', min: 1 },
  threshold: { key: 'threshold', label: 'Độ khớp tối thiểu (%)', type: 'number', min: 1 },
  enabled: { key: 'enabled', label: 'Bật bước', type: 'bool' },
};

// Kiểu input ghim được vào trường (khớp inputKind trong internal/script/inputs.go).
export const kindOf = (t: InputType) => (t === 'number' || t === 'ms' ? 'int' : t === 'bool' ? 'bool' : 'string');
export const fieldKind = (f: PinField) => (f === 'enabled' ? 'bool' : 'int');

const inputsOf = (sc: Script) => sc.inputs ?? [];

// Ô chữ nhận {{biến}} của node – khớp VarFields (internal/script/varfields.go): gõ chữ, mở, chữ cần tìm, điều kiện / case / giá trị của
// node điều khiển, toạ độ điểm dùng biến (F5b), trường số lấy từ biến (F5c). mapVarText trả node mới với từng ô qua f
// (không sửa node cũ).
export function mapVarText(s: Step, f: (t: string) => string): Step {
  const out = POINT_TYPES.includes(s.type) && s.points.some(usesVar)
    ? mapFieldText({ ...s, points: s.points.map((p, i) => (usesVar(p) && !(i === 0 && s.type === 'drag' && s.dragFromPrev) // A "từ điểm trước" không dùng
      ? { ...p, xVar: f(p.xVar ?? ''), yVar: f(p.yVar ?? '') } : p)) }, f)
    : mapFieldText(s, f);
  return out.numVars?.length ? { ...out, numVars: out.numVars.map((v) => ({ ...v, expr: f(v.expr) })) } : out;
}
// Loại node có điểm nhận toạ độ từ biến – khớp hasPoints (varfields.go).
const POINT_TYPES: Step['type'][] = ['click', 'double', 'hold', 'drag', 'scroll', 'waitPixel', 'path'];

function mapFieldText(step: Step, f: (t: string) => string): Step {
  // cửa sổ đích của công tắc chỉ-thao-tác-trong-cửa-sổ (khớp VarFields Go)
  const s: Step = step.onlyInWindow ? { ...step, winApp: step.winApp && f(step.winApp), winTitle: step.winTitle && f(step.winTitle) } : step;
  const cond = (c: Cond): Cond =>
    c.kind === 'text' ? { ...c, findText: f(c.findText ?? '') }
      : c.kind === 'element' ? { ...c, selectors: c.selectors?.map(f), elementApp: c.elementApp && f(c.elementApp) }
      : c.kind === 'value' ? { ...c, left: f(c.left ?? ''), right: f(c.right ?? '') }
      : c.kind === 'all' || c.kind === 'any' ? { ...c, conds: (c.conds ?? []).map(cond) } : c;
  switch (s.type) {
    case 'type': return { ...s, text: f(s.text) };
    case 'open': return { ...s, target: f(s.target ?? '') };
    case 'waitUntil': return { ...s, at: f(s.at ?? '') };
    case 'file': return s.fileOp === 'emptyTrash' ? s : {
      ...s, filePath: f(s.filePath ?? ''),
      ...(s.fileOp === 'row' ? { cells: s.cells?.map(f), sheet: s.sheet && f(s.sheet) } : {}),
      ...(s.fileOp === 'trash' ? { filePattern: f(s.filePattern ?? '') } : {}),
      ...(!s.fileOp ? { text: f(s.text) } : {}),
    };
    case 'http': {
      const kv = (rows?: KV[]) => rows?.map((r) => ({ ...r, value: f(r.value) }));
      return { ...s, url: f(s.url ?? ''), query: kv(s.query), headers: kv(s.headers), form: s.bodyType === 'form' ? kv(s.form) : s.form,
        body: s.bodyType === 'json' || s.bodyType === 'text' ? f(s.body ?? '') : s.body };
    }
    case 'app': return { ...s, appName: s.appName && f(s.appName) };
    case 'browserGo': return { ...s, tab: s.tab && f(s.tab), url: s.url && f(s.url) };
    case 'savePdf': return { ...s, tab: s.tab && f(s.tab), filePath: s.filePath && f(s.filePath) };
    case 'browserNorm': return { ...s, tab: s.tab && f(s.tab) };
    case 'browserTab': return { ...s, tab: s.tab && f(s.tab), ...(s.tabOp === 'new' ? { url: s.url && f(s.url) } : {}) };
    case 'window': return { ...s, winApp: s.winApp && f(s.winApp), winTitle: s.winTitle && f(s.winTitle) };
    case 'clipboard': return s.clipOp === 'write' ? { ...s, text: f(s.text) } : s.clipOp === 'image' ? { ...s, filePath: f(s.filePath ?? '') } : s;
    case 'screenshot': return { ...s, saveDir: s.saveDir && f(s.saveDir), fileName: s.fileName && f(s.fileName) };
    case 'waitImage': case 'clickImage': case 'findAll': return s.findBy === 'text' ? { ...s, findText: f(s.findText ?? '') }
      : s.findBy === 'element' ? { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) } : s;
    case 'readDocument':
    case 'pageText': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'elementAction': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp), text: f(s.text) };
    case 'waitUIEvent': return { ...s, winApp: s.winApp && f(s.winApp), winTitle: s.winTitle && f(s.winTitle), selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'display': return { ...s, displayValue: s.displayValue && f(s.displayValue) };
    case 'notify': return { ...s, notifyTitle: s.notifyTitle && f(s.notifyTitle), text: f(s.text) };
    case 'zip': return { ...s, filePath: s.filePath && f(s.filePath), filePattern: s.filePattern && f(s.filePattern), zipTo: s.zipTo && f(s.zipTo) };
    case 'inputSource': return { ...s, inputLayout: s.inputLayout && f(s.inputLayout), inputHotkey: s.inputHotkey && f(s.inputHotkey) };
    case 'process': return { ...s, procName: s.procName && f(s.procName) };
    case 'sysInfo': return { ...s, filePath: s.filePath && f(s.filePath) };
    case 'osShortcut': return { ...s, shortcutName: s.shortcutName && f(s.shortcutName), text: f(s.text) };
    case 'shell': return { ...s, filePath: s.filePath && f(s.filePath), shellEnv: s.shellEnv?.map((kv) => ({ ...kv, value: f(kv.value) })) }; // script không nhận biến
    case 'waitDownload': return { ...s, filePath: s.filePath && f(s.filePath), filePattern: s.filePattern && f(s.filePattern) };
    case 'readTable': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp), filePath: s.filePath && f(s.filePath) };
    case 'elementRead': return s.findBy === 'text' ? { ...s, findText: f(s.findText ?? '') }
      : { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'webWait': case 'webClick': case 'webRead': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab) };
    case 'webType': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab), text: f(s.text) };
    case 'webKey': return { ...s, tab: s.tab && f(s.tab) };
    case 'webScroll': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab),
      scrollIn: s.scrollMode === 'until' ? s.scrollIn?.map(f) : s.scrollIn };
    case 'if': return s.cond ? { ...s, cond: cond(s.cond) } : s;
    case 'switch': return { ...s, value: f(s.value ?? ''), cases: s.cases?.map((c) => ({ ...c, match: f(c.match ?? '') })) };
    case 'switchScreen': return { ...s, cases: s.cases?.map((c) => (c.cond ? { ...c, cond: cond(c.cond) } : c)) };
    case 'end': return { ...s, message: f(s.message ?? '') };
    case 'setVar': case 'calc': case 'textSplit': case 'textNumber': return { ...s, value: f(s.value ?? '') };
    case 'textMatch': return { ...s, value: f(s.value ?? ''), pattern: s.pattern && f(s.pattern) };
    case 'textClean': return { ...s, value: f(s.value ?? ''), replaceFrom: s.replaceFrom && f(s.replaceFrom), replaceTo: s.replaceTo && f(s.replaceTo) };
    case 'forEach': return s.listFrom === 'file' ? { ...s, filePath: f(s.filePath ?? ''), sheet: s.sheet && f(s.sheet) } : { ...s, value: f(s.value ?? '') };
    default: return s;
  }
}
// Gộp các ô chữ nhận biến của node (tìm {{key}} đang dùng).
export const varText = (s: Step) => {
  const parts: string[] = [];
  mapVarText(s, (t) => (parts.push(t), t));
  return parts.join('\n');
};
const setInputs = (inputs: ScriptInput[]) => updateScript({ inputs: inputs.length ? inputs : undefined });
// Mã node (n2) hiện cạnh input / trong form Chạy
const stepNo = (sc: Script, id: string) => sc.steps.find((s) => s.id === id)?.ref || '?';

const uniqueKey = (base: string, inputs: ScriptInput[]) => {
  let k = base;
  for (let i = 2; inputs.some((x) => x.key === k); i++) k = `${base}_${i}`;
  return k;
};

// Input đang ghim trường field của bước id.
export const pinnedInput = (sc: Script, id: string, field: PinField) =>
  inputsOf(sc).find((i) => i.targets?.some((t) => t.stepId === id && t.field === field));

// Input có thể dùng chung cho trường này (cùng kiểu, chưa ghim vào chính trường đó).
export const compatibleInputs = (sc: Script, field: PinField) =>
  inputsOf(sc).filter((i) => kindOf(i.type) === fieldKind(field));

// Bước dùng mỗi input (ghim hoặc {{key}} trong bước gõ chữ), theo thứ tự bước; bước đã xoá không tính.
export function inputUsage(sc: Script): Map<string, Step[]> {
  const out = new Map<string, Step[]>(inputsOf(sc).map((i) => [i.key, []]));
  sc.steps.forEach((s) => {
    const keys = new Set<string>();
    inputsOf(sc).forEach((i) => i.targets?.some((t) => t.stepId === s.id) && keys.add(i.key));
    varsIn(varText(s)).forEach((k) => keys.add(k));
    keys.forEach((k) => out.get(k)?.push(s));
  });
  return out;
}

// Số input bước id dùng – chip "N input" trên thẻ bước.
export const stepInputCount = (sc: Script, id: string) => {
  let n = 0;
  inputUsage(sc).forEach((steps) => steps.some((s) => s.id === id) && n++);
  return n;
};

export function inputViews(sc: Script): InputView[] {
  const usage = inputUsage(sc);
  return inputsOf(sc).map((i) => ({
    ...i,
    unit: i.type === 'ms' ? 'ms' : undefined,
    usedBy: (usage.get(i.key) ?? []).map((s) => ({ n: stepNo(sc, s.id), title: stepLabel(s) })),
  }));
}

// Giá trị từ ô nhập (chuỗi) → đúng kiểu input; '' / không hợp lệ → undefined (trống).
export function parseValue(type: InputType, v: InputValue | undefined): InputValue | undefined {
  if (v === undefined || v === '') return undefined;
  if (kindOf(type) === 'int') {
    const n = typeof v === 'number' ? v : /^\s*-?\d+\s*$/.test(String(v)) ? Number(v) : NaN;
    return Number.isNaN(n) ? undefined : n;
  }
  if (type === 'bool') return v === true || v === 'true';
  return String(v);
}

// Ghi giá trị mặc định vào mọi trường đang ghim (giữ trường = mặc định).
const withTargets = (steps: Step[], inp: ScriptInput, value: InputValue | undefined) => {
  if (value === undefined || !inp.targets?.length) return steps;
  return steps.map((s) => {
    const ts = inp.targets!.filter((t) => t.stepId === s.id);
    if (!ts.length) return s;
    const patch: Partial<Step> = {};
    ts.forEach((t) => Object.assign(patch, { [t.field]: t.field === 'enabled' ? !!value : Number(value) }));
    return { ...s, ...patch };
  });
};

// ---- Ghim ----

// Ghim trường thành input mới: giá trị hiện tại làm mặc định. Trả key.
export function pinField(id: string, field: PinField): string | undefined {
  const sc = getEditor().script;
  const s = sc.steps.find((x) => x.id === id);
  if (!s || pinnedInput(sc, id, field)) return;
  const p = PIN[field];
  const n = sc.steps.indexOf(s) + 1;
  const key = uniqueKey(`${p.key}_${n}`, inputsOf(sc));
  const label = `${field === 'delayAfter' && s.type === 'wait' ? 'Thời gian chờ' : p.label} (B${n})`;
  setInputs([...inputsOf(sc), { key, label, type: p.type, default: s[field] as InputValue, min: p.min, targets: [{ stepId: id, field }] }]);
  return key;
}

// Ghim trường vào input có sẵn (một input cho nhiều bước): trường nhận giá trị mặc định của input.
export function pinToInput(id: string, field: PinField, key: string) {
  const sc = getEditor().script;
  const inputs = inputsOf(sc).map((i) => ({
    ...i,
    targets: i.key === key
      ? [...(i.targets ?? []), { stepId: id, field }]
      : i.targets?.filter((t) => !(t.stepId === id && t.field === field)),
  }));
  const inp = inputs.find((i) => i.key === key);
  if (!inp) return;
  updateScript({ inputs, steps: withTargets(sc.steps, { ...inp, targets: [{ stepId: id, field }] }, inp.default) });
}

// Bỏ ghim: input không còn bước nào dùng thì xoá luôn.
export function unpinField(id: string, field: PinField) {
  const sc = getEditor().script;
  const usage = inputUsage(sc);
  const inputs = inputsOf(sc).flatMap((i) => {
    const targets = i.targets?.filter((t) => !(t.stepId === id && t.field === field));
    if (targets?.length === i.targets?.length) return [i];
    const stillUsed = targets?.length || usage.get(i.key)?.some((s) => varsIn(varText(s)).includes(i.key));
    return stillUsed ? [{ ...i, targets }] : [];
  });
  setInputs(inputs);
}

// Sửa giá trị trường đang ghim trong inspector = sửa mặc định của input (và mọi trường khác ghim cùng input).
export function setPinnedValue(id: string, field: PinField, value: InputValue) {
  const sc = getEditor().script;
  const inp = pinnedInput(sc, id, field);
  if (!inp) return;
  updateInput(inp.key, { default: value });
}

// ---- Tab Input ----

export function addInput(partial: Partial<ScriptInput> = {}): string {
  const sc = getEditor().script;
  const key = uniqueKey(partial.key && isValidKey(partial.key) ? partial.key : `bien_${inputsOf(sc).length + 1}`, inputsOf(sc));
  setInputs([...inputsOf(sc), { label: partial.label ?? key, type: 'text', ...partial, key }]);
  return key;
}

// Sửa một input. Đổi key → đổi luôn {{key}} trong ô chữ; đổi mặc định → ghi vào trường đang ghim;
// đổi sang kiểu không hợp với trường đang ghim → bỏ các ghim đó.
export function updateInput(key: string, patch: Partial<ScriptInput>): string | null {
  const sc = getEditor().script;
  const cur = inputsOf(sc).find((i) => i.key === key);
  if (!cur) return null;
  if (patch.key !== undefined && patch.key !== key) {
    if (!isValidKey(patch.key)) return 'Key chỉ gồm chữ không dấu, số, _ và không bắt đầu bằng số';
    if (inputsOf(sc).some((i) => i.key === patch.key)) return `Đã có input ${patch.key}`;
  }
  let next: ScriptInput = { ...cur, ...patch };
  if (patch.type && kindOf(patch.type) !== kindOf(cur.type)) {
    next = { ...next, default: parseValue(patch.type, cur.default), targets: next.targets?.filter((t) => fieldKind(t.field) === kindOf(next.type)) };
  }
  if ('default' in patch) next.default = parseValue(next.type, patch.default);
  let steps = withTargets(sc.steps, next, next.default);
  if (next.key !== key) steps = steps.map((s) => (varsIn(varText(s)).includes(key) ? mapVarText(s, (t) => renameVar(t, key, next.key)) : s));
  updateScript({ steps, inputs: inputsOf(sc).map((i) => (i.key === key ? next : i)) });
  return null;
}

const renameVar = (text: string, from: string, to: string) =>
  splitVars(text).map((p) => (p.varKey === from ? `{{${to}}}` : p.text)).join('');

export const removeInput = (key: string) => setInputs(inputsOf(getEditor().script).filter((i) => i.key !== key));

export function moveInput(from: string, to: string) {
  const inputs = [...inputsOf(getEditor().script)];
  const a = inputs.findIndex((i) => i.key === from), b = inputs.findIndex((i) => i.key === to);
  if (a < 0 || b < 0) return;
  inputs.splice(b, 0, ...inputs.splice(a, 1));
  setInputs(inputs);
}

// Nhóm ô trong form Chạy theo bước dùng input (artboard RunDialog); bước gõ chữ có câu mẫu để xem trước "Sẽ gõ".
export function runSections(sc: Script): RunSection[] {
  const usage = inputUsage(sc);
  const groups = new Map<string, RunSection & { order: number }>();
  for (const i of inputsOf(sc)) {
    const steps = usage.get(i.key) ?? [];
    const id = steps.map((s) => s.id).join(',');
    let g = groups.get(id);
    if (!g) {
      g = {
        steps: steps.length ? steps.map((s) => stepNo(sc, s.id)).join(', ') : '—',
        title: steps.length ? [...new Set(steps.map((s) => stepLabel(s)))].join(', ') : 'Chưa bước nào dùng',
        keys: [],
        template: steps.find((s) => s.type === 'type')?.text,
        order: steps.length ? flowOrder(sc).indexOf(steps[0].id) : Infinity,
      };
      groups.set(id, g);
    }
    g.keys.push(i.key);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order).map(({ order: _, ...r }) => r);
}
