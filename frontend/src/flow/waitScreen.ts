// Node Chờ màn hình (bước 42 G1) – cách chờ, dòng chi tiết thẻ. Chạy ở internal/engine/waitscreen.go; vùng như Chụp màn hình.
import { fmtMs, type Step } from '../types';
import { shotAreaLabel } from './shot';
import { tr } from '../i18n/lang';

// '' = đứng yên (khớp model.WaitModes)
export type WaitMode = '' | 'change';
export const WAIT_MODES: { id: WaitMode; label: string }[] = [{ id: '', get label() { return tr('ws2.mode.0'); } }, { id: 'change', get label() { return tr('ws2.mode.1'); } }];

// Dòng chi tiết thẻ: "đứng yên 1 s · vùng kịch bản · tối đa 15 s". refOf: id node → mã (n2).
export function fmtWaitScreen(s: Step, refOf: (id: string) => string): string {
  const mode = s.waitMode === 'change' ? tr('ws2.d.change', { n: s.diffPct ?? 0 }) : tr('ws2.d.still', { t: fmtMs(s.stableMs ?? 0) });
  return `${mode} · ${shotAreaLabel(s, refOf)} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}
