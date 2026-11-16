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
import { getLang, tr } from '../i18n/lang';
import type { MsgKey } from '../i18n/vi';
export { outputsOf, type OutputField } from './outputs';

// Nhãn + màu cổng ra. Cổng case:<key> lấy nhãn từ case của node.
const PORTS: Record<string, { key: MsgKey; kind: PortView['kind'] }> = {
  [PORT_SUCCESS]: { key: 'port.success', kind: 'ok' },
  [PORT_FAIL]: { key: 'port.fail', kind: 'fail' },
  true: { key: 'port.true', kind: 'neutral' },
  false: { key: 'port.false', kind: 'neutral' },
  default: { key: 'port.default', kind: 'neutral' },
  none: { key: 'port.none', kind: 'neutral' },
  next: { key: 'port.next', kind: 'neutral' },
  done: { key: 'port.done', kind: 'neutral' },
  item: { key: 'port.item', kind: 'neutral' },
  yes: { key: 'port.yes', kind: 'neutral' },
  no: { key: 'port.no', kind: 'neutral' },
  approve: { key: 'port.approve', kind: 'ok' },
  deny: { key: 'port.deny', kind: 'fail' },
  timeout: { key: 'port.timeout', kind: 'neutral' },
};
export function portView(id: string, s?: Pick<Step, 'type' | 'cases'>): PortView {
  if (id.startsWith(CASE_PREFIX)) {
    const key = id.slice(CASE_PREFIX.length);
    const c = s?.cases?.find((x) => x.key === key);
    return { id, label: c?.label || key, kind: 'neutral' };
  }
  if (id === PORT_SUCCESS && (s?.type === 'setVar' || s?.type === 'calc')) return { id, label: tr('port.then'), kind: 'ok' };
  if (s && isTextNode(s.type)) return { id, label: textPortLabel(s.type, id), kind: id === PORT_FAIL ? 'fail' : 'ok' };
  if (id === 'done' && s?.type === 'forEach') return { id, label: tr('port.doneList'), kind: 'neutral' };
  const p = PORTS[id];
  return { id, label: p ? tr(p.key) : id, kind: p ? p.kind : 'neutral' };
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
      chips: [...(n ? [tr('vw.inputN', { n })] : []), ...(s.retry?.count ? [tr('vw.retryN', { n: s.retry.count })] : []),
        ...(s.human && usesHuman(s) ? [tr('vw.human', { v: humanLabel(s.human) })] : [])],
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
  if (!reachable) return tr('vw.w.unreach');
  if (s.type === 'clickImage' && s.imageSource !== 'search' && !refs.has(s.imageFrom ?? '')) return tr('vw.w.noSrc');
  if (s.type === 'if' && s.cond) return condMissing(s.cond);
  if ((s.type === 'switch' || s.type === 'switchScreen') && !s.cases?.length) return tr('vw.w.noCase');
  if (s.type === 'switchScreen') {
    for (const c of s.cases ?? []) {
      const m = c.cond ? condMissing(c.cond) : tr('vw.w.noCond');
      if (m) return tr('vw.w.case', { c: c.label || c.key, m: m.toLowerCase() });
    }
  }
  if (s.type === 'calc' && checkCalc(s.value ?? '')) return s.value?.trim() ? tr('vw.w.badExpr') : tr('vw.w.noExpr');
  if (isTextNode(s.type)) return textWarning(s);
  if (s.type === 'browserTab' || s.type === 'browserGo' || s.type === 'browserNorm' || s.type === 'savePdf') return browserTabWarning(s, refs);
  if (s.type === 'forEach' && listSource(s) === '—') return s.listFrom === 'file' ? tr('vw.w.noFile') : tr('vw.w.emptyList');
  return undefined;
}

// Điều kiện thiếu dữ liệu (chạy sẽ báo lỗi) – undefined = đủ.
export function condMissing(c: Cond): string | undefined {
  switch (c.kind) {
    case 'text': return c.findText?.trim() ? undefined : tr('vw.m.text');
    case 'element': return c.selectors?.some((l) => l.trim()) ? undefined : tr('vw.m.element');
    case 'image': return c.template ? undefined : tr('vw.m.image');
    case 'pixel': return c.points?.[0] ? undefined : tr('vw.m.pixel');
    case 'all': case 'any':
      return c.conds?.length ? c.conds.map(condMissing).find(Boolean) : tr('vw.m.group');
    default: return undefined;
  }
}

const opText = (op: string) => ({ eq: '=', ne: '≠', contains: tr('vw.op.contains'), gt: '>', lt: '<' } as Record<string, string>)[op];
// Một dòng mô tả điều kiện: thấy chữ “Gửi”, {{x}} > 3, 2 điều kiện (và)…
export function condText(c: Cond): string {
  const neg = c.not ? tr('vw.c.not') : '';
  switch (c.kind) {
    case 'text': return tr('vw.c.seeText', { neg, t: c.findText ?? '' });
    case 'element': return tr('vw.c.seeEl', { neg, s: firstSelector(c.selectors) });
    case 'image': return c.template ? tr('vw.c.seeImg', { neg, th: c.threshold ?? 90, tags: matchTags(c) }) : tr('vw.c.noImg');
    case 'pixel': return tr('vw.c.color', { w: c.not ? tr('vw.c.diff') : tr('vw.c.has'), c: c.color ?? '' });
    case 'value': {
      const t = c.op === 'empty' ? tr('vw.c.empty', { l: c.left ?? '' }) : `${c.left ?? ''} ${opText(c.op ?? 'eq')} ${c.right ?? ''}`;
      return c.not ? tr('vw.c.notP', { t }) : t;
    }
    default: return `${c.not ? tr('vw.c.not2') : ''}${tr('vw.c.group', { n: c.conds?.length ?? 0, j: c.kind === 'all' ? tr('vw.c.and') : tr('vw.c.or') })}`;
  }
}

// Nguồn danh sách của Lặp qua danh sách: tên file / biến / số dòng.
export function listSource(s: Pick<Step, 'listFrom' | 'filePath' | 'value'>): string {
  if (s.listFrom === 'file') return s.filePath?.trim() ? s.filePath.trim().split(/[\\/]/).pop()! : '—';
  const v = (s.value ?? '').trim();
  if (!v) return '—';
  if (/^\{\{[^}]+\}\}$/.test(v) || v.startsWith('[')) return v.length > 40 ? `${v.slice(0, 39)}…` : v;
  return tr('vw.list.lines', { n: v.split('\n').filter((l) => l.trim()).length });
}

const sec = (ms: number) => `${(ms / 1000).toLocaleString(getLang() === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 })} s`;
// Dòng chi tiết trên thẻ node điều khiển.
function controlDetail(s: Step): string {
  const n = s.cases?.length ?? 0;
  switch (s.type) {
    case 'if': return `${s.cond ? condText(s.cond) : '—'}${s.timeoutMs ? tr('vw.d.wait', { s: sec(s.timeoutMs) }) : ''}`;
    case 'switch': return tr('vw.d.cases', { v: s.value || '—', n });
    case 'switchScreen': return tr('vw.d.maxWait', { s: sec(s.timeoutMs ?? 0), n });
    case 'counter': return tr('vw.d.counter', { n: s.max ?? 0 });
    case 'forEach': return listSource(s);
    case 'end': return `${s.endStatus === 'fail' ? tr('vw.d.fail') : tr('vw.d.ok')}${s.message ? ` · ${s.message}` : ''}`;
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
      { key: `${s.ref}.error.message`, label: tr('vw.v.err', { name }) },
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
      return src && byRef.get(src)?.type === 'findAll' ? [{ ref: s.ref, label: tr('vw.v.loop', { ref: s.ref, title: nodeTitle(s) }), base: `${s.ref}.output.item` }] : [];
    }
    const keys = outputsOf(s).map((o) => o.key);
    return keys.includes('x') && keys.includes('y') ? [{ ref: s.ref, label: `${s.ref} · ${nodeTitle(s)}`, base: `${s.ref}.output` }] : [];
  });
}
