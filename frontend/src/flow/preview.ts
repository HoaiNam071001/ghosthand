// Xem trước đi theo đồ thị (bước 20 F6): node rẽ nhánh đi cổng người dùng chọn trong menu Nhánh (mặc định cổng đầu –
// success / Đúng / case đầu), Đếm chạy 1 lượt rồi Hết lượt, Lặp qua danh sách (chọn Mỗi phần tử) 1 lượt rồi Hết danh
// sách, vòng lặp không có Đếm thì dừng sau 2 lần.
// Hàm thuần – Simulation gọi từng node, test ở preview.test.ts.
import { tr } from '../i18n/lang';
import type { PortView } from '../components/flow/model';
import type { Script, Step } from '../types';
import { edgeOut, orderedSteps, PORT_FAIL, PORT_SUCCESS, portsOf } from './model';
import { nodeTitle, portView } from './view';

export type BranchChoices = Record<string, string>; // id node → cổng xem trước đi
export type BranchNode = { id: string; ref: string; title: string; ports: PortView[] };

type Flow = Pick<Script, 'steps' | 'start' | 'edges'>;
const CHOOSABLE = new Set(['if', 'switch', 'switchScreen', 'forEach']);
const MAX_EDGE_USES = 2; // một cạnh đi quá chừng này lần trong một lượt xem trước = lặp không có Đếm

// Node cho chọn nhánh: Nếu / Switch, và node đang bật có cổng khác cổng đầu được nối (vd Chờ ảnh nối Thất bại).
// Đếm (tự đi 1 lượt) và Kết thúc không có. Theo thứ tự hiển thị (flowOrder).
export function branchNodes(sc: Flow): BranchNode[] {
  return orderedSteps(sc).filter((s) => s.enabled && s.type !== 'counter' && (CHOOSABLE.has(s.type)
    || portsOf(s).slice(1).some((p) => edgeOut(sc.edges, s.id, p))))
    .map((s) => ({ id: s.id, ref: s.ref, title: nodeTitle(s), ports: portsOf(s).map((p) => portView(p, s)) }));
}

export type Walk = { counts: Record<string, number>; used: Record<string, number> };
export const newWalk = (): Walk => ({ counts: {}, used: {} });

export type Hop = {
  id: string; port: string; next: string;
  count?: { n: number; max: number }; // node Đếm: lượt thứ mấy
  item?: number; // Lặp qua danh sách: phần tử thứ mấy (0 = hết danh sách)
  stop?: 'end' | 'fail' | 'loop'; // end: node Kết thúc; fail: thất bại không có nhánh; loop: lặp không có Đếm
};

// Node s chạy xong (xem trước) đi cổng nào, sang node nào. Đổi walk (đếm lượt, số lần đi mỗi cạnh).
export function previewHop(sc: Flow, s: Step, choices: BranchChoices, w: Walk): Hop {
  const hop: Hop = { id: s.id, port: PORT_SUCCESS, next: '' };
  if (s.type === 'end' && s.enabled) return { ...hop, port: '', stop: 'end' };
  if (s.type === 'counter' && s.enabled) {
    const n = (w.counts[s.id] ?? 0) + 1;
    const max = s.max ?? 0;
    const more = n === 1 && max >= 1;
    w.counts[s.id] = more ? n : 0; // hết lượt thì đếm lại như engine (nodes.go)
    hop.port = more ? 'next' : 'done';
    hop.count = { n, max };
  } else if (s.type === 'forEach' && s.enabled) {
    const more = choices[s.id] !== 'done' && !w.counts[s.id];
    w.counts[s.id] = more ? 1 : 0; // xem trước 1 phần tử rồi hết danh sách (đi vào lần nữa thì lại từ đầu như engine)
    hop.port = more ? 'item' : 'done';
    hop.item = more ? 1 : 0;
  } else if (s.enabled) {
    const ports = portsOf(s);
    hop.port = ports.includes(choices[s.id]) ? choices[s.id] : ports[0];
  }
  hop.next = edgeOut(sc.edges, s.id, hop.port);
  if (!hop.next) return hop.port === PORT_FAIL ? { ...hop, stop: 'fail' } : hop;
  const key = `${s.id}>${hop.port}`;
  w.used[key] = (w.used[key] ?? 0) + 1;
  return w.used[key] > MAX_EDGE_USES ? { ...hop, next: '', stop: 'loop' } : hop;
}

// Chữ một chặng trên đường đã đi: "n2", "n2 ✗", "n4 Sai", "n5 (1/10)", "n5 hết lượt".
export function hopText(h: Hop, s: Step): string {
  if (h.count) return `${s.ref} ${h.port === 'next' ? `(${h.count.n}/${h.count.max})` : tr('pv.count')}`;
  if (h.item !== undefined) return `${s.ref} ${h.item ? `(${tr('pv.item', { n: h.item })})` : tr('pv.itemEnd')}`;
  if (h.port === PORT_SUCCESS || !h.port) return s.ref;
  if (h.port === PORT_FAIL) return `${s.ref} ✗`;
  return `${s.ref} ${portView(h.port, s).label}`;
}

const ROUTE_MAX = 6;
// Đường đã đi gọn cho dòng gợi ý: "… → n2 ✗ → n5 (1/10) → n3".
export const routeText = (hops: string[]) =>
  `${hops.length > ROUTE_MAX ? '… → ' : ''}${hops.slice(-ROUTE_MAX).join(' → ')}`;

// Chữ khi xem trước dừng (cuối lượt).
export function stopText(h: Hop | undefined, s: Step | undefined): string {
  switch (h?.stop) {
    case 'end': return s?.endStatus === 'fail' ? tr('pv.endFail', { r: s.ref }) : tr('pv.end', { r: s?.ref ?? '' });
    case 'fail': return tr('pv.fail', { r: s?.ref ?? '' });
    case 'loop': return tr('pv.loop', { r: s?.ref ?? '' });
  }
  return tr('pv.done');
}
