// Cây lần chạy (bước 60 V6): kết quả từng node (StepResult theo thứ tự chạy) → cây theo lượt lặp, xếp từ trên xuống;
// nguồn dữ liệu của mỗi lần chạy node (biến đọc từ lần chạy nào trước đó). Logic thuần – RunTree chỉ vẽ.
import type { Step, StepResult } from '../types';
import { dataSlots } from './dataLinks';

export type TreeKind = 'step' | 'loop' | 'iter' | 'done' | 'more';
export interface TreeNode {
  key: string;
  kind: TreeKind;
  nodeId: string;
  index?: number; // vị trí trong results (thẻ có kết quả)
  iter?: number; // lượt thứ mấy (iter)
  hidden?: number; // more: số lượt bị gộp
  children: TreeNode[];
  fail?: boolean; // có lần chạy lỗi ở đây hoặc bên trong
}

const LOOP_TYPES = new Set(['forEach', 'counter']);
const ITER_PORT: Record<string, string> = { forEach: 'item', counter: 'next' };

// Dựng cây như engine theo dõi vòng lặp (engine/iter.go): node lặp đi vào thân vòng → lượt mới trong khối vòng của
// nó; đi ra cổng hết → dòng "hết" ngay sau khối vòng; node khác vào lượt trong cùng đang mở.
export function buildRunTree(results: StepResult[], steps: Pick<Step, 'id' | 'type'>[]): TreeNode[] {
  const typeOf = new Map(steps.map((s) => [s.id, s.type]));
  const root: TreeNode[] = [];
  const stack: { nodeId: string; row: TreeNode }[] = [];
  const groups = new Map<string, { group: TreeNode; parent: TreeNode[] }>();
  const here = () => stack[stack.length - 1]?.row.children ?? root;
  results.forEach((r, index) => {
    const type = typeOf.get(r.nodeId) ?? '';
    const isLoop = LOOP_TYPES.has(type) && r.status === 'success';
    if (isLoop) {
      const at = stack.findIndex((x) => x.nodeId === r.nodeId);
      if (at >= 0) stack.length = at;
    }
    if (isLoop && r.port === ITER_PORT[type]) {
      const parent = here();
      let g = groups.get(r.nodeId);
      if (!g || g.parent !== parent) {
        g = { group: { key: `g${index}`, kind: 'loop', nodeId: r.nodeId, children: [] }, parent };
        groups.set(r.nodeId, g);
        parent.push(g.group);
      }
      const row: TreeNode = { key: `r${index}`, kind: 'iter', nodeId: r.nodeId, index, iter: g.group.children.length + 1, children: [] };
      g.group.children.push(row);
      stack.push({ nodeId: r.nodeId, row });
      return;
    }
    if (isLoop) {
      const g = groups.get(r.nodeId);
      groups.delete(r.nodeId);
      (g?.parent ?? here()).push({ key: `r${index}`, kind: 'done', nodeId: r.nodeId, index, children: [] });
      return;
    }
    here().push({ key: `r${index}`, kind: 'step', nodeId: r.nodeId, index, children: [], fail: r.status === 'fail' });
  });
  markFail(root);
  return root;
}

function markFail(list: TreeNode[]): boolean {
  let any = false;
  for (const n of list) {
    if (markFail(n.children)) n.fail = true;
    any ||= !!n.fail;
  }
  return any;
}

// Lượt hiện ra mỗi khối vòng: MAX_ITERS lượt đầu + mọi lượt có lỗi; còn lại gộp vào một thẻ "N lượt nữa".
export const MAX_ITERS = 10;
export function visibleIters(group: TreeNode, all = false): TreeNode[] {
  if (all || group.children.length <= MAX_ITERS) return group.children;
  const shown = group.children.filter((c, i) => i < MAX_ITERS || c.fail);
  const hidden = group.children.length - shown.length;
  return hidden ? [...shown, { key: `${group.key}:more`, kind: 'more', nodeId: group.nodeId, hidden, children: [] }] : shown;
}

// ---- Xếp chỗ từ trên xuống ----
export const TREE = { CW: 220, CWC: 190, CH: 50, PITCH: 132, GAP: 18, BUS: 24, PAD: 40, LANE: 70 };
export type TreeCard = { node: TreeNode; x: number; y: number; w: number };
export type TreeLink = { from: string; to: string; kind: 'seq' | 'fan' | 'join' };
type Box = { w: number; h: number };

// open: key các lượt đang mở nhánh; allIters: hiện mọi lượt (không gộp)
export function layoutRunTree(root: TreeNode[], open: Set<string>, allIters = false) {
  const cards: TreeCard[] = [];
  const links: TreeLink[] = [];
  const { CW, CWC, PITCH, GAP, BUS, PAD, LANE } = TREE;

  const columnOf = (it: TreeNode) => (it.kind === 'iter' && open.has(it.key) ? [it, ...it.children] : [it]);
  const itemBox = (n: TreeNode): Box => {
    if (n.kind !== 'loop') return { w: (n.kind === 'iter' && !open.has(n.key)) || n.kind === 'more' ? CWC : CW, h: PITCH }; // lượt thu gọn hẹp hơn
    const cols = visibleIters(n, allIters).map((it) => listBox(columnOf(it)));
    const band = cols.reduce((s, c) => s + c.w, 0) + GAP * Math.max(cols.length - 1, 0);
    return { w: Math.max(CW, band), h: PITCH + BUS + Math.max(0, ...cols.map((c) => c.h)) };
  };
  // cột / danh sách: thẻ xếp dọc; chừa làn bên phải cho dây dữ liệu đi vòng
  const listBox = (list: TreeNode[]): Box => ({ w: Math.max(0, ...list.map((n) => itemBox(n).w)) + LANE, h: list.reduce((s, n) => s + itemBox(n).h, 0) });

  // đặt danh sách trong khung rộng w bắt đầu (x, y); trả key thẻ đầu / cuối để nối luồng chạy
  const placeList = (list: TreeNode[], x: number, y: number, w: number): { first?: string; last: string[] } => {
    let first: string | undefined;
    let prev: string[] = [];
    for (const n of list) {
      const b = itemBox(n);
      if (n.kind !== 'loop') {
        const cw = b.w;
        cards.push({ node: n, x: x + (w - LANE - cw) / 2, y, w: cw });
        prev.forEach((p) => links.push({ from: p, to: n.key, kind: prev.length > 1 ? 'join' : 'seq' }));
        first ??= n.key;
        prev = [n.key];
      } else {
        // thẻ đầu khối vòng (node lặp) + các cột lượt bên dưới
        cards.push({ node: n, x: x + (w - LANE - CW) / 2, y, w: CW });
        prev.forEach((p) => links.push({ from: p, to: n.key, kind: 'seq' }));
        first ??= n.key;
        const iters = visibleIters(n, allIters);
        const boxes = iters.map((it) => listBox(columnOf(it)));
        const band = boxes.reduce((s, c) => s + c.w, 0) + GAP * Math.max(boxes.length - 1, 0);
        let cx = x + (w - band) / 2;
        const ends: string[] = [];
        iters.forEach((it, i) => {
          const r = placeList(columnOf(it), cx, y + PITCH + BUS, boxes[i].w);
          if (r.first) links.push({ from: n.key, to: r.first, kind: 'fan' });
          ends.push(...r.last);
          cx += boxes[i].w + GAP;
        });
        prev = ends.length ? ends : [n.key];
      }
      y += b.h;
    }
    return { first, last: prev };
  };

  const main = listBox(root);
  const W = Math.max(main.w, 600) + PAD * 2;
  placeList(root, PAD + (W - PAD * 2 - main.w) / 2, PAD + 16, main.w);
  return { cards, links, W, H: main.h + PAD * 2 + 16 };
}

// ---- Nguồn dữ liệu của mỗi lần chạy node ----
export type DataSource = { slot: string; label: string; key: string; from: number }; // from: vị trí kết quả nguồn
// Biến {{n4.output.x}} ở lần chạy i đọc lần chạy gần nhất của n4 trước i (như engine ghi đè kết quả theo ref).
export function dataSources(results: StepResult[], steps: Step[]): DataSource[][] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const slotsOf = new Map(steps.map((s) => [s.id, dataSlots(s)]));
  const last = new Map<string, number>();
  return results.map((r, i) => {
    const out: DataSource[] = [];
    for (const sl of slotsOf.get(r.nodeId) ?? []) {
      for (const ref of sl.refs) {
        const from = last.get(ref.ref);
        if (from !== undefined) out.push({ slot: sl.name, label: sl.label, key: ref.key, from });
      }
    }
    const ref = byId.get(r.nodeId)?.ref ?? r.ref;
    last.set(ref, i);
    return out;
  });
}

// Chuỗi truy ngược: từ lần chạy i theo nguồn đầu tiên ngược về lần chạy không đọc biến nào.
export function traceBack(sources: DataSource[][], i: number, max = 12): { index: number; key?: string }[] {
  const chain: { index: number; key?: string }[] = [{ index: i }];
  let cur = i;
  for (let n = 0; n < max; n++) {
    const s = sources[cur]?.[0];
    if (!s) break;
    chain.unshift({ index: s.from, key: s.key });
    cur = s.from;
  }
  return chain;
}

// Mọi lần chạy phía trên (nguồn, nguồn của nguồn…) và ngay phía dưới (dùng output) của lần chạy i – để tô đường.
export function lineage(sources: DataSource[][], i: number): { up: Set<number>; down: Set<number> } {
  const up = new Set<number>();
  const stack = [i];
  while (stack.length) for (const s of sources[stack.pop()!] ?? []) if (!up.has(s.from)) { up.add(s.from); stack.push(s.from); }
  const down = new Set<number>();
  sources.forEach((list, j) => { if (list.some((s) => s.from === i)) down.add(j); });
  return { up, down };
}
