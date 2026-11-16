// Mục menu chuột phải của thẻ node (bước 31c). Hàm thuần: nhận ngữ cảnh, trả danh sách mục – chạy / ghim do nơi gọi truyền vào.
import { tr } from '../../i18n/lang';
import type { RunMenuItem } from '../RunMenu';
import type { Debug } from '../../engineStore';
import type { StepResult } from '../../types';

export type NodeMenuCtx = {
  id: string;
  ref: string;
  running: boolean;
  picked: string[]; // các node đang chọn cùng lúc
  last?: StepResult; // kết quả mới nhất của node trong nhật ký đang xem
  pinned: boolean;
  seedRun?: string; // runId lần chạy vừa xong trong phiên này (chạy tiếp dùng kết quả của nó)
  run: (dbg: Debug) => void;
  pin: (r: StepResult) => void;
  unpin: (id: string) => void;
};

export function nodeMenuItems(c: NodeMenuCtx): RunMenuItem[] {
  const cluster = c.picked.includes(c.id) && c.picked.length > 1 ? c.picked : [];
  return [
    { label: tr('fl.mn.runTo', { r: c.ref }), disabled: c.running, onClick: () => c.run({ stopAt: c.id }),
      title: tr('fl.mn.runToTip') },
    { label: cluster.length ? tr('fl.mn.cluster', { n: cluster.length }) : tr('fl.mn.clusterNo'), disabled: c.running || !cluster.length, onClick: () => c.run({ nodes: cluster }),
      title: cluster.length ? tr('fl.mn.clusterTip') : tr('fl.mn.clusterHow') },
    { label: tr('fl.mn.from', { r: c.ref }), disabled: c.running || !c.seedRun, onClick: () => c.run({ from: c.id, seedRun: c.seedRun }),
      title: c.seedRun ? tr('fl.mn.fromTip') : tr('fl.mn.fromNeed') },
    c.pinned
      ? { label: tr('fl.mn.unpin'), onClick: () => c.unpin(c.id), title: tr('fl.mn.unpinTip') }
      : { label: tr('fl.mn.pin'), disabled: !c.last || c.last.status !== 'success', onClick: () => c.last && c.pin(c.last),
          title: c.last?.status === 'success' ? tr('fl.mn.pinTip') : tr('fl.mn.pinNeed') },
  ];
}
