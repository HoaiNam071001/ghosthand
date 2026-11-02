// Dữ liệu giữa các node (bước 60): ô nào của node nhận biến, biến đó trỏ node nào, nối / bỏ nối output → ô.
// Logic thuần – thẻ node (VÀO / RA), dây dữ liệu, tab Dữ liệu ở inspector và cây lần chạy dùng chung.
import type { NumVarField, Step } from '../types';
import { flowOrder, FlowShape } from './model';
import { mapVarText } from './varText';

// Biến node trong chữ: {{n4.output.item.text}} → ref n4, key item.text; {{n2.status}} → key status.
export interface VarRef { ref: string; key: string }
// Một ô nhận biến của node. name khớp tên trường Go (script.VarField.Name, vd points[0].xVar) – khoá của StepResult.input.
export interface DataSlot { name: string; label: string; text: string; refs: VarRef[]; num: boolean }

const VAR_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9_.]+)\s*\}\}/g; // khớp script.NodeVarRe
const NOT_NODE = new Set(['vars', 'secret', 'last']);

export function varRefs(text: string): VarRef[] {
  const out: VarRef[] = [];
  for (const m of text.matchAll(VAR_RE)) {
    if (NOT_NODE.has(m[1])) continue;
    out.push({ ref: m[1], key: m[2].startsWith('output.') ? m[2].slice(7) : m[2] });
  }
  return out;
}
export const varExpr = (ref: string, key: string) => `{{${ref}.output.${key}}}`;

const LABEL: Record<string, string> = {
  text: 'Chữ', findText: 'Chữ cần tìm', selectors: 'Selector', elementApp: 'App', filePath: 'Đường dẫn', filePattern: 'Mẫu tên file',
  value: 'Giá trị', target: 'Mở', url: 'URL', tab: 'Tab', message: 'Lời nhắn', left: 'Vế trái', right: 'Vế phải', match: 'Khớp',
  xVar: 'X', yVar: 'Y', winApp: 'App cửa sổ', winTitle: 'Tiêu đề cửa sổ', body: 'Thân', query: 'Query', headers: 'Header', form: 'Form',
  pattern: 'Mẫu', replaceFrom: 'Thay chữ', replaceTo: 'Bằng chữ', prompt: 'Câu hỏi', at: 'Lúc', sheet: 'Sheet', cells: 'Ô', appName: 'App',
  mcpArgs: 'Đối số', notifyTitle: 'Tiêu đề', saveDir: 'Thư mục', fileName: 'Tên file', zipTo: 'Nén vào', procName: 'Tiến trình',
};
const NUM_LABEL: Record<NumVarField, string> = {
  clicks: 'Số click', clickInterval: 'Nghỉ giữa click', holdMs: 'Giữ', dragMs: 'Thời gian kéo', delayAfter: 'Chờ sau', jitterMs: 'Lệch thời gian',
  jitterPx: 'Lệch toạ độ', amount: 'Lượng cuộn', timeoutMs: 'Chờ tối đa', threshold: 'Độ giống',
};

// Tên đường dẫn kiểu Go: points[0].xVar, cond.conds[1].left
const pathName = (path: (string | number)[]) => path.map((p, i) => (typeof p === 'number' ? `[${p}]` : i ? `.${p}` : p)).join('');

function slotLabel(path: (string | number)[], s: Step): string {
  const last = path[path.length - 1];
  if (path[0] === 'numVars' && typeof path[1] === 'number') return NUM_LABEL[s.numVars![path[1]].field] ?? 'Số';
  const key = typeof last === 'number' ? String(path[path.length - 2]) : last;
  const base = LABEL[key] ?? key;
  const idx = path.filter((p): p is number => typeof p === 'number');
  if (path[0] === 'points' && (s.points.length > 1)) return `${base} điểm ${idx[0] + 1}`;
  if (path[0] === 'cases') return `Case ${idx[0] + 1}${key === 'match' ? '' : ` · ${base}`}`;
  return typeof last === 'number' && idx.length ? `${base} ${idx[idx.length - 1] + 1}` : base;
}

// Ô nhận biến của node theo thứ tự trong form. Điểm toạ độ số (chưa dùng biến) vẫn là ô X / Y – nối vào thì điểm chuyển
// sang lấy toạ độ màn hình từ biến (F5b).
export function dataSlots(s: Step): DataSlot[] {
  const texts: string[] = [];
  const marked = mapVarText(s, (t) => (texts.push(t), `\u0000${texts.length - 1}\u0000`));
  const out: DataSlot[] = [];
  const walk = (v: unknown, path: (string | number)[]) => {
    if (typeof v === 'string') {
      const m = /^\u0000(\d+)\u0000$/.exec(v);
      if (m) {
        const text = texts[Number(m[1])];
        out.push({ name: pathName(path), label: slotLabel(path, s), text, refs: varRefs(text), num: path[0] === 'points' || path[0] === 'numVars' });
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(marked, []);
  if (POINT_TYPES.includes(s.type)) {
    s.points.forEach((p, i) => {
      if (p.xVar || p.yVar || (i === 0 && s.type === 'drag' && s.dragFromPrev)) return;
      for (const axis of ['xVar', 'yVar'] as const) out.push({ name: `points[${i}].${axis}`, label: slotLabel(['points', i, axis], s), text: '', refs: [], num: true });
    });
  }
  return out.sort((a, b) => order(a.name) - order(b.name));
}
const POINT_TYPES: Step['type'][] = ['click', 'double', 'hold', 'drag', 'scroll', 'waitPixel', 'path'];
// Điểm toạ độ lên đầu (thứ tự như form), trường số từ biến xuống cuối
const order = (name: string) => (name.startsWith('points') ? 0 : name.startsWith('numVars') ? 2 : 1);

// Ghi chữ vào ô name (đường dẫn kiểu Go) của bản sao node.
export function setSlot(s: Step, name: string, text: string): Step {
  const path = name.split(/\.|\[(\d+)\]/).filter((p) => p !== undefined && p !== '').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const set = (obj: unknown, i: number): unknown => {
    const k = path[i];
    const cur = (obj ?? (typeof k === 'number' ? [] : {})) as Record<string | number, unknown>;
    const copy = (Array.isArray(cur) ? [...cur] : { ...cur }) as Record<string | number, unknown>;
    copy[k] = i === path.length - 1 ? text : set(cur[k], i + 1);
    return copy;
  };
  return set(s, 0) as Step;
}

// Chữ mới của ô khi thả biến vào: ô số / toạ độ / ô trống → thay; ô chữ đang có nội dung → thêm vào cuối.
export function linkedText(slot: Pick<DataSlot, 'text' | 'num'>, ref: string, key: string): string {
  const v = varExpr(ref, key);
  return slot.num || !slot.text.trim() ? v : slot.text + v;
}

// Bỏ mọi biến trỏ ref (key rỗng = mọi key) khỏi chữ ô.
export function unlinkedText(text: string, ref: string, key = ''): string {
  return text.replace(VAR_RE, (m, r: string, k: string) => {
    const kk = k.startsWith('output.') ? k.slice(7) : k;
    return r === ref && (!key || kk === key) ? '' : m;
  }).trim();
}

// Nối output (fromRef, key) vào ô slotName của node s.
export function linkSlot(s: Step, slotName: string, fromRef: string, key: string): Step {
  const slot = dataSlots(s).find((x) => x.name === slotName);
  return slot ? setSlot(s, slotName, linkedText(slot, fromRef, key)) : s;
}
export function unlinkSlot(s: Step, slotName: string, ref: string, key = ''): Step {
  const slot = dataSlots(s).find((x) => x.name === slotName);
  return slot ? setSlot(s, slotName, unlinkedText(slot.text, ref, key)) : s;
}

// Chỉ nối từ node chạy trước sang node chạy sau (thứ tự flowOrder) – lý do khi không được.
export function linkBlock(sc: FlowShape, fromId: string, toId: string): string | null {
  if (fromId === toId) return 'không nối node vào chính nó';
  const ord = flowOrder(sc);
  const a = ord.indexOf(fromId), b = ord.indexOf(toId);
  if (a < 0 || b < 0) return 'node chưa nối vào luồng chạy';
  return b < a ? 'node này chạy trước – lúc đó chưa có dữ liệu để nối' : null;
}

// Nơi dùng output của node ref: node nào, ô nào, key nào.
export interface DataUse { stepId: string; slot: string; label: string; key: string }
export function usesOf(steps: Step[], ref: string): DataUse[] {
  const out: DataUse[] = [];
  for (const s of steps) for (const sl of dataSlots(s)) for (const r of sl.refs) if (r.ref === ref) out.push({ stepId: s.id, slot: sl.name, label: sl.label, key: r.key });
  return out;
}
