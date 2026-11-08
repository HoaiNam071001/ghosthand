// Node (Step) → dữ liệu hiển thị thẻ trên canvas (FlowNodeView): tên, dòng chi tiết, chip, cổng ra có nhãn, cảnh báo,
// trạng thái chạy. Hàm thuần – FlowEditor (app) gọi với dữ liệu thật; test ở view.test.ts.
import type { FlowNodeView, PortView, RunState } from '../components/flow/model';
import { humanLabel, usesHuman } from './human';
import { Cond, fmtMs, isControl, numVarOf, Script, Step, stepLabel } from '../types';
import { fmtPos, matchTags } from './detail';
import { nodeCategory } from './category';
import { firstSelector } from './element';
import { reachable } from './edit';
import { CASE_PREFIX, flowOrder, PORT_FAIL, PORT_SUCCESS, PortShape, portsOf } from './model';
import { checkCalc } from './calc';
import { browserTabWarning } from './browserTab';
import { isTextNode, textDetail, textPortLabel, textWarning } from './textNodes';
import { outputsOf } from './outputs';
export { outputsOf, type OutputField } from './outputs';

// Nhãn + màu cổng ra. Cổng case:<key> lấy nhãn từ case của node.
const PORTS: Record<string, Omit<PortView, 'id'>> = {
  [PORT_SUCCESS]: { label: 'Thành công', kind: 'ok' },
  [PORT_FAIL]: { label: 'Thất bại', kind: 'fail' },
  true: { label: 'Đúng', kind: 'neutral' },
  false: { label: 'Sai', kind: 'neutral' },
  default: { label: 'Khác', kind: 'neutral' },
  none: { label: 'Không thấy', kind: 'neutral' },
  next: { label: 'Còn lượt', kind: 'neutral' },
  done: { label: 'Hết lượt', kind: 'neutral' },
  item: { label: 'Mỗi phần tử', kind: 'neutral' },
  yes: { label: 'Đang chạy', kind: 'neutral' },
  no: { label: 'Không chạy', kind: 'neutral' },
  approve: { label: 'Đồng ý', kind: 'ok' },
  deny: { label: 'Từ chối', kind: 'fail' },
  timeout: { label: 'Hết giờ', kind: 'neutral' },
};
export function portView(id: string, s?: Pick<Step, 'type' | 'cases'>): PortView {
  if (id.startsWith(CASE_PREFIX)) {
    const key = id.slice(CASE_PREFIX.length);
    const c = s?.cases?.find((x) => x.key === key);
    return { id, label: c?.label || key, kind: 'neutral' };
  }
  if (id === PORT_SUCCESS && (s?.type === 'setVar' || s?.type === 'calc')) return { id, label: 'Tiếp', kind: 'ok' };
  if (s && isTextNode(s.type)) return { id, label: textPortLabel(s.type, id), kind: id === PORT_FAIL ? 'fail' : 'ok' };
  if (id === 'done' && s?.type === 'forEach') return { id, label: 'Hết danh sách', kind: 'neutral' };
  return { id, ...(PORTS[id] ?? { label: id, kind: 'neutral' }) };
}
export const portViews = (s: PortShape) => portsOf(s).map((p) => portView(p, s));

export const nodeTitle = (s: Step) => s.name || `${stepLabel(s)}${s.type === 'click' && !numVarOf(s, 'clicks') && s.clicks > 1 ? ` ×${s.clicks}` : ''}`;

export type ViewOptions = {
  inputs?: (id: string) => number; // số input ghim vào node
  run?: Map<string, { run: RunState; visits?: number }>; // trạng thái lần chạy đang xem
  pinned?: (id: string) => boolean; // output node đã ghim
};

export function nodeViews(sc: Pick<Script, 'steps' | 'start' | 'edges'>, opt: ViewOptions = {}): FlowNodeView[] {
  const ok = reachable(sc.edges, sc.start);
  const refs = new Map(sc.steps.map((s) => [s.id, s.ref]));
  const refOf = (id: string) => refs.get(id) ?? '?';
  return sc.steps.map((s) => {
    const n = opt.inputs?.(s.id) ?? 0;
    const r = opt.run?.get(s.id);
    return {
      id: s.id,
      ref: s.ref,
      icon: s.type,
      cat: nodeCategory(s),
      title: nodeTitle(s),
      detail: isControl(s.type) ? controlDetail(s) : `${fmtPos(s, refOf)} · ${numVarOf(s, 'delayAfter') ?? fmtMs(s.delayAfter)}`,
      ports: portViews(s),
      enabled: s.enabled,
      chips: [...(n ? [`${n} input`] : []), ...(s.retry?.count ? [`thử lại ${s.retry.count}`] : []),
        ...(s.human && usesHuman(s) ? [`giống người: ${humanLabel(s.human)}`] : [])],
      warn: warningOf(s, ok.has(s.id), refs),
      breakpoint: s.breakpoint,
      pinned: opt.pinned?.(s.id),
      run: r?.run,
      visits: r?.visits,
    };
  });
}

// Cảnh báo khi soạn (không chặn lưu; chạy thì Go kiểm tra đủ): node không đi tới được, click theo ảnh thiếu nguồn,
// node điều khiển thiếu dữ liệu.
function warningOf(s: Step, reachable: boolean, refs: Map<string, string>): string | undefined {
  if (!reachable) return 'Không có đường nào đi tới node này – sẽ không bao giờ chạy';
  if (s.type === 'clickImage' && s.imageSource !== 'search' && !refs.has(s.imageFrom ?? '')) return 'Chưa chọn node lấy chỗ thấy (Chờ ảnh / Chờ chữ)';
  if (s.type === 'if' && s.cond) return condMissing(s.cond);
  if ((s.type === 'switch' || s.type === 'switchScreen') && !s.cases?.length) return 'Chưa có case nào';
  if (s.type === 'switchScreen') {
    for (const c of s.cases ?? []) {
      const m = c.cond ? condMissing(c.cond) : 'chưa có điều kiện';
      if (m) return `Case ${c.label || c.key}: ${m.toLowerCase()}`;
    }
  }
  if (s.type === 'calc' && checkCalc(s.value ?? '')) return s.value?.trim() ? 'Biểu thức sai' : 'Chưa nhập biểu thức';
  if (isTextNode(s.type)) return textWarning(s);
  if (s.type === 'browserTab' || s.type === 'browserGo' || s.type === 'browserNorm' || s.type === 'savePdf') return browserTabWarning(s, refs);
  if (s.type === 'forEach' && listSource(s) === '—') return s.listFrom === 'file' ? 'Chưa chọn file CSV / Excel' : 'Danh sách trống';
  return undefined;
}

// Điều kiện thiếu dữ liệu (chạy sẽ báo lỗi) – undefined = đủ.
export function condMissing(c: Cond): string | undefined {
  switch (c.kind) {
    case 'text': return c.findText?.trim() ? undefined : 'Chưa nhập chữ cần thấy';
    case 'element': return c.selectors?.some((l) => l.trim()) ? undefined : 'Chưa nhập cách tìm phần tử';
    case 'image': return c.template ? undefined : 'Chưa có ảnh mẫu';
    case 'pixel': return c.points?.[0] ? undefined : 'Chưa chọn điểm màu';
    case 'all': case 'any':
      return c.conds?.length ? c.conds.map(condMissing).find(Boolean) : 'Nhóm chưa có điều kiện nào';
    default: return undefined;
  }
}

const OP_TEXT: Record<string, string> = { eq: '=', ne: '≠', contains: 'chứa', gt: '>', lt: '<' };
// Một dòng mô tả điều kiện: thấy chữ “Gửi”, {{x}} > 3, 2 điều kiện (và)…
export function condText(c: Cond): string {
  const neg = c.not ? 'không ' : '';
  switch (c.kind) {
    case 'text': return `${neg}thấy chữ “${c.findText ?? ''}”`;
    case 'element': return `${neg}thấy phần tử ${firstSelector(c.selectors)}`;
    case 'image': return c.template ? `${neg}thấy ảnh (≥ ${c.threshold ?? 90}%${matchTags(c)})` : 'chưa có ảnh mẫu';
    case 'pixel': return `${c.not ? 'khác' : 'có'} màu ${c.color ?? ''}`;
    case 'value': {
      const t = c.op === 'empty' ? `${c.left ?? ''} trống` : `${c.left ?? ''} ${OP_TEXT[c.op ?? 'eq']} ${c.right ?? ''}`;
      return c.not ? `không (${t})` : t;
    }
    default: return `${c.not ? 'không: ' : ''}${c.conds?.length ?? 0} điều kiện (${c.kind === 'all' ? 'và' : 'hoặc'})`;
  }
}

// Nguồn danh sách của Lặp qua danh sách: tên file / biến / số dòng.
export function listSource(s: Pick<Step, 'listFrom' | 'filePath' | 'value'>): string {
  if (s.listFrom === 'file') return s.filePath?.trim() ? s.filePath.trim().split(/[\\/]/).pop()! : '—';
  const v = (s.value ?? '').trim();
  if (!v) return '—';
  if (/^\{\{[^}]+\}\}$/.test(v) || v.startsWith('[')) return v.length > 40 ? `${v.slice(0, 39)}…` : v;
  return `${v.split('\n').filter((l) => l.trim()).length} dòng`;
}

const sec = (ms: number) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`;
// Dòng chi tiết trên thẻ node điều khiển.
function controlDetail(s: Step): string {
  const n = s.cases?.length ?? 0;
  switch (s.type) {
    case 'if': return `${s.cond ? condText(s.cond) : '—'}${s.timeoutMs ? ` · chờ ${sec(s.timeoutMs)}` : ''}`;
    case 'switch': return `${s.value || '—'} · ${n} case`;
    case 'switchScreen': return `chờ tối đa ${sec(s.timeoutMs ?? 0)} · ${n} case`;
    case 'counter': return `tối đa ${s.max ?? 0} lần`;
    case 'forEach': return listSource(s);
    case 'end': return s.endStatus === 'fail' ? `thất bại${s.message ? ` · ${s.message}` : ''}` : `thành công${s.message ? ` · ${s.message}` : ''}`;
    case 'setVar': return `vars.${s.varName || '?'} ${s.varOp === 'add' ? '+=' : '='} ${s.value ?? ''}`;
    case 'calc': return s.value || '—';
    default: return textDetail(s);
  }
}

// Biến đọc kết quả node khác – gợi ý cho ô chữ {{…}} (khớp lookup trong vars.go). Node khác `self`, theo thứ tự hiển thị;
// mỗi node: output khi thành công, rồi status / error.message.
export type NodeVar = { key: string; label: string };
export function nodeVarOptions(sc: Pick<Script, 'steps' | 'start' | 'edges'>, self: string): NodeVar[] {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  return flowOrder(sc).flatMap((id) => {
    const s = byId.get(id);
    if (!s || id === self || !s.ref) return [];
    const name = nodeTitle(s);
    return [
      ...outputsOf(s).map((o) => ({ key: `${s.ref}.output.${o.key}`, label: `${name} – ${o.desc}` })),
      { key: `${s.ref}.status`, label: `${name} – success / fail / skipped` },
      { key: `${s.ref}.error.message`, label: `${name} – lời báo lỗi` },
    ];
  });
}

// Node có output x, y (chỗ thấy / chỗ chuột dừng) theo thứ tự flow, trừ self – nút chọn nhanh toạ độ từ biến (F5b).
// base: biến trước .x / .y – Lặp qua danh sách đang lặp items của Tìm tất cả (42 G3) cho phần tử đang lặp: n3.output.item.
export type CoordSource = { ref: string; label: string; base: string };
export function coordSources(sc: Pick<Script, 'steps' | 'start' | 'edges'>, self: string): CoordSource[] {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  const byRef = new Map(sc.steps.map((s) => [s.ref, s]));
  return flowOrder(sc).flatMap((id) => {
    const s = byId.get(id);
    if (!s || id === self || !s.ref) return [];
    if (s.type === 'forEach') {
      const src = /\{\{\s*(\w+)\.output\.items\s*\}\}/.exec(s.value ?? '')?.[1];
      return src && byRef.get(src)?.type === 'findAll' ? [{ ref: s.ref, label: `${s.ref} · ${nodeTitle(s)} – chỗ đang lặp`, base: `${s.ref}.output.item` }] : [];
    }
    const keys = outputsOf(s).map((o) => o.key);
    return keys.includes('x') && keys.includes('y') ? [{ ref: s.ref, label: `${s.ref} · ${nodeTitle(s)}`, base: `${s.ref}.output` }] : [];
  });
}
