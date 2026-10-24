// Khung nhóm node (bước 39 G1): hàm thuần trên Script.groups + hình học khung. Nhóm chỉ là lớp vẽ – node vẫn phẳng
// trong steps, engine / biến không biết tới (Go: internal/script/groups.go kiểm tra thành viên).
import { nodeHeight, NODE_W } from '../components/flow/model';
import type { FlowGroupView } from '../components/flow/model';
import type { Group } from '../types';
import type { Edge } from './edit';
import type { Positions } from './layout';

export const GROUP_PAD = 20; // đệm giữa khung và node
export const GROUP_HEAD = 30; // thanh tên trên khung
export const GROUP_CARD_H = 58; // thẻ nhóm thu gọn

export const groupOf = (groups: Group[] | undefined, id: string) => groups?.find((g) => g.members.includes(id));

// Bỏ node khỏi mọi nhóm; nhóm hết thành viên thì xoá (cùng quy tắc script.DropMember bên Go).
export function dropMembers(groups: Group[] | undefined, ids: string[]): Group[] {
  return (groups ?? []).map((g) => ({ ...g, members: g.members.filter((m) => !ids.includes(m)) })).filter((g) => g.members.length > 0);
}

// Nhóm các node đã chọn: node đang ở nhóm khác thì chuyển sang nhóm mới.
export function addGroup(groups: Group[] | undefined, ids: string[], g: Pick<Group, 'id' | 'name'>): Group[] {
  return [...dropMembers(groups, ids), { ...g, members: [...ids] }];
}

export const removeGroup = (groups: Group[] | undefined, id: string) => (groups ?? []).filter((g) => g.id !== id);
export const patchGroup = (groups: Group[] | undefined, id: string, patch: Partial<Group>) => (groups ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g));

// Tên nhóm mới: "Nhóm N" với N nhỏ nhất chưa dùng.
export function nextGroupName(groups: Group[] | undefined): string {
  const used = new Set((groups ?? []).map((g) => g.name));
  let n = 1;
  while (used.has(`Nhóm ${n}`)) n++;
  return `Nhóm ${n}`;
}

export type GroupNode = { id: string; ports: string[] };

// Khung của từng nhóm: bao các node thành viên có vị trí + đệm. Nhóm thu gọn thì khung là thẻ đứng ở góc trên trái cũ.
// Thành viên chưa có vị trí bị bỏ qua; nhóm không còn node nào có vị trí thì không vẽ.
export function groupViews(groups: Group[] | undefined, pos: Positions, nodes: GroupNode[]): FlowGroupView[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: FlowGroupView[] = [];
  for (const g of groups ?? []) {
    const rects = g.members.flatMap((m) => {
      const p = pos[m];
      const n = byId.get(m);
      return p && n ? [{ x: p.x, y: p.y, w: NODE_W, h: nodeHeight(n.ports) }] : [];
    });
    if (!rects.length) continue;
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.w));
    const bottom = Math.max(...rects.map((r) => r.y + r.h));
    const box = g.collapsed
      ? { x, y, w: NODE_W, h: GROUP_CARD_H }
      : { x: x - GROUP_PAD, y: y - GROUP_PAD - GROUP_HEAD, w: right - x + 2 * GROUP_PAD, h: bottom - y + 2 * GROUP_PAD + GROUP_HEAD };
    out.push({ id: g.id, name: g.name, collapsed: !!g.collapsed, members: g.members, color: g.color, box });
  }
  return out;
}

// Cạnh khi có nhóm thu gọn: node trong nhóm thu gọn được thay bằng id nhóm, cạnh nội bộ ẩn đi. Cạnh nối ra / vào thẻ
// nhóm đi qua cổng "out" / "in" của thẻ.
export type RoutedEdge = Edge & { origFrom?: string; fromGroup?: boolean; toGroup?: boolean }; // origFrom: node thật (để lấy màu cổng)
export function routeEdges(edges: Edge[], groups: Group[] | undefined): RoutedEdge[] {
  const folded = new Map<string, string>();
  for (const g of groups ?? []) if (g.collapsed) g.members.forEach((m) => folded.set(m, g.id));
  if (!folded.size) return edges;
  return edges.flatMap((e) => {
    const a = folded.get(e.from);
    const b = folded.get(e.to);
    if (a && a === b) return [];
    return [{ ...e, from: a ?? e.from, to: b ?? e.to, origFrom: e.from, fromGroup: !!a, toGroup: !!b }];
  });
}

// Dời cả cụm: vị trí các node thành viên cộng (dx, dy).
export function shiftPositions(pos: Positions, ids: string[], dx: number, dy: number): Positions {
  return Object.fromEntries(ids.flatMap((id) => (pos[id] ? [[id, { x: Math.round(pos[id].x + dx), y: Math.round(pos[id].y + dy) }]] : [])));
}
