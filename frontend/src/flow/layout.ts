// Xếp node tự động (bước 20) bằng elkjs, thuật toán layered từ trái sang phải. Cổng ra cố định vị trí theo
// thẻ node (model.ts) nên cạnh ít cắt nhau; vòng lặp (cạnh quay lại) elk tự xử lý.
import type { ELK as ElkApi, ElkNode } from 'elkjs/lib/elk-api';
import { inputY, NODE_W, nodeHeight, portY } from '../components/flow/model';
import type { Edge } from './edit';
import type { Point, Step } from '../types';
import { PORT_FAIL, PORT_SUCCESS, portsOf } from './model';

// elkjs ~1,4 MB – nạp lười lần đầu xếp, không nằm trong bundle chính
let elk: Promise<ElkApi> | null = null;
const getElk = () => (elk ??= import('elkjs/lib/elk.bundled.js').then((m) => new m.default()));

// Khoảng cách giữa các cột (lớp) và giữa các thẻ trong cột
export const GAP_X = 56;
export const GAP_Y = 40;

export type LayoutNode = { id: string; ports: string[]; io?: number }; // io: chiều cao khối VÀO / RA (thẻ Đầy đủ – bước 60)
export type Positions = Record<string, { x: number; y: number }>;

export async function layoutFlow(nodes: LayoutNode[], edges: Edge[]): Promise<Positions> {
  const ids = new Set(nodes.map((n) => n.id));
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(GAP_X),
      'elk.spacing.nodeNode': String(GAP_Y),
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: NODE_W,
      height: nodeHeight(n.ports, n.io),
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: [
        { id: `${n.id}|in`, x: 0, y: inputY, width: 1, height: 1, layoutOptions: { 'elk.port.side': 'WEST' } },
        ...n.ports.map((p, i) => ({ id: `${n.id}|${p}`, x: NODE_W, y: portY(n.ports, i, n.io), width: 1, height: 1, layoutOptions: { 'elk.port.side': 'EAST' } })),
      ],
    })),
    edges: edges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => ({ id: e.id, sources: [`${e.from}|${e.port}`], targets: [`${e.to}|in`] })),
  };
  const out = await (await getElk()).layout(graph);
  const pos: Positions = {};
  for (const c of out.children ?? []) pos[c.id] = { x: Math.round(c.x ?? 0), y: Math.round(c.y ?? 0) };
  return pos;
}

// Vị trí cho node mới (không chạy elk): ngay bên phải node `from`, trùng thẻ khác thì dời xuống;
// không có `from` (hoặc from chưa có vị trí) → bên phải thẻ xa nhất, cùng hàng thẻ đầu.
export function placeNode(steps: Step[], from?: string, ports: string[] = [PORT_SUCCESS, PORT_FAIL]): Point {
  const placed = steps.filter((s) => s.pos);
  const src = placed.find((s) => s.id === from);
  const p: Point = src?.pos
    ? { x: src.pos.x + NODE_W + GAP_X, y: src.pos.y }
    : { x: placed.length ? Math.max(...placed.map((s) => s.pos!.x)) + NODE_W + GAP_X : 0, y: placed[0]?.pos?.y ?? 0 };
  const h = nodeHeight(ports);
  const hits = (y: number) => placed.some((s) => {
    const sh = nodeHeight(portsOf(s));
    return Math.abs(s.pos!.x - p.x) < NODE_W && y < s.pos!.y + sh + GAP_Y / 2 && s.pos!.y < y + h + GAP_Y / 2;
  });
  while (hits(p.y)) p.y += GAP_Y + h;
  return p;
}
