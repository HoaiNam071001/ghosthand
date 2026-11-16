// Node Hệ thống (bước 35 N5) – nhãn thao tác âm lượng, dòng chi tiết thẻ. Chạy ở internal/engine/system.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

export type SysOp = 'volume' | 'volumeUp' | 'volumeDown' | 'mute' | 'unmute';
export const SYS_OPS: { id: SysOp; label: string }[] = [
  { id: 'volume', get label() { return tr('sys.op.0'); } }, { id: 'volumeUp', get label() { return tr('sys.op.1'); } }, { id: 'volumeDown', get label() { return tr('sys.op.2'); } },
  { id: 'mute', get label() { return tr('sys.op.3'); } }, { id: 'unmute', get label() { return tr('sys.op.4'); } },
];
// Thao tác có ô số %: đặt mức / bước tăng giảm
export const sysHasLevel = (op?: string) => op === 'volume' || op === 'volumeUp' || op === 'volumeDown';

export function fmtSystem(s: Pick<Step, 'sysOp' | 'volume'>): string {
  const step = s.volume || 10;
  switch (s.sysOp) {
    case 'volumeUp': return `âm lượng +${step} %`;
    case 'volumeDown': return `âm lượng −${step} %`;
    case 'mute': return 'tắt tiếng';
    case 'unmute': return 'bật tiếng';
  }
  return `âm lượng = ${s.volume ?? 0} %`;
}
