// Khung nhóm node (bước 39 G1): nhóm lại / bỏ nhóm / thu gọn / đổi tên / dời cả cụm. Phép tính ở flow/groups.ts.
import { addGroup, nextGroupName, patchGroup, removeGroup, shiftPositions } from '../flow/groups';
import { getEditor, setEditor, updateScript } from './editor';
import { newId, removeSteps } from './nodes';

const script = () => getEditor().script;

// Nhóm các node đang chọn (cần ≥ 2 – một node không cần khung).
export function groupPicked() {
  const ids = getEditor().picked;
  if (ids.length < 2) return;
  const name = nextGroupName(script().groups);
  updateScript({ groups: addGroup(script().groups, ids, { id: `g${newId()}`, name }) });
  setEditor({ picked: [], notice: `Đã nhóm ${ids.length} node thành “${name}”` });
}

export function ungroup(id: string) {
  updateScript({ groups: removeGroup(script().groups, id) });
  setEditor({ notice: 'Đã bỏ nhóm – node giữ nguyên chỗ' });
}

// Xoá cả khung lẫn node thành viên (kèm cạnh) – một lần hoàn tác.
export function deleteGroup(id: string) {
  const g = script().groups?.find((x) => x.id === id);
  if (g) removeSteps(g.members);
}

export const toggleGroup = (id: string) => updateScript({ groups: patchGroup(script().groups, id, { collapsed: !script().groups?.find((g) => g.id === id)?.collapsed }) });

export const renameGroup = (id: string, name: string) => {
  const n = name.trim();
  if (n) updateScript({ groups: patchGroup(script().groups, id, { name: n }) });
};

export const setGroupColor = (id: string, color: string) => updateScript({ groups: patchGroup(script().groups, id, { color: color || undefined }) });

// Kéo khung (hoặc thẻ thu gọn): mọi node thành viên dời cùng một đoạn.
export function moveGroup(id: string, dx: number, dy: number) {
  const g = script().groups?.find((x) => x.id === id);
  if (!g || (!dx && !dy)) return;
  const pos = shiftPositions(Object.fromEntries(script().steps.flatMap((s) => (s.pos ? [[s.id, s.pos]] : []))), g.members, dx, dy);
  updateScript({ steps: script().steps.map((s) => (pos[s.id] ? { ...s, pos: pos[s.id] } : s)) });
}
