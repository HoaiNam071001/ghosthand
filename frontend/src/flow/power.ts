// Node Nguồn (bước 43 S3) – nhãn hành động, dòng chi tiết thẻ. Chạy ở internal/engine/power.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// Khớp model.PowerOps
export type PowerOp = 'lock' | 'displaySleep' | 'sleep' | 'logout' | 'shutdown' | 'restart';
export const POWER_OPS: { id: PowerOp; label: string; danger: boolean }[] = [
  { id: 'lock', get label() { return tr('power.op.0'); }, danger: false }, { id: 'displaySleep', get label() { return tr('power.op.1'); }, danger: false },
  { id: 'sleep', get label() { return tr('power.op.2'); }, danger: true }, { id: 'logout', get label() { return tr('power.op.3'); }, danger: true },
  { id: 'shutdown', get label() { return tr('power.op.4'); }, danger: true }, { id: 'restart', get label() { return tr('power.op.5'); }, danger: true },
];
export const POWER_COUNTDOWN_SEC = 30; // khớp model.PowerCountdownSec

export const powerNeedsConsent = (op?: PowerOp) => !!POWER_OPS.find((o) => o.id === op)?.danger;

// Dòng chi tiết thẻ: "Tắt máy sau 30 giây" / "Khoá màn hình"
export function fmtPower(s: Pick<Step, 'powerOp' | 'countdownSec'>): string {
  const op = POWER_OPS.find((o) => o.id === (s.powerOp ?? 'lock'));
  const label = op?.label ?? tr('power.op.0');
  const secs = s.countdownSec || (op?.danger ? POWER_COUNTDOWN_SEC : 0);
  return secs > 0 ? tr('power.d.after', { label, n: secs }) : label;
}
