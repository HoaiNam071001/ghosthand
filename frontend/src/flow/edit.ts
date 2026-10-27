// Sửa đồ thị flow (bước 20) – hàm thuần trên danh sách node + cạnh, không đụng store / React.
// Store (F4b) và màn mẫu #demo-flow đều gọi qua đây; hoàn tác / làm lại do nơi gọi lo.
// Quy tắc: mỗi cổng ra tối đa 1 cạnh; không nối node vào chính nó qua cùng một cạnh vô nghĩa (cho phép vòng lặp qua node khác).

import type { Edge, Script, Step } from '../types';
import { flowOrder, PORT_SUCCESS, portsOf } from './model';

export type { Edge };
export type Graph<N extends { id: string }> = { nodes: N[]; edges: Edge[] };

let seq = 0;
export const edgeId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

// Cạnh đang đi ra từ cổng (from, port)
export const edgeFrom = (edges: Edge[], from: string, port: string) => edges.find((e) => e.from === from && e.port === port);

// Nối cổng → node. Cổng đã có cạnh thì thay. Nối vào chính nó bị bỏ qua (vòng lặp phải qua node khác, vd Đếm).
export function connect(edges: Edge[], from: string, port: string, to: string): Edge[] {
  if (from === to) return edges;
  const old = edgeFrom(edges, from, port);
  if (old?.to === to) return edges;
  const rest = edges.filter((e) => e !== old);
  return [...rest, { id: old?.id ?? edgeId(), from, port, to }];
}

export const disconnect = (edges: Edge[], from: string, port: string) => edges.filter((e) => !(e.from === from && e.port === port));

export const removeEdge = (edges: Edge[], id: string) => edges.filter((e) => e.id !== id);

// Xoá node kèm mọi cạnh vào / ra. Node bắt đầu bị xoá → start chuyển sang node đầu còn lại (nếu có).
export function removeNode<N extends { id: string }>(g: Graph<N> & { start: string }, id: string): Graph<N> & { start: string } {
  const nodes = g.nodes.filter((n) => n.id !== id);
  return {
    nodes,
    edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    start: g.start === id ? (nodes[0]?.id ?? '') : g.start,
  };
}

// Thêm node mới nối từ cổng (from, port). Cổng đã có cạnh A → B thì chèn vào giữa: A → mới → B
// (node mới đi tiếp qua cổng `through`, thường là success).
export function addConnected<N extends { id: string }>(g: Graph<N>, node: N, from: string, port: string, through?: string): Graph<N> {
  const old = edgeFrom(g.edges, from, port);
  let edges = connect(g.edges, from, port, node.id);
  if (old && through) edges = connect(edges, node.id, through, old.to);
  return { nodes: [...g.nodes, node], edges };
}

// Các node đi tới được từ start (theo mọi cạnh) – còn lại là node "không đi tới được" (cảnh báo, không chặn chạy)
export function reachable(edges: Edge[], start: string): Set<string> {
  const seen = new Set<string>();
  const stack = start ? [start] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.from === id) stack.push(e.to);
  }
  return seen;
}

// ---- Thao tác trên kịch bản (node = Step) ----

type FlowGraph = Pick<Script, 'steps' | 'edges' | 'start'>;

// Mã node mới: n + số nhỏ nhất chưa dùng (n1, n2…) – khớp fixRefs trong storage.go.
export function nextRef(nodes: Pick<Step, 'ref'>[]): string {
  const used = new Set(nodes.map((n) => n.ref));
  let i = 1;
  while (used.has(`n${i}`)) i++;
  return `n${i}`;
}

// Chỗ node mới nối vào: cổng ra của một node có sẵn.
export type InsertAt = { from: string; port: string };

// Thêm node: kịch bản chưa có node bắt đầu (hoặc start trỏ node đã xoá) → node mới thành start; có `at` → nối từ cổng đó,
// cổng đã có cạnh A → B thì chèn vào giữa (A → mới → B, đi tiếp qua cổng đầu của node mới – success / true / next…).
export function insertNode(g: FlowGraph, node: Step, at: InsertAt | null): FlowGraph {
  const steps = [...g.steps, node];
  const start = g.steps.some((s) => s.id === g.start) ? g.start : node.id;
  if (!at || !g.steps.some((s) => s.id === at.from)) return { steps, edges: g.edges, start };
  const r = addConnected({ nodes: g.steps, edges: g.edges }, node, at.from, at.port, portsOf(node)[0]);
  return { steps, edges: r.edges, start };
}

// Cuối flow: node đi tới được từ start, xếp sau cùng theo flowOrder mà cổng đầu (success / true / next…) còn trống –
// node đặt điểm trên overlay không có chỗ nối định sẵn thì nối vào đây (các điểm đặt liên tiếp thành chuỗi theo thứ tự).
export function flowTail(g: FlowGraph): InsertAt | null {
  const seen = reachable(g.edges, g.start);
  const byId = new Map(g.steps.map((s) => [s.id, s]));
  const order = flowOrder(g).filter((id) => seen.has(id) && byId.has(id));
  for (let i = order.length - 1; i >= 0; i--) {
    const port = portsOf(byId.get(order[i])!)[0];
    if (port && !g.edges.some((e) => e.from === order[i] && e.port === port)) return { from: order[i], port };
  }
  return null;
}

// Đổi loại node: bỏ cạnh đi ra từ cổng loại mới không có.
export function pruneEdges(steps: Step[], edges: Edge[]): Edge[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  return edges.filter((e) => {
    const s = byId.get(e.from);
    return !!s && byId.has(e.to) && portsOf(s).includes(e.port);
  });
}

// Nối các node thành chuỗi success theo thứ tự (dữ liệu mẫu, test).
export const chain = (ids: string[]): Edge[] =>
  ids.slice(1).map((to, i) => ({ id: `c${i}`, from: ids[i], port: PORT_SUCCESS, to }));

// ---- Copy / paste ----

// Phần đã chép: các node + cạnh nằm hẳn bên trong (cạnh ra / vào node ngoài bị bỏ).
export type Clip = { steps: Step[]; edges: Edge[] };

export function copyNodes(g: FlowGraph, ids: string[]): Clip | null {
  const pick = new Set(ids);
  const steps = g.steps.filter((s) => pick.has(s.id));
  if (!steps.length) return null;
  return structuredClone({ steps, edges: g.edges.filter((e) => pick.has(e.from) && pick.has(e.to)) });
}

// Dán: id + mã mới, vị trí lệch `offset`. Trong phần dán, cạnh / imageFrom / tabFrom / biến {{nX.…}} trỏ node đã chép thì đổi sang
// bản sao; trỏ node ngoài thì giữ (dán cùng kịch bản vẫn đúng, kịch bản khác thì Kiểm tra báo). Chưa có start → node dán đầu tiên.
export function pasteNodes(g: FlowGraph, clip: Clip, newId: () => string, offset: { x: number; y: number }): FlowGraph & { ids: string[] } {
  const ids = new Map<string, string>();
  const refs = new Map<string, string>();
  const taken = [...g.steps];
  for (const s of clip.steps) {
    const ref = nextRef(taken);
    ids.set(s.id, newId());
    refs.set(s.ref, ref);
    taken.push({ ...s, ref });
  }
  const reVar = (t?: string) => t?.replace(/\{\{(\s*)([A-Za-z][A-Za-z0-9_]*)\./g, (m, sp, r) => (refs.has(r) ? `{{${sp}${refs.get(r)}.` : m));
  const pasted = clip.steps.map((s): Step => ({
    ...structuredClone(s),
    id: ids.get(s.id)!,
    ref: refs.get(s.ref)!,
    pos: s.pos && { x: s.pos.x + offset.x, y: s.pos.y + offset.y },
    imageFrom: s.imageFrom && (ids.get(s.imageFrom) ?? s.imageFrom),
    tabFrom: s.tabFrom && (ids.get(s.tabFrom) ?? s.tabFrom),
    text: reVar(s.text) ?? '',
    findText: reVar(s.findText),
    target: reVar(s.target),
  }));
  const edges = clip.edges.map((e) => ({ id: edgeId(), from: ids.get(e.from)!, port: e.port, to: ids.get(e.to)! }));
  const steps = [...g.steps, ...pasted];
  const start = g.steps.some((s) => s.id === g.start) ? g.start : pasted[0]?.id ?? g.start;
  return { steps, edges: [...g.edges, ...edges], start, ids: pasted.map((s) => s.id) };
}
