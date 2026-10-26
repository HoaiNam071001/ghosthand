// Danh sách trang node của Hướng dẫn: lấy từ bảng Thêm node (cùng tên, icon, nhóm) – không chép.
// Biến thể không có mục riêng ở bảng (gộp trong Click theo ảnh / chữ / phần tử) thêm ngay sau mục gộp.
import { categoryName } from '../../flow/category';
import type { InfoKey } from '../../flow/nodeInfo';
import { GROUPS } from '../palette/groups';
import type { GuideNodeMeta } from './GuideDialog';

const VARIANTS: Partial<Record<InfoKey, { key: InfoKey; label: string }[]>> = {
  clickImage: [{ key: 'clickText', label: 'Click theo chữ' }, { key: 'clickElement', label: 'Click theo phần tử' }],
};

export const GUIDE_NODES: GuideNodeMeta[] = GROUPS.flatMap((g) => g.items.flatMap((it) => {
  if (!it.key) return [];
  const base = { icon: it.icon, group: categoryName(g.cat), type: it.type };
  return [{ ...base, key: it.key, label: it.label }, ...(VARIANTS[it.key] ?? []).map((v) => ({ ...base, ...v }))];
}));
