// Node Tiến trình (bước 43 S5) – nhãn thao tác, dòng chi tiết thẻ. Chạy ở internal/engine/process.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// '' = đọc (khớp model.ProcOps)
export type ProcOp = '' | 'waitStart' | 'waitQuit' | 'waitIdle';
export const PROC_OPS: { id: ProcOp; label: string }[] = [
  { id: '', get label() { return tr('proc.op.0'); } }, { id: 'waitStart', get label() { return tr('proc.op.1'); } },
  { id: 'waitQuit', get label() { return tr('proc.op.2'); } }, { id: 'waitIdle', get label() { return tr('proc.op.3'); } },
];

export const PROC_IDLE_CPU = 5; // khớp model.ProcIdleCPU

// Dòng chi tiết thẻ: "ffmpeg → chờ hết bận (CPU < 5 %)"
export function fmtProcess(s: Pick<Step, 'procOp' | 'procName' | 'cpuBelow'>): string {
  const op = s.procOp ?? '';
  const name = s.procName?.trim() || (op === '' ? tr('proc.all') : tr('proc.noName'));
  switch (op) {
    case 'waitStart': return tr('proc.d.start', { name });
    case 'waitQuit': return tr('proc.d.quit', { name });
    case 'waitIdle': return tr('proc.d.idle', { name, cpu: s.cpuBelow || PROC_IDLE_CPU });
  }
  return tr('proc.d.read', { name });
}
