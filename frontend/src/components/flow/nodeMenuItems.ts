// Mục menu chuột phải của thẻ node (bước 31c). Hàm thuần: nhận ngữ cảnh, trả danh sách mục – chạy / ghim do nơi gọi truyền vào.
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
    { label: `Chạy đến ${c.ref}`, disabled: c.running, onClick: () => c.run({ stopAt: c.id }),
      title: 'Chạy từ đầu tới hết node này rồi dừng' },
    { label: cluster.length ? `Chạy cụm đã chọn (${cluster.length} node)` : 'Chạy cụm đã chọn', disabled: c.running || !cluster.length, onClick: () => c.run({ nodes: cluster }),
      title: cluster.length ? 'Chỉ chạy các node đang chọn, một vòng – cạnh đi ra ngoài cụm bị bỏ' : 'Chọn nhiều node (Shift + click) rồi chuột phải' },
    { label: `Chạy tiếp từ ${c.ref}`, disabled: c.running || !c.seedRun, onClick: () => c.run({ from: c.id, seedRun: c.seedRun }),
      title: c.seedRun ? 'Chạy từ node này, dùng kết quả + biến của lần chạy vừa rồi cho các node trước' : 'Cần một lần chạy vừa xong trong phiên này' },
    c.pinned
      ? { label: 'Bỏ ghim output', onClick: () => c.unpin(c.id), title: 'Node sẽ chạy thật trở lại' }
      : { label: 'Ghim output', disabled: !c.last || c.last.status !== 'success', onClick: () => c.last && c.pin(c.last),
          title: c.last?.status === 'success' ? 'Lần chạy sau node này không chạy, dùng luôn kết quả vừa rồi (chỉ lưu trên máy)' : 'Chạy node thành công một lần trước' },
  ];
}
